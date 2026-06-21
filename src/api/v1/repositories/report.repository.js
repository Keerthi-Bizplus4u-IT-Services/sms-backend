const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { resolveTableName, getTableColumns } = require('./helpers/schema.utils');
const { buildScopedFilters } = require('./helpers/scope-filters');

const wrapIdentifier = (value) => `"${String(value).replace(/"/g, '')}"`;
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

class ReportRepository {
  async dataIntegrityPreview(scope = {}) {
    const result = {
      scope: {
        schoolId: scope?.schoolId || null,
        branchId: scope?.branchId || null,
      },
      studentParentLinks: {
        relationTable: null,
        duplicateGroups: 0,
        duplicateRows: 0,
        orphanParentLinks: 0,
        orphanStudentLinks: null,
      },
      examSchedules: {
        table: null,
        duplicateGroups: 0,
        duplicateRows: 0,
        orphanRows: 0,
      },
      notes: [],
    };

    const studentsTable = await resolveTableName(['students', 'student']);
    const parentsTable = await resolveTableName(['parents', 'parent']);
    const relationTable = await resolveTableName(['student_parents']);

    result.studentParentLinks.relationTable = relationTable || null;

    if (relationTable && studentsTable && parentsTable) {
      const relationColumns = await getTableColumns(relationTable);
      const studentCol = relationColumns.has('student_id') ? 'student_id' : relationColumns.has('sid') ? 'sid' : null;
      const parentCol = relationColumns.has('parent_id') ? 'parent_id' : relationColumns.has('pid') ? 'pid' : null;

      if (studentCol && parentCol) {
        const studentColumns = await getTableColumns(studentsTable);
        const replacements = {};
        const studentScopeFilters = [];

        if (scope?.schoolId && studentColumns.has('school_id')) {
          studentScopeFilters.push('s.school_id = :schoolId');
          replacements.schoolId = scope.schoolId;
        }

        if (scope?.branchId && studentColumns.has('branch_id')) {
          studentScopeFilters.push('s.branch_id = :branchId');
          replacements.branchId = scope.branchId;
        }

        const scopedWhere = studentScopeFilters.length ? `WHERE ${studentScopeFilters.join(' AND ')}` : '';

        const duplicateStats = await sequelize.query(
          `SELECT
             COALESCE(COUNT(*), 0) AS duplicate_groups,
             COALESCE(SUM(group_count - 1), 0) AS duplicate_rows
           FROM (
             SELECT sp.${wrapIdentifier(studentCol)} AS student_id,
                    sp.${wrapIdentifier(parentCol)} AS parent_id,
                    COUNT(*) AS group_count
             FROM ${wrapIdentifier(relationTable)} sp
             INNER JOIN ${wrapIdentifier(studentsTable)} s
               ON s.id = sp.${wrapIdentifier(studentCol)}
             ${scopedWhere}
             GROUP BY sp.${wrapIdentifier(studentCol)}, sp.${wrapIdentifier(parentCol)}
             HAVING COUNT(*) > 1
           ) duplicates`,
          { replacements, type: QueryTypes.SELECT }
        );

        result.studentParentLinks.duplicateGroups = toNumber(duplicateStats?.[0]?.duplicate_groups);
        result.studentParentLinks.duplicateRows = toNumber(duplicateStats?.[0]?.duplicate_rows);

        const orphanParentRows = await sequelize.query(
          `SELECT COALESCE(COUNT(*), 0) AS orphan_parent_links
           FROM ${wrapIdentifier(relationTable)} sp
           INNER JOIN ${wrapIdentifier(studentsTable)} s
             ON s.id = sp.${wrapIdentifier(studentCol)}
           LEFT JOIN ${wrapIdentifier(parentsTable)} p
             ON p.id = sp.${wrapIdentifier(parentCol)}
           ${scopedWhere ? `${scopedWhere} AND p.id IS NULL` : 'WHERE p.id IS NULL'}`,
          { replacements, type: QueryTypes.SELECT }
        );
        result.studentParentLinks.orphanParentLinks = toNumber(orphanParentRows?.[0]?.orphan_parent_links);

        if (scope?.schoolId || scope?.branchId) {
          result.notes.push('orphanStudentLinks is omitted for scoped requests because missing-student rows cannot be attributed to a specific school/branch safely.');
        } else {
          const orphanStudentRows = await sequelize.query(
            `SELECT COALESCE(COUNT(*), 0) AS orphan_student_links
             FROM ${wrapIdentifier(relationTable)} sp
             LEFT JOIN ${wrapIdentifier(studentsTable)} s
               ON s.id = sp.${wrapIdentifier(studentCol)}
             WHERE s.id IS NULL`,
            { type: QueryTypes.SELECT }
          );
          result.studentParentLinks.orphanStudentLinks = toNumber(orphanStudentRows?.[0]?.orphan_student_links);
        }
      } else {
        result.notes.push('student_parents table was found but expected student/parent key columns were not found.');
      }
    } else {
      result.notes.push('student-parent relation preview is unavailable because required tables were not found.');
    }

    const examScheduleTable = await resolveTableName(['exam_schedules']);
    result.examSchedules.table = examScheduleTable || null;

    if (examScheduleTable) {
      const classesTable = await resolveTableName(['classes', 'class']);
      const classColumns = classesTable ? await getTableColumns(classesTable) : new Set();
      const replacements = {};
      const examScopeFilters = [];

      if (scope?.schoolId && classesTable && classColumns.has('school_id')) {
        examScopeFilters.push('c.school_id = :examSchoolId');
        replacements.examSchoolId = scope.schoolId;
      }

      if (scope?.branchId && classesTable && classColumns.has('branch_id')) {
        examScopeFilters.push('c.branch_id = :examBranchId');
        replacements.examBranchId = scope.branchId;
      }

      const joinScopedClass = classesTable
        ? `INNER JOIN ${wrapIdentifier(classesTable)} c ON c.id = es.class_id`
        : '';
      const examScopeWhere = examScopeFilters.length ? `WHERE ${examScopeFilters.join(' AND ')}` : '';

      const duplicateExamStats = await sequelize.query(
        `SELECT
           COALESCE(COUNT(*), 0) AS duplicate_groups,
           COALESCE(SUM(group_count - 1), 0) AS duplicate_rows
         FROM (
           SELECT es.exam_id, es.class_id, es.subject_id, COUNT(*) AS group_count
           FROM ${wrapIdentifier(examScheduleTable)} es
           ${joinScopedClass}
           ${examScopeWhere}
           GROUP BY es.exam_id, es.class_id, es.subject_id
           HAVING COUNT(*) > 1
         ) duplicates`,
        { replacements, type: QueryTypes.SELECT }
      );

      result.examSchedules.duplicateGroups = toNumber(duplicateExamStats?.[0]?.duplicate_groups);
      result.examSchedules.duplicateRows = toNumber(duplicateExamStats?.[0]?.duplicate_rows);

      if ((scope?.schoolId || scope?.branchId) && !classesTable) {
        result.notes.push('examSchedules.orphanRows is omitted for scoped requests because classes table is unavailable for safe scope filtering.');
      } else {
        const orphanExamRows = await sequelize.query(
          `SELECT COALESCE(COUNT(*), 0) AS orphan_rows
           FROM ${wrapIdentifier(examScheduleTable)} es
           LEFT JOIN exams e ON e.id = es.exam_id
           LEFT JOIN classes c ON c.id = es.class_id
           LEFT JOIN subjects s ON s.id = es.subject_id
           ${examScopeFilters.length ? `WHERE ${examScopeFilters.join(' AND ')} AND` : 'WHERE'}
             (e.id IS NULL OR c.id IS NULL OR s.id IS NULL)`,
          { replacements, type: QueryTypes.SELECT }
        );

        result.examSchedules.orphanRows = toNumber(orphanExamRows?.[0]?.orphan_rows);
      }
    } else {
      result.notes.push('exam schedules preview is unavailable because exam_schedules table was not found.');
    }

    return result;
  }

