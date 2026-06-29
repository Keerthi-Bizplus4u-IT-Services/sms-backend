jest.mock('../../../../../src/middleware/auth.middleware', () => ({
  authenticate: (_req, _res, next) => next()
}));

const enforceTenantMock = jest.fn((_req, _res, next) => next());
const requirePermissionMock = jest.fn((_req, _res, next) => next());

jest.mock('../../../../../src/middleware/rbac.middleware', () => ({
  enforceTenant: jest.fn(() => enforceTenantMock),
  requirePermission: jest.fn(() => requirePermissionMock)
}));

jest.mock('../../../../../src/middleware/validation.middleware', () => ({
  validate: (_req, _res, next) => next()
}));

jest.mock('../../../../../src/api/v1/validators/expense.validator', () => ({
  createExpenseValidator: (_req, _res, next) => next()
}));

jest.mock('../../../../../src/api/v1/controllers/expense.controller', () => ({
  createExpense: (_req, _res, next) => next()
}));

const router = require('../../../../../src/api/v1/routes/expense-legacy.routes');
const { enforceTenant, requirePermission } = require('../../../../../src/middleware/rbac.middleware');

const findRouteHandlers = (routerInstance, method, path) => {
  const layer = routerInstance.stack.find((entry) => entry.route && entry.route.path === path && entry.route.methods[method]);
  if (!layer) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  }
  return layer.route.stack.map((entry) => entry.handle);
};

describe('expense-legacy routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /add-expense applies tenant middleware and write permission', () => {
    const handlers = findRouteHandlers(router, 'post', '/add-expense');

    expect(handlers).toContain(enforceTenantMock);
    expect(handlers).toContain(requirePermissionMock);
    expect(enforceTenant).toBeDefined();
    expect(requirePermission).toBeDefined();
  });
});
