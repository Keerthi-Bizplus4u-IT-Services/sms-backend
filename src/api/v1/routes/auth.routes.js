const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { loginValidator, refreshTokenValidator, changePasswordValidator, signupValidator } = require('../validators/auth.validator');
const { validate } = require('../../../middleware/validation.middleware');
const { authenticate } = require('../../../middleware/auth.middleware');
const { body } = require('express-validator');

/**
 * Authentication Routes
 * @route /api/v1/auth
 */

// POST /api/v1/auth/login — public
router.post('/login', loginValidator, validate, authController.login);

// POST /api/v1/auth/signup — public (free trial registration)
router.post('/signup', signupValidator, validate, authController.signup);

// POST /api/v1/auth/refresh — public
router.post('/refresh', refreshTokenValidator, validate, authController.refreshToken);

// GET /api/v1/auth/me — private
router.get('/me', authenticate, authController.getCurrentUser);

// POST /api/v1/auth/logout — private (accepts refreshToken in body)
router.post('/logout', authenticate, authController.logout);

// POST /api/v1/auth/logout-all — private
router.post('/logout-all', authenticate, authController.logoutAll);

// POST /api/v1/auth/forgot-pwd — public
router.post('/forgot-pwd',
  [body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email format').normalizeEmail()],
  validate,
  authController.forgotPwd
);

// POST /api/v1/auth/reset-password — public
router.post('/reset-password',
  [
    body('otp').trim().notEmpty().withMessage('OTP is required').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').notEmpty().withMessage('Confirm password is required')
  ],
  validate,
  authController.resetPasswordWithOtp
);

// POST /api/v1/auth/change-password — private
router.post('/change-password',
  authenticate,
  changePasswordValidator,
  validate,
  authController.changePassword
);

module.exports = router;