  /**
   * Fee collection summary grouped by fee type.
   */
  async feeReport(scope = {}) {
    const table = await resolveTableName(['fee_payments', 'feetransactions']);
    if (!table) return { rows: [], totalCollected: 0 };

    const columns = await getTableColumns(table);
    const scoped = buildScopedFilters(columns, scope);
    const filters = [...scoped.filters];

    if (columns.has('status')) {
      filters.push("status NOT IN ('cancelled','failed','refunded')");
    }

    const amountCol = columns.has('amount') ? 'amount' : 'amountpaid';
    const typeCol = columns.has('fee_type') ? 'fee_type' : 'feetype';
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = await sequelize.query(
      `SELECT
         COALESCE(${wrapIdentifier(typeCol)}, 'other') AS fee_type,
         COUNT(*) AS transaction_count,
         COALESCE(SUM(${wrapIdentifier(amountCol)}), 0) AS total_amount
       FROM ${wrapIdentifier(table)}
       ${whereClause}
       GROUP BY ${wrapIdentifier(typeCol)}
       ORDER BY total_amount DESC`,
      { replacements: scoped.replacements, type: QueryTypes.SELECT }
    );

    const totalCollected = rows.reduce((sum, r) => sum + toNumber(r.total_amount), 0);

    return {
      rows: rows.map((r) => ({
        feeType: String(r.fee_type),
        transactionCount: toNumber(r.transaction_count),
        totalAmount: toNumber(r.total_amount)
      })),
      totalCollected
    };
  }

