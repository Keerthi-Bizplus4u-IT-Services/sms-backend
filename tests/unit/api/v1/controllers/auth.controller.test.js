/**
 * Unit Tests for Auth Controller
 * Tests authentication endpoints with mocked services
 */

// Mock the service and response helpers before loading the controller
jest.mock('../../../../../src/api/v1/services/auth.service', () => ({
  login: jest.fn(),
  refreshToken: jest.fn(),
  getCurrentUser: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
  forgotPwd: jest.fn(),
  resetPasswordWithOtp: jest.fn(),
  changePassword: jest.fn()
}));
jest.mock('../../../../../src/api/v1/services/academic-year.service', () => ({
  getCurrentAcademicYear: jest.fn()
}));
jest.mock('../../../../../src/utils/response');

const authController = require('../../../../../src/api/v1/controllers/auth.controller');
const authService = require('../../../../../src/api/v1/services/auth.service');
const academicYearService = require('../../../../../src/api/v1/services/academic-year.service');
const { success, error } = require('../../../../../src/utils/response');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('AuthController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    req.ip = '127.0.0.1';
    req.get = jest.fn().mockReturnValue('test-agent');

    // Mock success response to return res
    success.mockReturnValue(res);
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };
      const mockResult = {
        user: {
          id: 1,
          email: 'test@example.com',
          role: 'admin'
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      };

      req.body = loginData;
      authService.login.mockResolvedValue(mockResult);

      await authController.login(req, res, next);

      expect(authService.login).toHaveBeenCalledWith(loginData.email, loginData.password, { ip: '127.0.0.1', userAgent: 'test-agent' });
      expect(success).toHaveBeenCalledWith(res, mockResult, 'Login successful', 200);
    });

    it('should handle login with invalid credentials', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockError = new Error('Invalid email or password');
      authService.login.mockRejectedValue(mockError);

      await authController.login(req, res, next);

      expect(authService.login).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(mockError);
    });

    it('should extract email and password from request body', async () => {
      req.body = {
        email: 'user@example.com',
        password: 'Pass123!'
      };

      authService.login.mockResolvedValue({});

      await authController.login(req, res, next);

      expect(authService.login).toHaveBeenCalledWith('user@example.com', 'Pass123!', { ip: '127.0.0.1', userAgent: 'test-agent' });
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const mockRefreshToken = 'valid-refresh-token';
      const mockResult = {
        accessToken: 'new-access-token'
      };

      req.body = { refreshToken: mockRefreshToken };
      authService.refreshToken.mockResolvedValue(mockResult);

      await authController.refreshToken(req, res, next);

      expect(authService.refreshToken).toHaveBeenCalledWith(mockRefreshToken, { ip: '127.0.0.1', userAgent: 'test-agent' });
      expect(success).toHaveBeenCalledWith(res, mockResult, 'Token refreshed successfully', 200);
    });

    it('should handle invalid refresh token', async () => {
      req.body = { refreshToken: 'invalid-token' };

      const mockError = new Error('Invalid refresh token');
      authService.refreshToken.mockRejectedValue(mockError);

      await authController.refreshToken(req, res, next);

      expect(next).toHaveBeenCalledWith(mockError);
    });

    it('should handle expired refresh token', async () => {
      req.body = { refreshToken: 'expired-token' };

      const mockError = new Error('Refresh token expired');
      authService.refreshToken.mockRejectedValue(mockError);

      await authController.refreshToken(req, res, next);

      expect(next).toHaveBeenCalledWith(mockError);
    });
  });

  describe('getCurrentUser', () => {
    it('should retrieve current user profile', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: { name: 'admin' },
        person: {
          first_name: 'John',
          last_name: 'Doe'
        }
      };

      req.user = { id: 1 };
      authService.getCurrentUser.mockResolvedValue(mockUser);

      await authController.getCurrentUser(req, res, next);

      expect(authService.getCurrentUser).toHaveBeenCalledWith(1);
      expect(success).toHaveBeenCalledWith(res, mockUser, 'User retrieved successfully', 200);
    });

    it('should handle user not found', async () => {
      req.user = { id: 999 };

      const mockError = new Error('User not found');
      authService.getCurrentUser.mockRejectedValue(mockError);

      await authController.getCurrentUser(req, res, next);

      expect(next).toHaveBeenCalledWith(mockError);
    });

    it('should use authenticated user ID from request', async () => {
      req.user = { id: 5, email: 'test@example.com' };
      authService.getCurrentUser.mockResolvedValue({});

      await authController.getCurrentUser(req, res, next);

      expect(authService.getCurrentUser).toHaveBeenCalledWith(5);
    });
  });

  describe('getCurrentUserInfo', () => {
    it('should return formatted user info', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: { name: 'admin' },
        person: { first_name: 'John', last_name: 'Doe' }
      };
      const mockYear = { name: '2024-2025' };

      req.user = { id: 1, roleId: 1, schoolId: 1 };
      authService.getCurrentUser.mockResolvedValue(mockUser);
      academicYearService.getCurrentAcademicYear.mockResolvedValue(mockYear);

      await authController.getCurrentUserInfo(req, res, next);

      expect(success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          role: 1,
          academicYear: '2024-2025',
          name: 'John Doe',
          job: 'admin'
        }),
        'User info retrieved successfully',
        200
      );
    });

    it('should fallback to N/A if academic year fails', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: { name: 'user' },
        person: null
      };

      req.user = { id: 1, roleId: 2, schoolId: 1 };
      authService.getCurrentUser.mockResolvedValue(mockUser);
      academicYearService.getCurrentAcademicYear.mockRejectedValue(new Error('No year'));

      await authController.getCurrentUserInfo(req, res, next);

      expect(success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          academicYear: 'N/A',
          name: 'test@example.com',
          job: 'user'
        }),
        'User info retrieved successfully',
        200
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const mockResult = {
        message: 'Logged out successfully'
      };

      req.user = { id: 1 };
      authService.logout.mockResolvedValue(mockResult);

      await authController.logout(req, res, next);

      expect(authService.logout).toHaveBeenCalledWith(1, undefined);
      expect(success).toHaveBeenCalledWith(res, mockResult, 'Logged out successfully', 200);
    });

    it('should use authenticated user ID for logout', async () => {
      req.user = { id: 10 };
      authService.logout.mockResolvedValue({});

      await authController.logout(req, res, next);

      expect(authService.logout).toHaveBeenCalledWith(10, undefined);
    });

    it('should handle logout errors', async () => {
      req.user = { id: 1 };

      const mockError = new Error('Logout failed');
      authService.logout.mockRejectedValue(mockError);

      await authController.logout(req, res, next);

      expect(next).toHaveBeenCalledWith(mockError);
    });
  });

  describe('changePassword', () => {
    it('should change password for authenticated user', async () => {
      req.user = { id: 8 };
      req.body = {
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123'
      };
      authService.changePassword.mockResolvedValue({ message: 'Password changed successfully' });

      await authController.changePassword(req, res, next);

      expect(authService.changePassword).toHaveBeenCalledWith(8, 'NewPass123', 'NewPass123');
      expect(success).toHaveBeenCalledWith(
        res,
        { message: 'Password changed successfully' },
        'Password changed successfully',
        200
      );
    });
  });

  describe('Error handling', () => {
    it('should propagate service errors', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password'
      };

      const serviceError = new Error('Service error');
      authService.login.mockRejectedValue(serviceError);

      await authController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
    });

    it('should handle missing request data gracefully', async () => {
      req.body = {};
      authService.login.mockResolvedValue({});

      await authController.login(req, res, next);

      expect(authService.login).toHaveBeenCalledWith(undefined, undefined, { ip: '127.0.0.1', userAgent: 'test-agent' });
    });
  });
});
