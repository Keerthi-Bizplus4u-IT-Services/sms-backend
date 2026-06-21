const { AppError } = require('./error.middleware');
const { ensureSchoolContext } = require('../api/v1/utils/context');
const {
  getSchoolWithLimits,
  countActiveStudents,
  countActiveTeachers,
  countClasses,
  countBranches
} = require('../api/v1/utils/resource-counter');

/**
 * Trial / Plan Limits Middleware
 * Enforces resource creation limits based on the school's subscription plan.
 * Returns 403 when a limit is reached.
 * Super admins bypass all limits.
 */

function buildLimitError(resource, used, max) {
  return new AppError(
    `Plan limit reached: You have ${used}/${max} ${resource}. Upgrade your plan to add more.`,
    403
  );
}

/**
 * Enforce student creation limit
 */
const enforceStudentLimit = async (req, res, next) => {
  try {
    if (req.user?.roleName === 'super_admin') return next();

    const schoolId = ensureSchoolContext(req);
    const school = await getSchoolWithLimits(schoolId);
    if (!school) return next();

    const count = await countActiveStudents(schoolId);
    if (count >= school.max_students) {
      throw buildLimitError('students', count, school.max_students);
    }
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Enforce teacher/staff creation limit
 */
const enforceTeacherLimit = async (req, res, next) => {
  try {
    if (req.user?.roleName === 'super_admin') return next();

    const schoolId = ensureSchoolContext(req);
    const school = await getSchoolWithLimits(schoolId);
    if (!school) return next();

    const count = await countActiveTeachers(schoolId);
    if (count >= school.max_staff) {
      throw buildLimitError('staff members', count, school.max_staff);
    }
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Enforce class creation limit
 */
const enforceClassLimit = async (req, res, next) => {
  try {
    if (req.user?.roleName === 'super_admin') return next();

    const schoolId = ensureSchoolContext(req);
    const school = await getSchoolWithLimits(schoolId);
    if (!school) return next();

    const count = await countClasses(schoolId);
    if (count >= school.max_classes) {
      throw buildLimitError('classes', count, school.max_classes);
    }
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Enforce branch creation limit
 */
const enforceBranchLimit = async (req, res, next) => {
  try {
    if (req.user?.roleName === 'super_admin') return next();

    const schoolId = ensureSchoolContext(req);
    const school = await getSchoolWithLimits(schoolId);
    if (!school) return next();

    const count = await countBranches(schoolId);
    if (count >= school.max_branches) {
      throw buildLimitError('branches', count, school.max_branches);
    }
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Enforce email/SMS restriction for free plan schools
 */
const enforceEmailRestriction = async (req, res, next) => {
  try {
    if (req.user?.roleName === 'super_admin') return next();

    const schoolId = ensureSchoolContext(req);
    const school = await getSchoolWithLimits(schoolId);
    if (!school) return next();

    if (school.subscription_plan === 'free') {
      throw new AppError(
        'Email and SMS sending is not available on the free plan. Upgrade to send communications.',
        403
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  enforceStudentLimit,
  enforceTeacherLimit,
  enforceClassLimit,
  enforceBranchLimit,
  enforceEmailRestriction
};
