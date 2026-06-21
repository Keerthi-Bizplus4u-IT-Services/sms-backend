const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, User, Role, Person, Parent, Permission, RefreshToken, PasswordResetToken, School, SchoolBranch, AcademicYear } = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');
const { audit } = require('../../../utils/logger');

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Hash a token or OTP using SHA-256
 */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Authentication Service
 * Handles login, token generation, refresh, and password reset.
 * All tokens are DB-backed for revocation support.
 */
class AuthService {
  getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('JWT secret is not configured. Set JWT_SECRET in environment.', 500);
    }
    return secret;
  }

  /**
   * Login user with email and password
   */
  async login(email, password, { ip, userAgent } = {}) {
    const user = await User.findOne({
      where: { email },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name'] },
        {
          model: Person,
          as: 'person',
          attributes: ['id', 'first_name', 'last_name', 'phone', 'photo_url'],
          include: [{ model: Parent, as: 'parent', attributes: ['id'], required: false }]
        }
      ]
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.isLocked()) {
      const remainingTime = Math.ceil((user.locked_until - new Date()) / 60000);
      throw new AppError(
        `Account is locked. Please try again in ${remainingTime} minutes`,
        403
      );
    }

    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      const remainingAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || 5) - user.failed_login_attempts;

      audit('LOGIN_FAILED', { email, ip, reason: 'invalid_password' });

      if (remainingAttempts > 0) {
        throw new AppError(
          `Invalid email or password. ${remainingAttempts} attempts remaining`,
          401
        );
      } else {
        throw new AppError(
          'Account locked due to too many failed login attempts',
          403
        );
      }
    }

    if (!user.is_active) {
      throw new AppError('Account is deactivated', 403);
    }

    await user.resetLoginAttempts();

    // Generate access token (JWT)
    const accessToken = this.generateAccessToken(user);

    // Generate refresh token (random, stored in DB)
    const refreshToken = await this.createRefreshToken(user, { ip, userAgent });

    audit('LOGIN_SUCCESS', { userId: user.id, email: user.email, ip });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role?.name,
        roleId: user.role_id,
        schoolId: user.school_id || null,
        parentId: user.person?.parent?.id || null,
        name: user.person ? `${user.person.first_name} ${user.person.last_name}` : null,
        photo: user.person?.photo_url
      },
      accessToken,
      refreshToken
    };
  }

  /**
   * Refresh access token using a valid refresh token.
   * Implements token rotation: old token is revoked, new one is issued.
   */
  async refreshToken(refreshToken, { ip, userAgent } = {}) {
    const tokenHash = hashToken(refreshToken);

    const storedToken = await RefreshToken.findOne({
      where: { token_hash: tokenHash }
    });

    if (!storedToken) {
      throw new AppError('Invalid refresh token', 401);
    }

    if (!storedToken.isValid()) {
      // If someone tries to reuse a revoked token, revoke ALL tokens for this user (possible theft)
      if (storedToken.revoked_at) {
        await RefreshToken.update(
          { revoked_at: new Date() },
          { where: { user_id: storedToken.user_id, revoked_at: null } }
        );
      }
      throw new AppError('Refresh token expired or revoked. Please login again.', 401);
    }

    const user = await User.findByPk(storedToken.user_id, {
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }]
    });

    if (!user || !user.is_active) {
      await storedToken.revoke();
      throw new AppError('User not found or inactive', 401);
    }

    // Revoke old token (rotation)
    await storedToken.revoke();

    // Issue new tokens
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.createRefreshToken(user, { ip, userAgent });

    audit('TOKEN_REFRESH', { userId: user.id, ip });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  /**
   * Create a DB-backed refresh token.
   * Returns the raw token string (to be sent to client).
   */
  async createRefreshToken(user, { ip, userAgent } = {}) {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      device_info: userAgent ? String(userAgent).substring(0, 255) : null,
      ip_address: ip ? String(ip).substring(0, 45) : null
    });

    return rawToken;
  }

  /**
   * Generate access token (short-lived JWT)
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roleId: user.role_id,
        schoolId: user.school_id || null,
        type: 'access'
      },
      this.getJwtSecret(),
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );
  }

  /**
   * Get current user profile with role and permissions
   */
  async getCurrentUser(userId) {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name', 'description'],
          include: [{
            model: Permission,
            as: 'permissions',
            attributes: ['id', 'name', 'resource', 'action'],
            through: { attributes: [] }
          }]
        },
        {
          model: Person,
          as: 'person',
          attributes: ['id', 'first_name', 'last_name', 'phone', 'photo_url'],
          include: [{ model: Parent, as: 'parent', attributes: ['id'], required: false }]
        }
      ],
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const payload = user.toJSON();
    payload.parentId = payload?.person?.parent?.id || null;

    return payload;
  }

  /**
   * Initiate forgot password — generate OTP and store hash in DB
   */
  async forgotPwd(email) {
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'email']
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the user exists, password reset instructions have been sent.' };
    }

    // Invalidate any existing unused OTPs for this user
    await PasswordResetToken.update(
      { used_at: new Date() },
      { where: { user_id: user.id, used_at: null } }
    );

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = hashToken(otp);

    await PasswordResetToken.create({
      user_id: user.id,
      otp_hash: otpHash,
      expires_at: new Date(Date.now() + OTP_EXPIRY_MS)
    });

    // TODO: Send OTP via email when email service is configured
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Password reset OTP for ${user.email}: ${otp}`);
    }

    return { message: 'If the user exists, password reset instructions have been sent.' };
  }

  /**
   * Reset password using OTP
   */
  async resetPasswordWithOtp(otp, password, confirmPassword) {
    if (password !== confirmPassword) {
      throw new AppError('Passwords do not match', 400);
    }

    if (!password || password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    const otpHash = hashToken(otp);

    const resetToken = await PasswordResetToken.findOne({
      where: {
        otp_hash: otpHash,
        used_at: null,
        expires_at: { [Op.gt]: new Date() }
      }
    });

    if (!resetToken) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    const user = await User.findByPk(resetToken.user_id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Mark OTP as used
    await resetToken.markUsed();

    // Update password
    user.password_hash = password;
    await user.save();

    // Revoke all refresh tokens for this user (force re-login)
    await RefreshToken.update(
      { revoked_at: new Date() },
      { where: { user_id: user.id, revoked_at: null } }
    );

    audit('PASSWORD_RESET', { userId: user.id });

    return { message: 'Password reset successfully' };
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId, newPassword, confirmPassword) {
    if (newPassword !== confirmPassword) {
      throw new AppError('Passwords do not match', 400);
    }

    if (!newPassword || newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.password_hash = newPassword;
    await user.save();

    await RefreshToken.update(
      { revoked_at: new Date() },
      { where: { user_id: user.id, revoked_at: null } }
    );

    audit('PASSWORD_CHANGED', { userId: user.id });

    return { message: 'Password changed successfully' };
  }

  /**
   * Self-service signup — creates school, branch, academic year, person, and admin user in one transaction.
   * Starts a 30-day free trial with resource limits.
   */
  async signup({ name, email, phone, password, school_name, school_address, school_type, gender, date_of_birth }, { ip, userAgent } = {}) {
    // Check email uniqueness
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('An account with this email already exists', 409);
    }

    // Resolve admin role (role_id = 1)
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    if (!adminRole) {
      throw new AppError('System configuration error: admin role not found', 500);
    }

    // Parse name into first/last
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];

    // Generate school code from name
    const codeBase = school_name.trim().replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
    const codeSuffix = crypto.randomInt(1000, 9999);
    const schoolCode = `${codeBase}${codeSuffix}`;

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

    // Determine current academic year name (e.g. "2025-2026")
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const acadStartYear = currentMonth >= 3 ? currentYear : currentYear - 1; // April start
    const acadEndYear = acadStartYear + 1;
    const academicYearName = `${acadStartYear}-${acadEndYear}`;
    const acadStartDate = `${acadStartYear}-04-01`;
    const acadEndDate = `${acadEndYear}-03-31`;

    let result;
    try {
      result = await sequelize.transaction(async (t) => {
        // 1. Create school
        const school = await School.create({
          code: schoolCode,
          name: school_name.trim(),
          school_type: school_type || 'k12',
          is_active: true,
          subscription_plan: 'free',
          max_students: 25,
          max_staff: 5,
          max_classes: 3,
          max_branches: 1,
          trial_started_at: now,
          trial_ends_at: trialEndsAt,
          is_trial: true
        }, { transaction: t });

        // 2. Create main branch
        const branch = await SchoolBranch.create({
          school_id: school.id,
          code: 'MAIN',
          name: 'Main Branch',
          branch_type: 'main',
          is_active: true
        }, { transaction: t });

        // 3. Create academic year
        await AcademicYear.create({
          school_id: school.id,
          name: academicYearName,
          start_date: acadStartDate,
          end_date: acadEndDate,
          is_current: true
        }, { transaction: t });

        // 4. Create person record
        const personGender = gender || 'prefer_not_to_say';
        const personDateOfBirth = date_of_birth || '1990-01-01';

        const person = await Person.create({
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone || null,
          gender: personGender,
          date_of_birth: personDateOfBirth
        }, { transaction: t });

        // 5. Create admin user
        const user = await User.create({
          email: email,
          password_hash: password, // hashed by model hook
          role_id: adminRole.id,
          school_id: school.id,
          person_id: person.id,
          is_active: true
        }, { transaction: t });

        return { user, school, branch };
      });
    } catch (err) {
      // Handles legacy PostgreSQL schema where academic_years has global uniqueness on name.
      if (err?.parent?.code === '23505' && String(err?.parent?.table || '').includes('academic_years')) {
        throw new AppError(
          'Signup failed due to an outdated academic years database constraint. Run latest backend migrations and retry.',
          409
        );
      }
      throw err;
    }

    const { user, school } = result;

    // Load role for token generation
    user.role = adminRole;
    user.school_id = school.id;

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user, { ip, userAgent });

    audit('SIGNUP_SUCCESS', { userId: user.id, email, schoolId: school.id, ip });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: adminRole.name,
        roleId: adminRole.id,
        schoolId: school.id,
        name: name.trim(),
        photo: null
      },
      school: {
        id: school.id,
        name: school.name,
        code: school.code,
        subscription_plan: school.subscription_plan,
        trial_ends_at: school.trial_ends_at,
        is_trial: school.is_trial
      },
      accessToken,
      refreshToken
    };
  }

  /**
   * Logout — revoke the provided refresh token
   */
  async logout(userId, refreshToken) {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      const storedToken = await RefreshToken.findOne({
        where: { token_hash: tokenHash, user_id: userId }
      });
      if (storedToken) {
        await storedToken.revoke();
      }
    }

    audit('LOGOUT', { userId });

    return { message: 'Logged out successfully' };
  }

  /**
   * Logout from all devices — revoke all refresh tokens for user
   */
  async logoutAll(userId) {
    await RefreshToken.update(
      { revoked_at: new Date() },
      { where: { user_id: userId, revoked_at: null } }
    );

    audit('LOGOUT_ALL', { userId });

    return { message: 'Logged out from all devices successfully' };
  }
}

module.exports = new AuthService();