  /**
   * Expense summary grouped by expense type.
   */
  async expenseReport(scope = {}) {
    const table = await resolveTableName(['expenses', 'expense']);
    if (!table) return { rows: [], totalSpent: 0 };

    const columns = await getTableColumns(table);
    const scoped = buildScopedFilters(columns, scope);
    const filters = [...scoped.filters];

    const typeCol = columns.has('exptype') ? 'exptype' : 'expense_type';
    const amountCol = columns.has('amount') ? 'amount' : 'total';
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = await sequelize.query(
      `SELECT
         COALESCE(${wrapIdentifier(typeCol)}, 'other') AS expense_type,
         COUNT(*) AS entry_count,
         COALESCE(SUM(${wrapIdentifier(amountCol)}), 0) AS total_amount
       FROM ${wrapIdentifier(table)}
       ${whereClause}
       GROUP BY ${wrapIdentifier(typeCol)}
       ORDER BY total_amount DESC`,
      { replacements: scoped.replacements, type: QueryTypes.SELECT }
    );

    const totalSpent = rows.reduce((sum, r) => sum + toNumber(r.total_amount), 0);

    return {
      rows: rows.map((r) => ({
        expenseType: String(r.expense_type),
        entryCount: toNumber(r.entry_count),
        totalAmount: toNumber(r.total_amount)
      })),
      totalSpent
    };
  }

  /**
   * Student enrollment counts grouped by class.
   */
  async studentReport(scope = {}) {
    const studentTable = await resolveTableName(['students', 'student']);
    const classTable = await resolveTableName(['classes', 'class']);
    if (!studentTable) return [];

    const studentColumns = await getTableColumns(studentTable);
    const scoped = buildScopedFilters(studentColumns, scope, 's');
    const filters = [...scoped.filters];
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const classNameExpr = classTable
      ? `COALESCE(c.name, CAST(s.class_id AS CHAR))`
      : `CAST(s.class_id AS CHAR)`;

    const joinClause = classTable
      ? `LEFT JOIN ${wrapIdentifier(classTable)} c ON c.id = s.class_id`
      : '';

    const rows = await sequelize.query(
      `SELECT
         s.class_id,
         ${classNameExpr} AS class_name,
         COUNT(*) AS student_count
       FROM ${wrapIdentifier(studentTable)} s
       ${joinClause}
       ${whereClause}
       GROUP BY s.class_id, ${classNameExpr}
       ORDER BY s.class_id`,
      { replacements: scoped.replacements, type: QueryTypes.SELECT }
    );

    return rows.map((r) => ({
      classId: toNumber(r.class_id),
      className: r.class_name || 'Unassigned',
      studentCount: toNumber(r.student_count)
    }));
  }

  /**
   * Combined financial summary: income (fees) vs expenditure (expenses).
   */
  async financialSummary(scope = {}) {
    const [feeData, expenseData] = await Promise.all([
      this.feeReport(scope),
      this.expenseReport(scope)
    ]);

    return {
      totalIncome: feeData.totalCollected,
      totalExpenditure: expenseData.totalSpent,
      netBalance: feeData.totalCollected - expenseData.totalSpent,
      feeBreakdown: feeData.rows,
      expenseBreakdown: expenseData.rows
    };
  }
}

module.exports = new ReportRepository();
