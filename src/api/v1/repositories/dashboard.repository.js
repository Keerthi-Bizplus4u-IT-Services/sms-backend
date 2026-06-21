const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { resolveTableName, getTableColumns } = require('./helpers/schema.utils');
const { buildScopedFilters } = require('./helpers/scope-filters');

const wrapIdentifier = (value) => `"${String(value).replace(/"/g, '')}"`;
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const toPositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

class DashboardRepository {
  async getSummary(scope = {}) {
    const scopedSummary = {
      schoolId: toPositiveInt(scope.schoolId),
      branchId: toPositiveInt(scope.branchId)
    };

    const [
      studentCount,
      teacherCount,
      parentCount,
      schoolCount,
      classCount,
      sectionCount,
      noticeCount,
      feeSummary,
      expenseSummary
    ] = await Promise.all([
      this.countRowsWithRoleFallback(['students', 'student'], 'student', scopedSummary),
      this.countRowsWithRoleFallback(['teachers', 'teacher'], 'teacher', scopedSummary),
      this.countParents(scopedSummary),
      this.countSchools(scopedSummary),
      this.countClasses(scopedSummary),
      this.countSections(scopedSummary),
      this.countNotices(scopedSummary),
      this.sumFees(scopedSummary),
      this.sumExpenses(scopedSummary)
    ]);

    return {
      studentCount,
      teacherCount,
      parentCount,
      schoolCount,
      classCount,
      sectionCount,
      noticeCount,
      totalFeesPaid: feeSummary.total,
      totalExpenses: expenseSummary.total,
      hasEarningsData: feeSummary.available,
      hasExpenseData: expenseSummary.available
    };
  }

