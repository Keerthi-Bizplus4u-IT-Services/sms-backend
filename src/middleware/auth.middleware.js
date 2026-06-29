const jwt = require('jsonwebtoken');
const { User, Role, Person, Permission } = require('../models');
const { error } = require('../utils/response');
const { audit } = require('../utils/logger');
const { recordAuthMetric } = require('../utils/auth-metrics');

/**
 * JWT Authentication Middleware
 * Verifies JWT token, loads user with permissions, attaches to request.
 * No legacy session fallback — JWT only.
 */

const normalizeRoleName = (roleName) => {
  if (!roleName || typeof roleName !== 'string') return null;
  return roleName.trim().toLowerCase();
};

const SUPER_ADMIN_REPORT_PREFIXES = ['/api/v1/dashboard', '/api/v1/reports'];
const SUPER_ADMIN_AUTH_ALLOWED = ['/api/v1/auth/me', '/api/v1/auth/logout', '/api/v1/auth/logout-all'];

const isSuperAdminReportOnlyMode = () => {
  const raw = String(process.env.SUPER_ADMIN_REPORT_ONLY || 'false').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(raw);
};

const isSuperAdminReportRequest = (req) => {
  const path = String(req?.originalUrl || req?.url || '').split('?')[0].toLowerCase();
  const method = String(req?.method || 'GET').toUpperCase();

  if (SUPER_ADMIN_AUTH_ALLOWED.some((prefix) => path.startsWith(prefix))) {
    return true;
  }

  const isReportPath = SUPER_ADMIN_REPORT_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!isReportPath) {
    return false;
  }

  return method === 'GET';
};

const getJwtVerifyOptions = () => {
  const issuer = process.env.JWT_ISSUER;
  const audience = process.env.JWT_AUDIENCE;
  const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

  if (isProduction && (!issuer || !audience)) {
    const missing = [];
    if (!issuer) missing.push('JWT_ISSUER');
    if (!audience) missing.push('JWT_AUDIENCE');

    const err = new Error(`Missing JWT verification settings in production: ${missing.join(', ')}`);
    err.code = 'JWT_VERIFY_CONFIG_MISSING';
    throw err;
  }

  const options = {};

  if (issuer) {
    options.issuer = issuer;
  }

  if (audience) {
    options.audience = audience;
  }

  return options;
};

/**
 * Load user from DB with role + permissions eagerly loaded
 */
const loadUserWithPermissions = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Role,
        as: 'role',
        attributes: ['id', 'name'],
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
        attributes: ['id', 'first_name', 'last_name', 'phone', 'photo_url']
      }
    ],
    attributes: { exclude: ['password_hash'] }
  });
  return user;
};

/**
 * Extract and verify JWT from Authorization header
 */
const extractAndVerifyToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  return jwt.verify(token, process.env.JWT_SECRET, getJwtVerifyOptions());
};

/**
 * Build req.user object from a loaded user model
 */
const buildReqUser = (user) => {
  const permissions = user.role?.permissions?.map(p => p.name) || [];
  return {
    id: user.id,
    email: user.email,
    roleId: user.role_id,
    roleName: normalizeRoleName(user.role?.name),
    schoolId: user.school_id || null,
    branchId: user.branch_id || user.school_branch_id || null,
    person: user.person,
    permissions
  };
};

const buildAuthContext = (user, decoded) => Object.freeze({
  userId: user.id,
  schoolId: user.school_id || null,
  branchId: decoded?.bid || user.branch_id || user.school_branch_id || null,
  roleId: user.role_id,
  roleName: normalizeRoleName(user.role?.name),
  permissions: Object.freeze(user.role?.permissions?.map((permission) => permission.name) || []),
  token: Object.freeze({
    type: decoded?.type || null,
    ver: decoded?.ver || null,
    jti: decoded?.jti || null,
    tid: decoded?.tid || null,
    bid: decoded?.bid || null,
    iat: decoded?.iat || null,
    exp: decoded?.exp || null,
    sub: decoded?.sub || null
  })
});

const parsePositiveInt = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
};

/**
 * Primary authentication middleware
 * Requires a valid Bearer token. Rejects if missing or invalid.
 */
