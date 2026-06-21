/**
 * Unit Tests for Auth Service
 * Tests authentication, login, token generation, and refresh
 */

// Mock the models before loading the auth service
jest.mock('../../../../../src/models');

const authService = require('../../../../../src/api/v1/services/auth.service');
const { User, Role, Person } = require('../../../../../src/models');
const { AppError } = require('../../../../../src/middleware/error.middleware');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

describe('AuthService', () => {
  let mockUser;
  let mockRole;
  let mockPerson;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock role
    mockRole = {
      id: 1,
      name: 'admin'
    };

    // Mock person
    mockPerson = {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      phone: '1234567890',
      photo_url: 'http://example.com/photo.jpg'
    };

    // Mock user
    mockUser = {
      id: 1,
      email: 'test@example.com',
      password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
      role_id: 1,
      person_id: 1,
      is_active: true,
      is_locked: false,
      failed_login_attempts: 0,
      locked_until: null,
      role: mockRole,
      person: mockPerson,
      validatePassword: jest.fn(),
      incrementLoginAttempts: jest.fn(),
      resetLoginAttempts: jest.fn(),
      isLocked: jest.fn()
    };
  });

  describe('login', () => {
    const email = 'test@example.com';
    const password = 'Password123!';

    it('should successfully login with valid credentials', async () => {
      // Arrange
      mockUser.validatePassword.mockResolvedValue(true);
      mockUser.isLocked.mockReturnValue(false);
      User.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await authService.login(email, password);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email },
        include: expect.arrayContaining([
          expect.objectContaining({ model: Role, as: 'role' }),
          expect.objectContaining({ model: Person, as: 'person' })
        ])
      });
      expect(mockUser.validatePassword).toHaveBeenCalledWith(password);
      expect(mockUser.resetLoginAttempts).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(email);
      expect(result.user.role).toBe('admin');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('should throw error when user not found', async () => {
      // Arrange
      User.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(email, password))
        .rejects
        .toThrow(new AppError('Invalid email or password', 401));
    });

    it('should throw error when account is locked', async () => {
      // Arrange
      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      mockUser.isLocked.mockReturnValue(true);
      mockUser.locked_until = lockedUntil;
      User.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.login(email, password))
        .rejects
        .toThrow(AppError);
      
      expect(mockUser.validatePassword).not.toHaveBeenCalled();
    });

    it('should throw error and increment attempts on invalid password', async () => {
      // Arrange
      mockUser.validatePassword.mockResolvedValue(false);
      mockUser.isLocked.mockReturnValue(false);
      mockUser.failed_login_attempts = 2;
      User.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.login(email, password))
        .rejects
        .toThrow(AppError);
      
      expect(mockUser.incrementLoginAttempts).toHaveBeenCalled();
      expect(mockUser.resetLoginAttempts).not.toHaveBeenCalled();
    });

    it('should lock account after max failed attempts', async () => {
      // Arrange
      mockUser.validatePassword.mockResolvedValue(false);
      mockUser.isLocked.mockReturnValue(false);
      mockUser.failed_login_attempts = 5;
      User.findOne.mockResolvedValue(mockUser);
      process.env.MAX_LOGIN_ATTEMPTS = '5';

      // Act & Assert
      await expect(authService.login(email, password))
        .rejects
        .toThrow(new AppError('Account locked due to too many failed login attempts', 403));
      
      expect(mockUser.incrementLoginAttempts).toHaveBeenCalled();
    });

    it('should throw error when account is inactive', async () => {
      // Arrange
      mockUser.validatePassword.mockResolvedValue(true);
      mockUser.isLocked.mockReturnValue(false);
      mockUser.is_active = false;
      User.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.login(email, password))
        .rejects
        .toThrow(new AppError('Account is deactivated', 403));
    });

    it('should show remaining attempts on failed login', async () => {
      // Arrange
      mockUser.validatePassword.mockResolvedValue(false);
      mockUser.isLocked.mockReturnValue(false);
      mockUser.failed_login_attempts = 1;
      User.findOne.mockResolvedValue(mockUser);
      process.env.MAX_LOGIN_ATTEMPTS = '5';

      // Act & Assert
      await expect(authService.login(email, password))
        .rejects
        .toThrow(/4 attempts remaining/);
    });

    it('should include user details in response', async () => {
      // Arrange
      mockUser.validatePassword.mockResolvedValue(true);
      mockUser.isLocked.mockReturnValue(false);
      User.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await authService.login(email, password);

      // Assert
      expect(result.user).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'admin',
        roleId: 1,
        name: 'John Doe',
        photo: 'http://example.com/photo.jpg'
      });
    });

    it('should handle user without person data', async () => {
      // Arrange
      mockUser.validatePassword.mockResolvedValue(true);
      mockUser.isLocked.mockReturnValue(false);
      mockUser.person = null;
      User.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await authService.login(email, password);

      // Assert
      expect(result.user.name).toBeNull();
      expect(result.user.photo).toBeUndefined();
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh access token with valid refresh token', async () => {
      // Arrange
      const refreshToken = jwt.sign(
        { userId: 1, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      mockUser.is_active = true;
      User.findByPk.mockResolvedValue(mockUser);

      // Act
      const result = await authService.refreshToken(refreshToken);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(typeof result.accessToken).toBe('string');
      expect(User.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('should throw error for expired refresh token', async () => {
      // Arrange
      const expiredToken = jwt.sign(
        { userId: 1, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      // Act & Assert
      await expect(authService.refreshToken(expiredToken))
        .rejects
        .toThrow(new AppError('Refresh token expired. Please login again', 401));
    });

    it('should throw error for invalid refresh token', async () => {
      // Arrange
      const invalidToken = 'invalid.token.here';

      // Act & Assert
      await expect(authService.refreshToken(invalidToken))
        .rejects
        .toThrow(new AppError('Invalid refresh token', 401));
    });

    it('should throw error for access token instead of refresh token', async () => {
      // Arrange
      const accessToken = jwt.sign(
        { userId: 1, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      // Act & Assert
      await expect(authService.refreshToken(accessToken))
        .rejects
        .toThrow(new AppError('Invalid token type', 401));
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const refreshToken = jwt.sign(
        { userId: 999, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      User.findByPk.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.refreshToken(refreshToken))
        .rejects
        .toThrow(new AppError('User not found or inactive', 401));
    });

    it('should throw error when user is inactive', async () => {
      // Arrange
      const refreshToken = jwt.sign(
        { userId: 1, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      mockUser.is_active = false;
      User.findByPk.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.refreshToken(refreshToken))
        .rejects
        .toThrow(new AppError('User not found or inactive', 401));
    });
  });

  describe('generateAccessToken', () => {
    it('should generate valid access token', () => {
      // Act
      const token = authService.generateAccessToken(mockUser);

      // Assert
      expect(typeof token).toBe('string');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.roleId).toBe(1);
      expect(decoded.type).toBe('access');
    });

    it('should set correct expiry time', () => {
      // Arrange
      process.env.JWT_ACCESS_EXPIRY = '15m';

      // Act
      const token = authService.generateAccessToken(mockUser);

      // Assert
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const expiryTime = decoded.exp - decoded.iat;
      expect(expiryTime).toBe(15 * 60); // 15 minutes in seconds
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate valid refresh token', () => {
      // Act
      const token = authService.generateRefreshToken(mockUser);

      // Assert
      expect(typeof token).toBe('string');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(1);
      expect(decoded.type).toBe('refresh');
    });

    it('should set correct expiry time', () => {
      // Arrange
      process.env.JWT_REFRESH_EXPIRY = '7d';

      // Act
      const token = authService.generateRefreshToken(mockUser);

      // Assert
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const expiryTime = decoded.exp - decoded.iat;
      expect(expiryTime).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });

    it('should not include email in refresh token', () => {
      // Act
      const token = authService.generateRefreshToken(mockUser);

      // Assert
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.email).toBeUndefined();
    });
  });

  describe('getCurrentUser', () => {
    it('should retrieve current user by ID', async () => {
      // Arrange
      User.findByPk.mockResolvedValue(mockUser);

      // Act
      const result = await authService.getCurrentUser(1);

      // Assert
      expect(User.findByPk).toHaveBeenCalledWith(1, {
        include: expect.arrayContaining([
          expect.objectContaining({ model: Role, as: 'role' }),
          expect.objectContaining({ model: Person, as: 'person' })
        ]),
        attributes: { exclude: ['password_hash'] }
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      User.findByPk.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.getCurrentUser(999))
        .rejects
        .toThrow(new AppError('User not found', 404));
    });

    it('should exclude password hash from response', async () => {
      // Arrange
      User.findByPk.mockResolvedValue(mockUser);

      // Act
      await authService.getCurrentUser(1);

      // Assert
      expect(User.findByPk).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          attributes: { exclude: ['password_hash'] }
        })
      );
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      // Arrange
      User.findByPk.mockResolvedValue(mockUser);

      // Act
      const result = await authService.logout(1);

      // Assert
      expect(User.findByPk).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should throw error when user not found during logout', async () => {
      // Arrange
      User.findByPk.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.logout(999))
        .rejects
        .toThrow(new AppError('User not found', 404));
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle database errors during login', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      User.findOne.mockRejectedValue(dbError);

      // Act & Assert
      await expect(authService.login('test@example.com', 'password'))
        .rejects
        .toThrow('Database connection failed');
    });

    it('should handle malformed JWT tokens', async () => {
      // Arrange
      const malformedToken = 'not.a.valid.jwt.token.at.all';

      // Act & Assert
      await expect(authService.refreshToken(malformedToken))
        .rejects
        .toThrow(AppError);
    });

    it('should handle missing environment variables gracefully', async () => {
      // Arrange
      const originalExpiry = process.env.JWT_ACCESS_EXPIRY;
      delete process.env.JWT_ACCESS_EXPIRY;

      // Act
      const token = authService.generateAccessToken(mockUser);

      // Assert
      expect(token).toBeDefined();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('exp');

      // Cleanup
      process.env.JWT_ACCESS_EXPIRY = originalExpiry;
    });
  });
});
