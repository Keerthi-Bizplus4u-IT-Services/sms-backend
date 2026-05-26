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
        schoolId: null,
        person: mockUser.person,
        permissions: []
      });
      expect(next).toHaveBeenCalled();
    });

    it('should block super admin from non-report endpoints', async () => {
      const token = generateAccessToken({ userId: 1 });
      req.headers.authorization = `Bearer ${token}`;
      req.originalUrl = '/api/v1/students';
      mockUser.role = { id: 10, name: 'super_admin' };
      User.findByPk.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      const { error } = require('../../../src/utils/response');
      expect(error).toHaveBeenCalledWith(res, 'Super admin has report-only access in this instance', 403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow super admin report endpoint access', async () => {
      const token = generateAccessToken({ userId: 1 });
      req.headers.authorization = `Bearer ${token}`;
      req.originalUrl = '/api/v1/dashboard/summary';
      req.method = 'GET';
      mockUser.role = { id: 10, name: 'super_admin' };
      User.findByPk.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(req.schoolId).toBeNull();
      expect(next).toHaveBeenCalled();
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
      expect(req.user.schoolId).toBeNull();
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