const authenticate = async (req, res, next) => {
  try {
    let decoded;
    try {
      decoded = extractAndVerifyToken(req.headers.authorization);
    } catch (err) {
      if (err.code === 'JWT_VERIFY_CONFIG_MISSING') {
        recordAuthMetric('auth_config_error', {
          route: req.originalUrl,
          method: req.method,
          reason: err.message
        });
        return error(res, 'Authentication configuration error', 500);
      }

      if (err.name === 'TokenExpiredError') {
        recordAuthMetric('auth_expired_token', {
          route: req.originalUrl,
          method: req.method
        });
        return error(res, 'Token has expired', 401);
      }
      if (err.name === 'JsonWebTokenError') {
        recordAuthMetric('auth_invalid_token', {
          route: req.originalUrl,
          method: req.method
        });
        return error(res, 'Invalid token', 401);
      }
      throw err;
    }

    if (!decoded) {
      recordAuthMetric('auth_invalid_token', {
        route: req.originalUrl,
        method: req.method,
        reason: 'missing_bearer_token'
      });
      return error(res, 'Access token is required', 401);
    }

    if (decoded.type && decoded.type !== 'access') {
      recordAuthMetric('auth_invalid_token_type', {
        route: req.originalUrl,
        method: req.method,
        tokenType: decoded.type
      });
      return error(res, 'Invalid token type', 401);
    }

    const user = await loadUserWithPermissions(decoded.userId);

    if (!user) {
      recordAuthMetric('auth_user_not_found', {
        route: req.originalUrl,
        method: req.method,
        tokenUserId: decoded.userId
      });
      return error(res, 'User not found', 401);
    }

    if (!user.is_active) {
      recordAuthMetric('auth_account_deactivated', {
        route: req.originalUrl,
        method: req.method,
        userId: user.id
      });
      return error(res, 'Account is deactivated', 403);
    }

    if (user.isLocked()) {
      recordAuthMetric('auth_account_locked', {
        route: req.originalUrl,
        method: req.method,
        userId: user.id
      });
      return error(res, 'Account is locked due to too many failed login attempts', 403);
    }

    req.user = buildReqUser(user);
    req.authContext = buildAuthContext(user, decoded);

    // Set req.schoolId for tenant isolation
    // super_admin report scope is auto-derived from assignment and remains global within this instance.
    if (req.authContext.roleName === 'super_admin') {
      if (isSuperAdminReportOnlyMode() && !isSuperAdminReportRequest(req)) {
        return error(res, 'Super admin has report-only access in this instance', 403);
      }

      req.schoolId = null;
    } else {
      req.schoolId = req.authContext.schoolId ? parseInt(req.authContext.schoolId, 10) : null;

      if (!req.schoolId) {
        recordAuthMetric('auth_missing_tenant_scope', {
          route: req.originalUrl,
          method: req.method,
          userId: req.authContext.userId,
          tokenJti: req.authContext.token?.jti || null
        });
        return error(res, 'Tenant scope missing in access token', 403);
      }

      const requestedSchoolId = parsePositiveInt(req.headers['x-school-id']);
      if (requestedSchoolId && requestedSchoolId !== req.schoolId) {
        if (typeof audit === 'function') {
          audit('TENANT_MISMATCH', {
            userId: req.authContext.userId,
            tokenSchoolId: req.schoolId,
            requestedSchoolId,
            route: req.originalUrl,
            method: req.method,
            tokenJti: req.authContext.token?.jti || null,
            reason: 'x-school-id_conflicts_with_token_tenant'
          });
        }
        recordAuthMetric('auth_tenant_mismatch', {
          route: req.originalUrl,
          method: req.method,
          userId: req.authContext.userId,
          tokenSchoolId: req.schoolId,
          requestedSchoolId,
          tokenJti: req.authContext.token?.jti || null
        });
        return error(res, 'Tenant mismatch in request context', 403);
      }
    }

    recordAuthMetric('auth_success', {
      route: req.originalUrl,
      method: req.method,
      userId: req.authContext.userId,
      schoolId: req.schoolId,
      branchId: req.authContext.branchId,
      roleName: req.authContext.roleName,
      tokenJti: req.authContext.token?.jti || null
    });

    next();
  } catch (err) {
    console.error('Authentication error:', err);
    recordAuthMetric('auth_internal_error', {
      route: req.originalUrl,
      method: req.method,
      reason: err.message
    });
    return error(res, 'Authentication failed', 500);
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if missing/invalid.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const decoded = extractAndVerifyToken(req.headers.authorization);
    if (!decoded) return next();

    const user = await loadUserWithPermissions(decoded.userId);
    if (user && user.is_active && !user.isLocked()) {
      req.user = buildReqUser(user);
      req.authContext = buildAuthContext(user, decoded);
    }
  } catch (_err) {
    // Invalid token — continue without user
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuth
};
