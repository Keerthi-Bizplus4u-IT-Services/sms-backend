/**
 * Integration tests for onboarding + migration endpoints.
 * Executes real route middleware stacks in-process (auth/rbac/validation/controller).
 */

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
  },
}));

jest.mock('../../../../src/middleware/auth.middleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = {
      id: 101,
      roleName: 'super_admin',
      schoolId: null,
      permissions: ['schools:write', 'schools:read', 'academic-years:write', 'academic-years:read'],
    };
    req.schoolId = 1;
    next();
  },
  optionalAuth: (_req, _res, next) => next(),
}));

jest.mock('../../../../src/middleware/rbac.middleware', () => ({
  requirePermission: () => (_req, _res, next) => next(),
  authorize: () => (_req, _res, next) => next(),
  requireAnyPermission: () => (_req, _res, next) => next(),
  requireAllPermissions: () => (_req, _res, next) => next(),
  checkOwnership: () => (_req, _res, next) => next(),
  enforceTenant: () => (req, _res, next) => {
    req.schoolId = req.schoolId || 1;
    next();
  },
}));

const schoolServiceMock = {
  listSchools: jest.fn(),
  getSchoolById: jest.fn(),
  createSchool: jest.fn(),
  createSchoolOnboarding: jest.fn(),
  updateSchool: jest.fn(),
  deleteSchool: jest.fn(),
  getOnboardingChecklist: jest.fn(),
  cloneSchoolSettings: jest.fn(),
};

const schoolBranchServiceMock = {
  listBranches: jest.fn(),
  createBranch: jest.fn(),
};

jest.mock('../../../../src/api/v1/services/school.service', () => ({
  schoolService: schoolServiceMock,
  schoolBranchService: schoolBranchServiceMock,
}));

const academicYearServiceMock = {
  getAcademicYears: jest.fn(),
  getCurrentAcademicYear: jest.fn(),
  createAcademicYear: jest.fn(),
  updateAcademicYear: jest.fn(),
  setCurrentAcademicYear: jest.fn(),
  createMigrationDraft: jest.fn(),
  finalizeMigration: jest.fn(),
};

jest.mock('../../../../src/api/v1/services/academic-year.service', () => academicYearServiceMock);

const schoolRoutes = require('../../../../src/api/v1/routes/school.routes');
const academicYearRoutes = require('../../../../src/api/v1/routes/academic-year.routes');

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
  },
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

describe('School onboarding and migration endpoint integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /schools/onboarding creates onboarding flow with clone scopes', async () => {
    schoolServiceMock.createSchoolOnboarding.mockResolvedValue({
      school: { id: 55, code: 'NEW01', name: 'New School' },
      mode: 'clone',
      cloneSummary: {
        sourceSchoolId: 1,
        targetSchoolId: 55,
        scopes: { class_structure: true, subjects: true, exams: false, fees: true },
        cloned: { branches: 1, academicYears: 1, classes: 2, sections: 4, subjects: 8, feeStructures: 5 },
      },
    });

    const payload = {
      mode: 'clone',
      school: { code: 'NEW01', name: 'New School', school_type: 'k12' },
      branch: { code: 'NEW01-MAIN', name: 'Main Branch', branch_type: 'main' },
      clone_from_school_id: 1,
      clone_scopes: { class_structure: true, subjects: true, exams: false, fees: true },
    };

    const handlers = findRouteHandlers(schoolRoutes, 'post', '/onboarding');
    const req = { params: {}, query: {}, body: payload, headers: {} };
    const res = createMockRes();

    await executeHandlers(handlers, req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(schoolServiceMock.createSchoolOnboarding).toHaveBeenCalledWith(payload);
  });

  it('POST /schools/onboarding returns 400 on invalid payload', async () => {
    const handlers = findRouteHandlers(schoolRoutes, 'post', '/onboarding');
    const req = {
      params: {},
      query: {},
      headers: {},
      body: {
        mode: 'clone',
        school: { code: '', name: '', school_type: 'invalid' },
      },
    };
    const res = createMockRes();

    await executeHandlers(handlers, req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(schoolServiceMock.createSchoolOnboarding).not.toHaveBeenCalled();
  });

  it('POST /schools/:id/clone-settings forwards clone scope to service', async () => {
    schoolServiceMock.cloneSchoolSettings.mockResolvedValue({
      sourceSchoolId: 1,
      targetSchoolId: 2,
      scopes: { class_structure: true, subjects: false, exams: true, fees: false },
      cloned: { branches: 1, academicYears: 1, classes: 1, sections: 2, exams: 3, examSchedules: 9 },
    });

    const body = {
      source_school_id: 1,
      clone_scopes: { class_structure: true, subjects: false, exams: true, fees: false },
    };

    const handlers = findRouteHandlers(schoolRoutes, 'post', '/:id/clone-settings');
    const req = { params: { id: '2' }, query: {}, body, headers: {} };
    const res = createMockRes();

    await executeHandlers(handlers, req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(schoolServiceMock.cloneSchoolSettings).toHaveBeenCalledWith('2', 1, body.clone_scopes);
  });

  it('POST /academic-years/migration/draft creates migration draft', async () => {
    academicYearServiceMock.createMigrationDraft.mockResolvedValue({
      sourceAcademicYear: { id: 1, name: '2025-2026' },
      targetAcademicYear: { id: 2, name: '2026-2027' },
      promotionPreview: {
        totals: { totalStudents: 20, promote: 15, detain: 4, review: 1 },
        candidates: [],
      },
      status: 'draft',
    });

    const payload = { fromAcademicYearId: 1, toAcademicYearId: 2 };

    const handlers = findRouteHandlers(academicYearRoutes, 'post', '/migration/draft');
    const req = { params: {}, query: {}, body: payload, headers: {} };
    const res = createMockRes();

    await executeHandlers(handlers, req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(academicYearServiceMock.createMigrationDraft).toHaveBeenCalledWith(payload, { schoolId: 1 });
  });

  it('POST /academic-years/migration/finalize finalizes migration with overrides', async () => {
    academicYearServiceMock.finalizeMigration.mockResolvedValue({
      promotedCount: 12,
      detainedCount: 5,
      reviewCount: 3,
      status: 'finalized',
    });

    const payload = {
      fromAcademicYearId: 1,
      toAcademicYearId: 2,
      overrides: [
        { studentId: 101, decision: 'detain', targetClassId: 8 },
        { studentId: 102, decision: 'promote', targetClassId: 9 },
      ],
    };

    const handlers = findRouteHandlers(academicYearRoutes, 'post', '/migration/finalize');
    const req = { params: {}, query: {}, body: payload, headers: {} };
    const res = createMockRes();

    await executeHandlers(handlers, req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(academicYearServiceMock.finalizeMigration).toHaveBeenCalledWith(payload, {
      schoolId: 1,
      userId: 101,
    });
  });

  it('POST /academic-years/migration/finalize returns 400 on invalid payload', async () => {
    const handlers = findRouteHandlers(academicYearRoutes, 'post', '/migration/finalize');
    const req = {
      params: {},
      query: {},
      headers: {},
      body: {
        fromAcademicYearId: 1,
        toAcademicYearId: 'bad-value',
      },
    };
    const res = createMockRes();

    await executeHandlers(handlers, req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(academicYearServiceMock.finalizeMigration).not.toHaveBeenCalled();
  });
});
