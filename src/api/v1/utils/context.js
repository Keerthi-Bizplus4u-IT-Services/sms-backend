const { AppError } = require('../../../middleware/error.middleware');

const parsePositiveInt = (value) => {
  if (typeof value === 'undefined' || value === null) {
    return null;
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
};

const normalizeRoleName = (roleName) => {
  if (!roleName || typeof roleName !== 'string') {
    return null;
  }

  return roleName.trim().toLowerCase();
};

const isSuperAdmin = (req) => {
  const roleFromAuthContext = normalizeRoleName(req?.authContext?.roleName);
  if (roleFromAuthContext) {
    return roleFromAuthContext === 'super_admin';
  }

  return normalizeRoleName(req?.user?.roleName) === 'super_admin';
};

const resolveSchoolIdFromRequest = (req, ...additionalCandidates) => {
  const serverScopedSchoolId =
    parsePositiveInt(req?.authContext?.schoolId) ||
    parsePositiveInt(req?.schoolId) ||
    parsePositiveInt(req?.user?.schoolId) ||
    parsePositiveInt(req?.user?.school_id);

  if (!isSuperAdmin(req)) {
    return serverScopedSchoolId;
  }

  const superAdminCandidates = [
    serverScopedSchoolId,
    parsePositiveInt(req?.headers?.['x-school-id']),
    parsePositiveInt(req?.query?.schoolId),
    parsePositiveInt(req?.query?.school_id),
    parsePositiveInt(req?.body?.school_id),
    parsePositiveInt(req?.body?.schoolId),
    parsePositiveInt(req?.body?.student?.school_id),
    parsePositiveInt(req?.body?.student?.schoolId),
    parsePositiveInt(req?.body?.teacher?.school_id),
    parsePositiveInt(req?.body?.teacher?.schoolId),
    ...additionalCandidates.map((value) => parsePositiveInt(value))
  ];

  const resolved = superAdminCandidates.find((value) => !!value) || null;
  if (resolved) {
    return resolved;
  }

  // super_admin accounts are intentionally global for report scope.
  // Do not force a default school because that hides cross-school data.
  if (isSuperAdmin(req)) {
    return null;
  }

  return null;
};

const ensureSchoolContext = (req, message = 'School context is required') => {
  const schoolId = resolveSchoolIdFromRequest(req);

  if (!schoolId) {
    throw new AppError(message, 400);
  }

  return schoolId;
};

module.exports = {
  parsePositiveInt,
  resolveSchoolIdFromRequest,
  ensureSchoolContext
};