  async getGenderCounts(scope = {}) {
    const studentTable = await resolveTableName(['students', 'student']);
    const personTable = await resolveTableName(['persons', 'person']);

    if (!studentTable || !personTable) {
      return [];
    }

    const [studentColumns, personColumns] = await Promise.all([
      getTableColumns(studentTable),
      getTableColumns(personTable)
    ]);

    const scoped = buildScopedFilters(studentColumns, scope, 's');
    const filters = [...scoped.filters];
    if (personColumns.has('deleted_at')) {
      filters.push('p.deleted_at IS NULL');
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = await sequelize.query(
      `
        SELECT 
          LOWER(COALESCE(CAST(p.gender AS TEXT), 'other')) AS label,
          COUNT(*) AS counts
        FROM ${wrapIdentifier(studentTable)} s
        INNER JOIN ${wrapIdentifier(personTable)} p ON p.id = s.person_id
        ${whereClause}
        GROUP BY label
      `,
      {
        replacements: scoped.replacements,
        type: QueryTypes.SELECT
      }
    );

    return rows.map((row) => ({
      label: row.label || 'other',
      counts: toNumber(row.counts)
    }));
  }

  async countRows(tableCandidates, scope = {}) {
    const table = await resolveTableName(tableCandidates);
    if (!table) {
      return 0;
    }

    const columns = await getTableColumns(table);
    const scoped = buildScopedFilters(columns, scope);
    const filters = [...scoped.filters];

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await sequelize.query(
      `SELECT COUNT(*) AS total FROM ${wrapIdentifier(table)} ${whereClause}`,
      {
        replacements: scoped.replacements,
        type: QueryTypes.SELECT
      }
    );

    return toNumber(rows?.[0]?.total);
  }

  async countRowsWithRoleFallback(tableCandidates, roleName, scope = {}) {
    const directCount = await this.countRows(tableCandidates, scope);

    if (!roleName) {
      return directCount;
    }

    // Some legacy tables (like parents) don't carry school_id/branch_id.
    // In tenant scope, fallback to user-role scoped counting to avoid cross-school leakage.
    const table = await resolveTableName(tableCandidates);
    if (table) {
      const columns = await getTableColumns(table);
      const hasTenantColumns = columns.has('school_id') || columns.has('branch_id');
      if ((Number.isInteger(scope.schoolId) && scope.schoolId > 0) && !hasTenantColumns) {
        return this.countUsersByRoleName(roleName, scope);
      }
    }

    if (directCount > 0) {
      return directCount;
    }

    return this.countUsersByRoleName(roleName, scope);
  }

  async countParents(scope = {}) {
    return this.countUsersByRoleName('parent', scope);
  }

  async countClasses(scope = {}) {
    const classTable = await resolveTableName(['classes', 'class']);
    if (!classTable) {
      return 0;
    }

    const classColumns = await getTableColumns(classTable);

    if (!Number.isInteger(scope.schoolId) || scope.schoolId <= 0) {
      return this.countRows(['classes', 'class'], scope);
    }

    if (classColumns.has('school_id')) {
      return this.countRows(['classes', 'class'], scope);
    }

    const branchTable = await resolveTableName(['school_branches', 'school_branch']);
    if (!branchTable || !classColumns.has('branch_id')) {
      return 0;
    }

    const branchColumns = await getTableColumns(branchTable);
    const filters = ['b.school_id = :schoolId'];
    const replacements = { schoolId: scope.schoolId };

    if (classColumns.has('deleted_at')) {
      filters.push('c.deleted_at IS NULL');
    }
    if (branchColumns.has('deleted_at')) {
      filters.push('b.deleted_at IS NULL');
    }
    if (Number.isInteger(scope.branchId) && scope.branchId > 0) {
      filters.push('c.branch_id = :branchId');
      replacements.branchId = scope.branchId;
    }

    const rows = await sequelize.query(
      `
        SELECT COUNT(*) AS total
        FROM ${wrapIdentifier(classTable)} c
        INNER JOIN ${wrapIdentifier(branchTable)} b ON b.id = c.branch_id
        WHERE ${filters.join(' AND ')}
      `,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );

    return toNumber(rows?.[0]?.total);
  }

  async countSections(scope = {}) {
    const sectionTable = await resolveTableName(['sections', 'section']);
    const classTable = await resolveTableName(['classes', 'class']);
    const branchTable = await resolveTableName(['school_branches', 'school_branch']);

    if (!sectionTable) {
      return 0;
    }

    const sectionColumns = await getTableColumns(sectionTable);
    if (!Number.isInteger(scope.schoolId) || scope.schoolId <= 0) {
      return this.countRows(['sections', 'section'], scope);
    }

    if (sectionColumns.has('school_id')) {
      return this.countRows(['sections', 'section'], scope);
    }

    if (!classTable || !branchTable) {
      return 0;
    }

    const [classColumns, branchColumns] = await Promise.all([
      getTableColumns(classTable),
      getTableColumns(branchTable)
    ]);

    if (!sectionColumns.has('class_id') || !classColumns.has('branch_id')) {
      return 0;
    }

    const filters = ['b.school_id = :schoolId'];
    const replacements = { schoolId: scope.schoolId };

    if (sectionColumns.has('deleted_at')) {
      filters.push('s.deleted_at IS NULL');
    }
    if (classColumns.has('deleted_at')) {
      filters.push('c.deleted_at IS NULL');
    }
    if (branchColumns.has('deleted_at')) {
      filters.push('b.deleted_at IS NULL');
    }
    if (Number.isInteger(scope.branchId) && scope.branchId > 0) {
      filters.push('c.branch_id = :branchId');
      replacements.branchId = scope.branchId;
    }

    const rows = await sequelize.query(
      `
        SELECT COUNT(*) AS total
        FROM ${wrapIdentifier(sectionTable)} s
        INNER JOIN ${wrapIdentifier(classTable)} c ON c.id = s.class_id
        INNER JOIN ${wrapIdentifier(branchTable)} b ON b.id = c.branch_id
        WHERE ${filters.join(' AND ')}
      `,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );

    return toNumber(rows?.[0]?.total);
  }

  async countUsersByRoleName(roleName, scope = {}) {
    const usersTable = await resolveTableName(['users', 'user']);
    const rolesTable = await resolveTableName(['roles', 'role']);

    if (!usersTable || !rolesTable) {
      return 0;
    }

    const [userColumns, roleColumns] = await Promise.all([
      getTableColumns(usersTable),
      getTableColumns(rolesTable)
    ]);

    const scoped = buildScopedFilters(userColumns, scope, 'u');
    const filters = [...scoped.filters, 'LOWER(r.name) = :roleName'];
    const replacements = {
      ...scoped.replacements,
      roleName: String(roleName).toLowerCase()
    };

    if (roleColumns.has('deleted_at')) {
      filters.push('r.deleted_at IS NULL');
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = await sequelize.query(
      `
        SELECT COUNT(DISTINCT u.id) AS total
        FROM ${wrapIdentifier(usersTable)} u
        INNER JOIN ${wrapIdentifier(rolesTable)} r ON r.id = u.role_id
        ${whereClause}
      `,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );

    return toNumber(rows?.[0]?.total);
  }

  async countSchools(scope = {}) {
    const table = await resolveTableName(['schools', 'school']);
    if (!table) {
      return 0;
    }

    const columns = await getTableColumns(table);
    const filters = [];
    const replacements = {};

    if (columns.has('deleted_at')) {
      filters.push('deleted_at IS NULL');
    }

    if (Number.isInteger(scope.schoolId) && scope.schoolId > 0 && columns.has('id')) {
      filters.push('id = :schoolId');
      replacements.schoolId = scope.schoolId;
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await sequelize.query(
      `SELECT COUNT(*) AS total FROM ${wrapIdentifier(table)} ${whereClause}`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );

    return toNumber(rows?.[0]?.total);
  }

  async countNotices(scope = {}) {
    const table = await resolveTableName(['notices', 'notice']);
    if (!table) {
      return 0;
    }

    const columns = await getTableColumns(table);
    const scoped = buildScopedFilters(columns, scope);
    const filters = [...scoped.filters];
    if (columns.has('is_published')) {
      filters.push('is_published = TRUE');
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await sequelize.query(
      `SELECT COUNT(*) AS total FROM ${wrapIdentifier(table)} ${whereClause}`,
      {
        replacements: scoped.replacements,
        type: QueryTypes.SELECT
      }
    );

    return toNumber(rows?.[0]?.total);
  }

  async sumFees(scope = {}) {
    const table = await resolveTableName(['fee_payments', 'feetransactions']);
    if (!table) {
      return { total: 0, available: false };
    }

    const columns = await getTableColumns(table);
    const amountColumn = columns.has('amount') ? 'amount' : 'amountpaid';

    if (Number.isInteger(scope.schoolId) && scope.schoolId > 0 && !columns.has('school_id') && !columns.has('branch_id')) {
      return { total: 0, available: true };
    }

    const scoped = buildScopedFilters(columns, scope);
    const filters = [...scoped.filters];
    if (columns.has('status')) {
      filters.push("status NOT IN ('cancelled','failed','refunded')");
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await sequelize.query(
      `SELECT COALESCE(SUM(${wrapIdentifier(amountColumn)}), 0) AS total FROM ${wrapIdentifier(
        table
      )} ${whereClause}`,
      {
        replacements: scoped.replacements,
        type: QueryTypes.SELECT
      }
    );

    return {
      total: toNumber(rows?.[0]?.total),
      available: true
    };
  }

  async sumExpenses(scope = {}) {
    const table = await resolveTableName(['expenses', 'expense']);
    if (!table) {
      return { total: 0, available: false };
    }

    const columns = await getTableColumns(table);
    const amountColumn = columns.has('amount') ? 'amount' : columns.has('amt') ? 'amt' : null;
    if (!amountColumn) {
      return { total: 0, available: false };
    }

    const scoped = buildScopedFilters(columns, scope);
    const filters = [...scoped.filters];
    if (columns.has('status')) {
      filters.push("LOWER(status) NOT IN ('cancelled','canceled','deleted','rejected')");
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await sequelize.query(
      `SELECT COALESCE(SUM(${wrapIdentifier(amountColumn)}), 0) AS total FROM ${wrapIdentifier(
        table
      )} ${whereClause}`,
      {
        replacements: scoped.replacements,
        type: QueryTypes.SELECT
      }
    );

    return {
      total: toNumber(rows?.[0]?.total),
      available: true
    };
  }
}

module.exports = new DashboardRepository();
