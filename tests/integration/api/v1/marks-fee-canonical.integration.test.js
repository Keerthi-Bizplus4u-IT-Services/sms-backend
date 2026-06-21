jest.mock('../../../../src/utils/response', () => ({
  success: (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({ success: true, message, data, errors: null });
  },
  error: (res, message = 'An error occurred', statusCode = 400, errors = null) => {
    return res.status(statusCode).json({ success: false, message, data: null, errors });
  },
  validationError: (res, errors) => {
    return res.status(400).json({ success: false, message: 'Validation failed', data: null, errors });
  },
  created: (res, data = null, message = 'Resource created successfully') => {
    return res.status(201).json({ success: true, message, data, errors: null });
  }
}));

jest.mock('../../../../src/middleware/auth.middleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = req.user || {
      id: 100,
      schoolId: 1,
      roleName: 'admin',
      permissions: []
    };
    next();
  },
  optionalAuth: (_req, _res, next) => next()
}));

jest.mock('../../../../src/middleware/rbac.middleware', () => ({
  requirePermission: (permission) => (req, res, next) => {
    const granted = Array.isArray(req.user?.permissions) && req.user.permissions.includes(permission);
    if (!granted) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
        data: null,
        errors: [{ field: 'permission', message: `Missing permission: ${permission}` }]
      });
    }
    return next();
  },
  authorize: () => (_req, _res, next) => next(),
  requireAnyPermission: () => (_req, _res, next) => next(),
  requireAllPermissions: () => (_req, _res, next) => next(),
  checkOwnership: () => (_req, _res, next) => next(),
  enforceTenant: () => (_req, _res, next) => next()
}));

const markServiceMock = {
  getMarks: jest.fn(),
  upsertMarks: jest.fn(),
  listGrades: jest.fn(),
  getGradeById: jest.fn(),
  createGrade: jest.fn(),
  updateGrade: jest.fn(),
  deleteGrade: jest.fn()
};

const feeServiceMock = {
  getFeeStructure: jest.fn(),
  updateFeeStructure: jest.fn(),
  deleteFeeStructure: jest.fn()
};

jest.mock('../../../../src/api/v1/services/mark.service', () => markServiceMock);
jest.mock('../../../../src/api/v1/services/fee.service', () => feeServiceMock);

const markRoutes = require('../../../../src/api/v1/routes/mark.routes');
const feeStructureRoutes = require('../../../../src/api/v1/routes/fee-structure.routes');

const createMockRes = () => ({
  statusCode: 200,
  body: null,
  done: false,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    this.done = true;
    return this;
  }
});

const findRouteHandlers = (router, method, path) => {
  const layer = router.stack.find((entry) => entry.route && entry.route.path === path && entry.route.methods[method]);
  if (!layer) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  }
  return layer.route.stack.map((entry) => entry.handle);
};

const executeHandlers = async (handlers, req, res) => {
  for (const handler of handlers) {
    let nextCalled = false;
    let nextError = null;

    await new Promise((resolve, reject) => {
      const next = (err) => {
        nextCalled = true;
        nextError = err || null;
        resolve();
      };

      try {
        const result = handler(req, res, next);
        Promise.resolve(result)
          .then(() => {
            if (handler.length < 3 || !nextCalled || res.done) {
              resolve();
            }
          })
          .catch(reject);
      } catch (err) {
        reject(err);
      }
    });

    if (nextError) {
      throw nextError;
    }

    if (res.done) {
      break;
    }

    if (handler.length >= 3 && !nextCalled) {
      throw new Error('Middleware did not call next() or send response');
    }
  }

  return res;
};

