/**
 * Unit Tests for RBAC Middleware
 * Tests permission-based access control and tenant enforcement behavior
 */

const {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  checkOwnership,
  enforceTenant
} = require('../../../src/middleware/rbac.middleware');
const { mockRequest, mockResponse, mockNext } = require('../../helpers/testUtils');

jest.mock('../../../src/utils/response');

describe('RBAC Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
    next = mockNext();

    const { error } = require('../../../src/utils/response');
    error.mockImplementation((r, message, statusCode) => {
      r.status(statusCode);
      r.json({ success: false, message, data: null, errors: null });
      return r;
    });
  });

  describe('requirePermission', () => {
    it('should deny admin without matching permission', () => {
      req.user = { id: 1, roleName: 'admin', permissions: [] };

      const middleware = requirePermission('dashboard:read');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'You do not have permission to perform this action', 403);
    });

    it('should allow super_admin to bypass permission checks', () => {
      req.user = { id: 1, roleName: 'super_admin', permissions: [] };

      const middleware = requirePermission('dashboard:read');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow user with matching permission', () => {
      req.user = { id: 2, roleName: 'teacher', permissions: ['dashboard:read', 'students:read'] };

      const middleware = requirePermission('dashboard:read');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny user without matching permission', () => {
      req.user = { id: 2, roleName: 'teacher', permissions: ['students:read'] };

      const middleware = requirePermission('dashboard:read');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'You do not have permission to perform this action', 403);
    });

    it('should deny user with empty permissions', () => {
      req.user = { id: 2, roleName: 'student', permissions: [] };

      const middleware = requirePermission('dashboard:read');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'You do not have permission to perform this action', 403);
    });

    it('should deny when user is not authenticated', () => {
      req.user = null;

      const middleware = requirePermission('dashboard:read');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Authentication required', 401);
    });

    it('should handle undefined permissions array gracefully', () => {
      req.user = { id: 2, roleName: 'teacher' };

      const middleware = requirePermission('dashboard:read');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'You do not have permission to perform this action', 403);
    });

    it('should deny admin with normalized role when permission is missing', () => {
      req.user = { id: 1, roleName: 'admin', permissions: [] };

      const middleware = requirePermission('communications:read');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'You do not have permission to perform this action', 403);
    });

    it('should check specific permission names exactly', () => {
      req.user = { id: 2, roleName: 'teacher', permissions: ['dashboard:write'] };

      const middleware = requirePermission('dashboard:read');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAnyPermission', () => {
    it('should deny admin when none of the required permissions match', () => {
      req.user = { id: 1, roleName: 'admin', permissions: [] };

      const middleware = requireAnyPermission(['dashboard:read', 'communications:read']);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'You do not have permission to perform this action', 403);
    });

    it('should allow super_admin to bypass', () => {
      req.user = { id: 1, roleName: 'super_admin', permissions: [] };

      const middleware = requireAnyPermission(['dashboard:read']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow user with at least one matching permission', () => {
      req.user = { id: 2, roleName: 'teacher', permissions: ['communications:read'] };

      const middleware = requireAnyPermission(['dashboard:read', 'communications:read']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny user with no matching permissions', () => {
      req.user = { id: 2, roleName: 'student', permissions: ['books:read'] };

      const middleware = requireAnyPermission(['dashboard:write', 'communications:write']);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'You do not have permission to perform this action', 403);
    });

    it('should deny when not authenticated', () => {
      req.user = null;

      const middleware = requireAnyPermission(['dashboard:read']);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Authentication required', 401);
    });
  });

  describe('requireAllPermissions', () => {
    it('should deny admin missing required permissions', () => {
      req.user = { id: 1, roleName: 'admin', permissions: [] };

      const middleware = requireAllPermissions(['dashboard:read', 'students:read']);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'You do not have permission to perform this action', 403);
    });

    it('should allow user with all required permissions', () => {
      req.user = { id: 2, roleName: 'teacher', permissions: ['dashboard:read', 'students:read', 'marks:write'] };

      const middleware = requireAllPermissions(['dashboard:read', 'students:read']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny user missing some permissions', () => {
      req.user = { id: 2, roleName: 'teacher', permissions: ['dashboard:read'] };

      const middleware = requireAllPermissions(['dashboard:read', 'students:write']);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'You do not have permission to perform this action', 403);
    });
  });

  describe('checkOwnership', () => {
    it('should deny admin from accessing another user resource', () => {
      req.user = { id: 1, roleName: 'admin' };
      req.params = { userId: '99' };

      const middleware = checkOwnership('userId');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'You can only access your own resources', 403);
    });

    it('should allow user to access their own resource', () => {
      req.user = { id: 5, roleName: 'teacher' };
      req.params = { userId: '5' };

      const middleware = checkOwnership('userId');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny user from accessing another user resource', () => {
      req.user = { id: 5, roleName: 'teacher' };
      req.params = { userId: '10' };

      const middleware = checkOwnership('userId');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'You can only access your own resources', 403);
    });
  });

  describe('enforceTenant', () => {
    it('should set schoolId from user for regular roles', () => {
      req.user = { id: 1, roleName: 'admin', schoolId: 42 };

      const middleware = enforceTenant();
      middleware(req, res, next);

      expect(req.schoolId).toBe(42);
      expect(next).toHaveBeenCalled();
    });

    it('should set null schoolId for super_admin even when query param is present', () => {
      req.user = { id: 1, roleName: 'super_admin' };
      req.query = { schoolId: '7' };

      const middleware = enforceTenant();
      middleware(req, res, next);

      expect(req.schoolId).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should set null schoolId for super_admin without query param', () => {
      req.user = { id: 1, roleName: 'super_admin' };

      const middleware = enforceTenant();
      middleware(req, res, next);

      expect(req.schoolId).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should deny user without schoolId', () => {
      req.user = { id: 2, roleName: 'teacher', schoolId: null };

      const middleware = enforceTenant();
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'User is not assigned to a school', 403);
    });
  });
});
