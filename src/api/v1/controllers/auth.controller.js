const authService = require('../services/auth.service');
const academicYearService = require('../services/academic-year.service');
const { success, error } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');

/**
 * Authentication Controller
 * Handles authentication-related requests
 */

class AuthController {
  /**
   * POST /api/v1/auth/login
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login(email, password, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, result, 'Login successful', 200);
  });

  /**
   * POST /api/v1/auth/refresh
   */
  refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const result = await authService.refreshToken(refreshToken, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, result, 'Token refreshed successfully', 200);
  });

  /**
   * GET /api/v1/auth/me
   */
  getCurrentUser = asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.id);

    return success(res, user, 'User retrieved successfully', 200);
  });

  /**
   * GET /api/v1/user-info
   */
  getCurrentUserInfo = asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.id);
    let academicYear = 'N/A';

    try {
      const currentYear = await academicYearService.getCurrentAcademicYear({ schoolId: req.user.schoolId });
      academicYear = currentYear.name;
    } catch (err) {
      // Fallback if no academic year is configured
    }

    const userInfo = {
      role: req.user.roleId,
      academicYear: academicYear,
      name: user.person ? `${user.person.first_name} ${user.person.last_name}` : user.email,
      job: user.role?.name || 'User'
    };

    return success(res, userInfo, 'User info retrieved successfully', 200);
  });

  /**
   * POST /api/v1/auth/logout
   */
  logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const result = await authService.logout(req.user.id, refreshToken);

    return success(res, result, 'Logged out successfully', 200);
  });

  /**
   * POST /api/v1/auth/logout-all
   */
  logoutAll = asyncHandler(async (req, res) => {
    const result = await authService.logoutAll(req.user.id);

    return success(res, result, 'Logged out from all devices', 200);
  });

  /**
   * POST /api/v1/auth/forgot-pwd
   */
  forgotPwd = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.forgotPwd(email);
    return success(res, result, result.message, 200);
  });

  /**
   * POST /api/v1/auth/reset-password
   */
  resetPasswordWithOtp = asyncHandler(async (req, res) => {
    const { otp, password, confirmPassword } = req.body;
    const result = await authService.resetPasswordWithOtp(otp, password, confirmPassword);
    return success(res, result, result.message, 200);
  });

  /**
   * POST /api/v1/auth/change-password
   */
  changePassword = asyncHandler(async (req, res) => {
    const { newPassword, confirmPassword } = req.body;
    const result = await authService.changePassword(req.user.id, newPassword, confirmPassword);
    return success(res, result, result.message, 200);
  });

  /**
   * POST /api/v1/auth/signup
   * Self-service signup — creates school + admin user with 30-day free trial
   */
  signup = asyncHandler(async (req, res) => {
    const {
      name,
      email,
      phone,
      password,
      school_name,
      school_address,
      school_type,
      gender,
      date_of_birth
    } = req.body;

    const result = await authService.signup(
      {
        name,
        email,
        phone,
        password,
        school_name,
        school_address,
        school_type,
        gender,
        date_of_birth
      },
      { ip: req.ip, userAgent: req.get('User-Agent') }
    );

    return success(res, result, 'Signup successful. Your 30-day free trial has started!', 201);
  });
}

module.exports = new AuthController();
