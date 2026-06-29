/**
 * Unit Tests for Authentication Middleware
 * Tests JWT authentication and authorization
 */

const { authenticate, optionalAuth } = require('../../../src/middleware/auth.middleware');
const { User, Role, Person } = require('../../../src/models');
const jwt = require('jsonwebtoken');
const { mockRequest, mockResponse, mockNext, generateAccessToken, generateExpiredToken } = require('../../helpers/testUtils');

// Mock models and response helper
jest.mock('../../../src/models');
jest.mock('../../../src/utils/response');
jest.mock('../../../src/utils/logger', () => ({
  audit: jest.fn()
}));

describe('Auth Middleware', () => {
  let req;
  let res;
  let next;
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
    next = mockNext();

    mockUser = {
      id: 1,
      email: 'test@example.com',
      role_id: 1,
      school_id: 10,
      is_active: true,
      role: { id: 1, name: 'admin' },
      person: {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        phone: '1234567890',
        photo_url: 'photo.jpg'
      },
      isLocked: jest.fn().mockReturnValue(false)
    };

    // Mock error response
    const { error } = require('../../../src/utils/response');
    error.mockImplementation((res, message, statusCode) => {
      res.status(statusCode);
      res.json({ success: false, message, data: null, errors: null });
      return res;
    });
  });

  describe('authenticate', () => {
    it('should authenticate user with valid token', async () => {
      const token = generateAccessToken({ userId: 1 });
      req.headers.authorization = `Bearer ${token}`;
      User.findByPk.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(User.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(req.user).toEqual({
        id: 1,
        email: 'test@example.com',
        roleId: 1,
        roleName: 'admin',
        schoolId: 10,
        branchId: null,
        person: mockUser.person,
        permissions: []
      });
      expect(req.authContext).toMatchObject({
        userId: 1,
        schoolId: 10,
        roleName: 'admin'
      });
      expect(req.schoolId).toBe(10);
      expect(next).toHaveBeenCalled();
    });

    it('should block super admin from non-report endpoints', async () => {
      const previous = process.env.SUPER_ADMIN_REPORT_ONLY;
      try {
        process.env.SUPER_ADMIN_REPORT_ONLY = 'true';
        const token = generateAccessToken({ userId: 1 });
        req.headers.authorization = `Bearer ${token}`;
        req.originalUrl = '/api/v1/students';
        mockUser.role = { id: 10, name: 'super_admin' };
        User.findByPk.mockResolvedValue(mockUser);

        await authenticate(req, res, next);

        const { error } = require('../../../src/utils/response');
        expect(error).toHaveBeenCalledWith(res, 'Super admin has report-only access in this instance', 403);
        expect(next).not.toHaveBeenCalled();
      } finally {
        if (typeof previous === 'undefined') {
          delete process.env.SUPER_ADMIN_REPORT_ONLY;
        } else {
          process.env.SUPER_ADMIN_REPORT_ONLY = previous;
        }
      }
    });

    it('should allow super admin report endpoint access', async () => {
      const previous = process.env.SUPER_ADMIN_REPORT_ONLY;
      try {
        process.env.SUPER_ADMIN_REPORT_ONLY = 'true';
        const token = generateAccessToken({ userId: 1 });
        req.headers.authorization = `Bearer ${token}`;
        req.originalUrl = '/api/v1/dashboard/summary';
        req.method = 'GET';
        mockUser.role = { id: 10, name: 'super_admin' };
        User.findByPk.mockResolvedValue(mockUser);

        await authenticate(req, res, next);

        expect(req.schoolId).toBeNull();
        expect(next).toHaveBeenCalled();
      } finally {
        if (typeof previous === 'undefined') {
          delete process.env.SUPER_ADMIN_REPORT_ONLY;
        } else {
          process.env.SUPER_ADMIN_REPORT_ONLY = previous;
        }
      }
    });

    it('should allow super admin GET access for reports route in report-only mode', async () => {
      const previous = process.env.SUPER_ADMIN_REPORT_ONLY;
      try {
        process.env.SUPER_ADMIN_REPORT_ONLY = 'true';
        const token = generateAccessToken({ userId: 1 });
        req.headers.authorization = `Bearer ${token}`;
        req.originalUrl = '/api/v1/reports/financial-summary';
        req.method = 'GET';
        mockUser.role = { id: 10, name: 'super_admin' };
        User.findByPk.mockResolvedValue(mockUser);

        await authenticate(req, res, next);

        expect(req.schoolId).toBeNull();
        expect(next).toHaveBeenCalled();
      } finally {
        if (typeof previous === 'undefined') {
          delete process.env.SUPER_ADMIN_REPORT_ONLY;
        } else {
          process.env.SUPER_ADMIN_REPORT_ONLY = previous;
        }
      }
    });

    it('should deny super admin schools route when report-only mode is enabled', async () => {
      const previous = process.env.SUPER_ADMIN_REPORT_ONLY;
      try {
        process.env.SUPER_ADMIN_REPORT_ONLY = 'true';
        const token = generateAccessToken({ userId: 1 });
        req.headers.authorization = `Bearer ${token}`;
        req.originalUrl = '/api/v1/schools';
        req.method = 'GET';
        mockUser.role = { id: 10, name: 'super_admin' };
        User.findByPk.mockResolvedValue(mockUser);

        await authenticate(req, res, next);

        const { error } = require('../../../src/utils/response');
        expect(error).toHaveBeenCalledWith(res, 'Super admin has report-only access in this instance', 403);
        expect(next).not.toHaveBeenCalled();
      } finally {
        if (typeof previous === 'undefined') {
          delete process.env.SUPER_ADMIN_REPORT_ONLY;
        } else {
          process.env.SUPER_ADMIN_REPORT_ONLY = previous;
        }
      }
    });

    it('should reject conflicting x-school-id for non-super-admin', async () => {
      const token = generateAccessToken({ userId: 1 });
      req.headers.authorization = `Bearer ${token}`;
      req.headers['x-school-id'] = '99';
      req.originalUrl = '/api/v1/students';
      req.method = 'GET';
      User.findByPk.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Tenant mismatch in request context', 403);
      expect(next).not.toHaveBeenCalled();
    });

    it.each([
      '/api/v1/students',
      '/api/v1/teachers',
      '/api/v1/parents',
      '/api/v1/fees/payments',
      '/api/v1/expenses',
      '/api/v1/reports/fees',
      '/api/v1/schools/1'
    ])('should deny tenant mismatch on %s for non-super-admin', async (routePath) => {
      const token = generateAccessToken({ userId: 1 });
      req.headers.authorization = `Bearer ${token}`;
      req.headers['x-school-id'] = '99';
      req.originalUrl = routePath;
      req.method = 'GET';
      User.findByPk.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Tenant mismatch in request context', 403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      req.headers.authorization = undefined;

      await authenticate(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Access token is required', 401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request without Bearer prefix', async () => {
      req.headers.authorization = 'InvalidFormat token';

      await authenticate(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Access token is required', 401);
    });

    it('should reject expired token', async () => {
      const expiredToken = generateExpiredToken();
      req.headers.authorization = `Bearer ${expiredToken}`;

      await authenticate(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Token has expired', 401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      req.headers.authorization = 'Bearer invalid.token.here';

      await authenticate(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Invalid token', 401);
    });

    it('should reject in production when JWT issuer/audience are missing', async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      const previousIssuer = process.env.JWT_ISSUER;
      const previousAudience = process.env.JWT_AUDIENCE;

      try {
        process.env.NODE_ENV = 'production';
        delete process.env.JWT_ISSUER;
        delete process.env.JWT_AUDIENCE;

        const token = generateAccessToken({ userId: 1 });
        req.headers.authorization = `Bearer ${token}`;

        await authenticate(req, res, next);

        const { error } = require('../../../src/utils/response');
        expect(error).toHaveBeenCalledWith(res, 'Authentication configuration error', 500);
      } finally {
        if (typeof previousNodeEnv === 'undefined') {
          delete process.env.NODE_ENV;
        } else {
          process.env.NODE_ENV = previousNodeEnv;
        }

        if (typeof previousIssuer === 'undefined') {
          delete process.env.JWT_ISSUER;
        } else {
          process.env.JWT_ISSUER = previousIssuer;
        }

        if (typeof previousAudience === 'undefined') {
          delete process.env.JWT_AUDIENCE;
        } else {
          process.env.JWT_AUDIENCE = previousAudience;
        }
      }
    });

    it('should reject when user not found', async () => {
      const token = generateAccessToken({ userId: 999 });
      req.headers.authorization = `Bearer ${token}`;
      User.findByPk.mockResolvedValue(null);

      await authenticate(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'User not found', 401);
    });

    it('should reject deactivated user account', async () => {
      const token = generateAccessToken({ userId: 1 });
      req.headers.authorization = `Bearer ${token}`;
      mockUser.is_active = false;
      User.findByPk.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Account is deactivated', 403);
    });

    it('should reject locked user account', async () => {
      const token = generateAccessToken({ userId: 1 });
      req.headers.authorization = `Bearer ${token}`;
      mockUser.isLocked.mockReturnValue(true);
      User.findByPk.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Account is locked due to too many failed login attempts', 403);
    });

    it('should include user role and person details', async () => {
      const token = generateAccessToken({ userId: 1 });
      req.headers.authorization = `Bearer ${token}`;
      User.findByPk.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(req.user.roleName).toBe('admin');
      expect(req.user.person).toBeDefined();
      expect(req.user.person.first_name).toBe('John');
    });

    it('should handle database errors gracefully', async () => {
      const token = generateAccessToken({ userId: 1 });
      req.headers.authorization = `Bearer ${token}`;
      User.findByPk.mockRejectedValue(new Error('Database error'));

      await authenticate(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Authentication failed', 500);
    });

    it('should exclude password_hash from user data', async () => {
      const token = generateAccessToken({ userId: 1 });
      req.headers.authorization = `Bearer ${token}`;
      User.findByPk.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(User.findByPk).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          attributes: { exclude: ['password_hash'] }
        })
      );
    });
  });

  describe('optionalAuth', () => {
    it('should attach user if valid token provided', async () => {
      const token = generateAccessToken({ userId: 1 });
      req.headers.authorization = `Bearer ${token}`;
      User.findByPk.mockResolvedValue(mockUser);

      await optionalAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(1);
      expect(req.user.schoolId).toBe(10);
      expect(req.authContext).toMatchObject({ userId: 1, schoolId: 10 });
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user if no token provided', async () => {
      req.headers.authorization = undefined;

      await optionalAuth(req, res, next);

      expect(req.user).toBeFalsy(); // null or undefined
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user if token is invalid', async () => {
      req.headers.authorization = 'Bearer invalid.token';

      await optionalAuth(req, res, next);

      expect(req.user).toBeFalsy(); // null or undefined
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user if token is expired', async () => {
      const expiredToken = generateExpiredToken();
      req.headers.authorization = `Bearer ${expiredToken}`;

      await optionalAuth(req, res, next);

      expect(req.user).toBeFalsy(); // null or undefined
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user if user not found', async () => {
      const token = generateAccessToken({ userId: 999 });
      req.headers.authorization = `Bearer ${token}`;
      User.findByPk.mockResolvedValue(null);

      await optionalAuth(req, res, next);

      expect(req.user).toBeFalsy(); // null or undefined
      expect(next).toHaveBeenCalled();
    });
  });
});
