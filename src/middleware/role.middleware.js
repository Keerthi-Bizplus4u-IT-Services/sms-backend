/**
 * @deprecated Use rbac.middleware.js instead.
 * This file re-exports from rbac.middleware.js for backward compatibility
 * during migration. Will be removed after all routes are updated.
 */
const rbac = require('./rbac.middleware');

module.exports = {
  authorize: rbac.authorize,
  isAdmin: rbac.authorize(['admin']),
  isTeacher: rbac.authorize(['teacher']),
  isStudent: rbac.authorize(['student']),
  isParent: rbac.authorize(['parent']),
  checkOwnership: rbac.checkOwnership
};