describe('Canonical marks, grades, and fee-structure routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /marks/bulk resolves and saves marks with required write permission', async () => {
    markServiceMock.upsertMarks.mockResolvedValue({ upsertedCount: 2 });

    const handlers = findRouteHandlers(markRoutes, 'post', '/marks/bulk');
    const req = {
      params: {},
      query: {},
      headers: {},
      body: {
        sclass: 5,
        exam: 'Term 1',
        subject: 'Mathematics',
        marks: {
          '201': 82,
          '202': 76
        }
      },
      user: {
        id: 22,
        schoolId: 7,
        roleName: 'teacher',
        permissions: ['marks:write']
      }
    };
    const res = createMockRes();

    await executeHandlers(handlers, req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(markServiceMock.upsertMarks).toHaveBeenCalledWith(req.body, {
      schoolId: 7,
      userId: 22
    });
  });

  it('POST /marks/bulk returns 403 without marks:write permission', async () => {
    const handlers = findRouteHandlers(markRoutes, 'post', '/marks/bulk');
    const req = {
      params: {},
      query: {},
      headers: {},
      body: {
        sclass: 5,
        exam: 'Term 1',
        subject: 'Mathematics',
        marks: { '201': 82 }
      },
      user: {
        id: 22,
        schoolId: 7,
        roleName: 'teacher',
        permissions: ['marks:read']
      }
    };
    const res = createMockRes();

    await executeHandlers(handlers, req, res);

    expect(res.statusCode).toBe(403);
    expect(markServiceMock.upsertMarks).not.toHaveBeenCalled();
  });

  it('supports canonical /grades CRUD flow with read/write permissions', async () => {
    markServiceMock.listGrades.mockResolvedValue([{ gid: 1, gname: 'A1' }]);
    markServiceMock.getGradeById.mockResolvedValue({ id: 1, gradeName: 'A1' });
    markServiceMock.createGrade.mockResolvedValue({ gid: 2, gname: 'A2' });
    markServiceMock.updateGrade.mockResolvedValue({ gid: 2, gname: 'A+' });
    markServiceMock.deleteGrade.mockResolvedValue({ id: 2 });

    const readUser = {
      id: 30,
      schoolId: 4,
      roleName: 'admin',
      permissions: ['marks:read']
    };
    const writeUser = {
      id: 30,
      schoolId: 4,
      roleName: 'admin',
      permissions: ['marks:write']
    };

    const listRes = createMockRes();
    await executeHandlers(
      findRouteHandlers(markRoutes, 'get', '/grades'),
      { params: {}, query: {}, headers: {}, body: {}, user: readUser },
      listRes
    );
    expect(listRes.statusCode).toBe(200);
    expect(markServiceMock.listGrades).toHaveBeenCalledWith({}, { schoolId: 4 });

    const getRes = createMockRes();
    await executeHandlers(
      findRouteHandlers(markRoutes, 'get', '/grades/:id'),
      { params: { id: '1' }, query: {}, headers: {}, body: {}, user: readUser },
      getRes
    );
    expect(getRes.statusCode).toBe(200);
    expect(markServiceMock.getGradeById).toHaveBeenCalledWith('1', { schoolId: 4 });

    const createRes = createMockRes();
    await executeHandlers(
      findRouteHandlers(markRoutes, 'post', '/grades'),
      {
        params: {},
        query: {},
        headers: {},
        body: { gname: 'A2', gpoint: 9, pform: 80, pto: 89.99, comment: 'Great' },
        user: writeUser
      },
      createRes
    );
    expect(createRes.statusCode).toBe(201);
    expect(markServiceMock.createGrade).toHaveBeenCalledWith(
      { gname: 'A2', gpoint: 9, pform: 80, pto: 89.99, comment: 'Great' },
      { schoolId: 4 }
    );

    const updateRes = createMockRes();
    await executeHandlers(
      findRouteHandlers(markRoutes, 'put', '/grades/:id'),
      {
        params: { id: '2' },
        query: {},
        headers: {},
        body: { gname: 'A+', pform: 90, pto: 100 },
        user: writeUser
      },
      updateRes
    );
    expect(updateRes.statusCode).toBe(200);
    expect(markServiceMock.updateGrade).toHaveBeenCalledWith(
      '2',
      { gname: 'A+', pform: 90, pto: 100 },
      { schoolId: 4 }
    );

    const deleteRes = createMockRes();
    await executeHandlers(
      findRouteHandlers(markRoutes, 'delete', '/grades/:id'),
      { params: { id: '2' }, query: {}, headers: {}, body: {}, user: writeUser },
      deleteRes
    );
    expect(deleteRes.statusCode).toBe(200);
    expect(markServiceMock.deleteGrade).toHaveBeenCalledWith('2', { schoolId: 4 });
  });

  it('PUT /fee-structures/:cn enforces write permission and maps cn to sclass', async () => {
    feeServiceMock.updateFeeStructure.mockResolvedValue({ updated: true });

    const handlers = findRouteHandlers(feeStructureRoutes, 'put', '/fee-structures/:cn');
    const req = {
      params: { cn: '10-A' },
      query: {},
      headers: {},
      body: { tfee: 12000 },
      user: {
        id: 18,
        schoolId: 1,
        roleName: 'admin',
        permissions: ['fee-structures:write']
      }
    };
    const res = createMockRes();

    await executeHandlers(handlers, req, res);

    expect(res.statusCode).toBe(200);
    expect(feeServiceMock.updateFeeStructure).toHaveBeenCalledWith(
      expect.objectContaining({ sclass: '10-A', tfee: 12000 })
    );
  });

  it('DELETE /fee-structures/:cn enforces delete permission', async () => {
    feeServiceMock.deleteFeeStructure.mockResolvedValue(true);

    const handlers = findRouteHandlers(feeStructureRoutes, 'delete', '/fee-structures/:cn');
    const deniedReq = {
      params: { cn: '10-A' },
      query: {},
      headers: {},
      body: {},
      user: {
        id: 18,
        schoolId: 1,
        roleName: 'admin',
        permissions: ['fee-structures:write']
      }
    };
    const deniedRes = createMockRes();

    await executeHandlers(handlers, deniedReq, deniedRes);
    expect(deniedRes.statusCode).toBe(403);
    expect(feeServiceMock.deleteFeeStructure).not.toHaveBeenCalled();

    const allowedReq = {
      ...deniedReq,
      user: {
        ...deniedReq.user,
        permissions: ['fee-structures:delete']
      }
    };
    const allowedRes = createMockRes();

    await executeHandlers(handlers, allowedReq, allowedRes);
    expect(allowedRes.statusCode).toBe(200);
    expect(feeServiceMock.deleteFeeStructure).toHaveBeenCalledWith('10-A');
  });
});