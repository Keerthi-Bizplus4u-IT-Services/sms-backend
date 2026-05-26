/**
 * Unit Tests for Role Middleware
 * Tests role-based access control
 */

const { authorize, isAdmin, isTeacher, isStudent, isParent } = require('../../../src/middleware/role.middleware');
const { mockRequest, mockResponse, mockNext } = require('../../helpers/testUtils');

// Mock response helper
jest.mock('../../../src/utils/response');

describe('Role Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
    next = mockNext();

    // Mock error response
    const { error } = require('../../../src/utils/response');
    error.mockImplementation((res, message, statusCode) => {
      res.status(statusCode);
      res.json({ success: false, message, data: null, errors: null });
      return res;
    });
  });

  describe('authorize', () => {
    it('should allow access for authorized role', () => {
      req.user = {
        id: 1,
        roleName: 'admin'
      };

      const middleware = authorize(['admin', 'teacher']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).not.toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      req.user = {
        id: 1,
        roleName: 'student'
      };

      const middleware = authorize(['admin', 'teacher']);
      middleware(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(
        res,
        'You do not have permission to access this resource',
        403
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when user not authenticated', () => {
      req.user = null;

      const middleware = authorize(['admin']);
      middleware(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Authentication required', 401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow multiple roles', () => {
      const roles = ['admin', 'teacher', 'student'];
      
      for (const role of roles) {
        jest.clearAllMocks();
        req.user = { id: 1, roleName: role };
        const middleware = authorize(roles);
        middleware(req, res, next);
        expect(next).toHaveBeenCalled();
      }
    });

    it('should be case-sensitive for role names', () => {
      req.user = {
        id: 1,
        roleName: 'Admin' // Different case
      };

      const middleware = authorize(['admin']);
      middleware(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(
        res,
        'You do not have permission to access this resource',
        403
      );
    });

    it('should handle empty allowed roles array', () => {
      req.user = {
        id: 1,
        roleName: 'admin'
      };

      const middleware = authorize([]);
      middleware(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(
        res,
        'You do not have permission to access this resource',
        403
      );
    });
  });

  describe('isAdmin', () => {
    it('should allow access for admin role', () => {
      req.user = {
        id: 1,
        roleName: 'admin'
      };

      isAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).not.toHaveBeenCalled();
    });

    it('should deny access for non-admin role', () => {
      req.user = {
        id: 1,
        roleName: 'teacher'
      };

      isAdmin(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Admin access required', 403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when user not authenticated', () => {
      req.user = null;

      isAdmin(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Authentication required', 401);
    });
  });

  describe('isTeacher', () => {
    it('should allow access for teacher role', () => {
      req.user = {
        id: 1,
        roleName: 'teacher'
      };

      isTeacher(req, res, next);

      expect(next).toHaveBeenCalled();
      const { error } = require('../../../src/utils/response');
      expect(error).not.toHaveBeenCalled();
    });

    it('should deny access for non-teacher role', () => {
      req.user = {
        id: 1,
        roleName: 'student'
      };

      isTeacher(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Teacher access required', 403);
    });

    it('should deny access when user not authenticated', () => {
      req.user = null;

      isTeacher(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Authentication required', 401);
    });
  });

  describe('isStudent', () => {
    it('should allow access for student role', () => {
      req.user = {
        id: 1,
        roleName: 'student'
      };

      isStudent(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for non-student role', () => {
      req.user = {
        id: 1,
        roleName: 'parent'
      };

      isStudent(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Student access required', 403);
    });
  });

  describe('isParent', () => {
    it('should allow access for parent role', () => {
      req.user = {
        id: 1,
        roleName: 'parent'
      };

      isParent(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for non-parent role', () => {
      req.user = {
        id: 1,
        roleName: 'admin'
      };

      isParent(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Parent access required', 403);
    });
  });

  describe('Error handling', () => {
    it('should handle errors in authorize middleware', () => {
      req.user = {
        get roleName() {
          throw new Error('Test error');
        }
      };

      const middleware = authorize(['admin']);
      middleware(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Authorization failed', 500);
    });

    it('should handle errors in isAdmin middleware', () => {
      req.user = {
        get roleName() {
          throw new Error('Test error');
        }
      };

      isAdmin(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Authorization failed', 500);
    });
  });
});
