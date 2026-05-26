/**
 * Shared scoped-query filter builder.
 * Dynamically adds deleted_at IS NULL, school_id, and branch_id filters
 * based on available columns and provided scope values.
 *
 * @param {Set<string>} columns - Set of column names for the target table
 * @param {object} scope - { schoolId, branchId }
 * @param {string} [alias] - Optional table alias prefix (e.g. 's' for s.school_id)
 * @returns {{ filters: string[], replacements: object }}
 */
const buildScopedFilters = (columns, scope = {}, alias = '') => {
  const filters = [];
  const replacements = {};
  const prefix = alias ? `${alias}.` : '';

  if (columns.has('deleted_at')) {
    filters.push(`${prefix}deleted_at IS NULL`);
  }

  if (columns.has('school_id') && Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
    filters.push(`${prefix}school_id = :schoolId`);
    replacements.schoolId = scope.schoolId;
  }

  if (columns.has('branch_id') && Number.isInteger(scope.branchId) && scope.branchId > 0) {
    filters.push(`${prefix}branch_id = :branchId`);
    replacements.branchId = scope.branchId;
  }

  return { filters, replacements };
};

module.exports = { buildScopedFilters };
