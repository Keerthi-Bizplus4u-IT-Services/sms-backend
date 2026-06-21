const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { User, Person, Parent, Student, Class, Section } = require('../../../models');
const { resolveTableName, getTableColumns } = require('./helpers/schema.utils');

const wrapIdentifier = (value) => `"${String(value).replace(/"/g, '')}"`;
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

class ParentDashboardRepository {
  /**
   * Find parent record by user id (User -> Person -> Parent)
   */
  async findParentByUserId(userId) {
    const person = await Person.findOne({
      where: { user_id: userId },
      include: [{ model: Parent, as: 'parent', required: true }]
    });
    return person?.parent || null;
  }

  /**
   * Get student ids linked to this parent via student_parents table
   */
  async getStudentIdsByParentId(parentId) {
    const table = await this._resolveStudentParentsTable();
    if (!table) return [];

    const columns = await getTableColumns(table);
    const parentCol = columns.has('parent_id') ? 'parent_id' : columns.has('pid') ? 'pid' : null;
    const studentCol = columns.has('student_id') ? 'student_id' : columns.has('sid') ? 'sid' : null;
    if (!parentCol || !studentCol) return [];

    try {
      const rows = await sequelize.query(
        `SELECT ${wrapIdentifier(studentCol)} AS student_id FROM ${wrapIdentifier(table)} WHERE ${wrapIdentifier(parentCol)} = :parentId`,
        {
          replacements: { parentId },
          type: QueryTypes.SELECT
        }
      );
      return [...new Set(rows
        .map((r) => Number(r.student_id))
        .filter((value) => Number.isInteger(value) && value > 0))];
    } catch (err) {
      console.warn('parent-dashboard: student_parents query failed', err.message);
      return [];
    }
  }

  async _resolveStudentParentsTable() {
    return resolveTableName(['student_parents']);
  }

  /**
   * Get students with person, class, section for given student ids
   */
  async getStudentsByIds(studentIds) {
    if (!studentIds || studentIds.length === 0) return [];
    const students = await Student.findAll({
      where: { id: studentIds },
      include: [
        { model: Person, as: 'person', attributes: ['first_name', 'last_name', 'gender'] },
        { model: Class, as: 'class', attributes: ['id', 'name', 'numeric_grade'] },
        { model: Section, as: 'section', attributes: ['id', 'name'] }
      ],
      attributes: ['id', 'school_id', 'roll_number', 'admission_number', 'admission_date', 'class_id', 'section_id']
    });
    return students;
  }

  /**
   * Get notices for dashboard, scoped by school and target audience when supported.
   */
  async getNotices({ limit = 20, schoolId, roleName = 'parent' } = {}) {
    const table = await resolveTableName(['notices', 'notice']);
    if (!table) return [];

    const columns = await getTableColumns(table);
    const hasDeleted = columns.has('deleted_at');
    const hasPublished = columns.has('is_published');
    const hasSchool = columns.has('school_id');
    const hasAudience = columns.has('target_audience');
    const dateCol = columns.has('date') ? 'date' : columns.has('created_at') ? 'created_at' : 'date';
    const titleCol = columns.has('title') ? 'title' : 'title';
    const contentCol = columns.has('content') ? 'content' : columns.has('body') ? 'body' : 'posted';

    const where = [];
    if (hasDeleted) where.push('deleted_at IS NULL');
    if (hasPublished) where.push('(is_published = TRUE OR is_published IS NULL)');
    const replacements = {};

    if (hasSchool && schoolId) {
      where.push('school_id = :schoolId');
      replacements.schoolId = schoolId;
    }

    if (hasAudience) {
      const normalizedRole = String(roleName || '').trim().toLowerCase();
      if (!['admin', 'principal', 'super_admin'].includes(normalizedRole)) {
        const mappedAudience = normalizedRole === 'parent' ? 'parents' : normalizedRole;
        replacements.audiences = ['all', mappedAudience, normalizedRole]
          .filter(Boolean)
          .map((audience) => String(audience).toLowerCase());
        where.push(
          "(target_audience IS NULL OR TRIM(target_audience) = '' " +
          "OR LOWER(TRIM(target_audience)) IN (:audiences) " +
          "OR EXISTS (SELECT 1 FROM unnest(string_to_array(LOWER(TRIM(target_audience)), ',')) v WHERE TRIM(v) IN (:audiences)))"
        );
      }
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await sequelize.query(
      `SELECT ${wrapIdentifier(dateCol)} AS date, ${wrapIdentifier(titleCol)} AS title, COALESCE(${wrapIdentifier(contentCol)}, '') AS posted FROM ${wrapIdentifier(table)} ${whereClause} ORDER BY ${wrapIdentifier(dateCol)} DESC LIMIT ${parseInt(limit, 10) || 20}`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );
    return rows;
  }

  /**
   * Get fee payments for given student ids (fee_payments or feetransactions)
   */
  async getFeePaymentsForStudentIds(studentIds) {
    if (!studentIds || studentIds.length === 0) return [];
    const table = await resolveTableName(['fee_payments', 'feetransactions']);
    if (!table) return [];

    const columns = await getTableColumns(table);
    const amountCol = columns.has('amount') ? 'amount' : columns.has('amountpaid') ? 'amountpaid' : 'amount';
    const dateCol = columns.has('payment_date') ? 'payment_date' : columns.has('date') ? 'date' : 'created_at';
    const feeTypeCol = columns.has('fee_type') ? 'fee_type' : columns.has('feetype') ? 'feetype' : null;
    const directStudentIdCol = columns.has('student_id')
      ? 'student_id'
      : columns.has('sid')
        ? 'sid'
        : columns.has('studentid')
          ? 'studentid'
          : null;

    const selectCols = [
      wrapIdentifier(amountCol) + ' AS amountpaid',
      wrapIdentifier(dateCol) + ' AS date'
    ];
    if (feeTypeCol) {
      selectCols.push(wrapIdentifier(feeTypeCol) + ' AS feetype');
    } else {
      selectCols.push('1 AS feetype');
    }

    if (directStudentIdCol) {
      const where = [`${wrapIdentifier(directStudentIdCol)} IN (${studentIds.join(',')})`];
      if (columns.has('deleted_at')) where.push('deleted_at IS NULL');

      const rows = await sequelize.query(
        `SELECT ${wrapIdentifier(directStudentIdCol)} AS student_id, ${selectCols.join(', ')} FROM ${wrapIdentifier(table)} WHERE ${where.join(' AND ')} ORDER BY ${wrapIdentifier(dateCol)} DESC`,
        { type: QueryTypes.SELECT }
      );
      return rows;
    }

    if (columns.has('student_fee_id')) {
      const studentFeesTable = await resolveTableName(['student_fees', 'studentfees']);
      if (!studentFeesTable) return [];

      const studentFeeColumns = await getTableColumns(studentFeesTable);
      const studentFeeIdCol = studentFeeColumns.has('id')
        ? 'id'
        : studentFeeColumns.has('student_fee_id')
          ? 'student_fee_id'
          : null;
      const studentFeeStudentCol = studentFeeColumns.has('student_id')
        ? 'student_id'
        : studentFeeColumns.has('sid')
          ? 'sid'
          : null;

      if (!studentFeeIdCol || !studentFeeStudentCol) return [];

      const where = [`sf.${wrapIdentifier(studentFeeStudentCol)} IN (${studentIds.join(',')})`];
      if (columns.has('deleted_at')) where.push('fp.deleted_at IS NULL');
      if (studentFeeColumns.has('deleted_at')) where.push('sf.deleted_at IS NULL');

      const selectColsForJoin = [
        `fp.${wrapIdentifier(amountCol)} AS amountpaid`,
        `fp.${wrapIdentifier(dateCol)} AS date`,
        feeTypeCol ? `fp.${wrapIdentifier(feeTypeCol)} AS feetype` : '1 AS feetype'
      ];

      const rows = await sequelize.query(
        `SELECT sf.${wrapIdentifier(studentFeeStudentCol)} AS student_id, ${selectColsForJoin.join(', ')} FROM ${wrapIdentifier(table)} fp INNER JOIN ${wrapIdentifier(studentFeesTable)} sf ON sf.${wrapIdentifier(studentFeeIdCol)} = fp.${wrapIdentifier('student_fee_id')} WHERE ${where.join(' AND ')} ORDER BY fp.${wrapIdentifier(dateCol)} DESC`,
        { type: QueryTypes.SELECT }
      );
      return rows;
    }

    return [];
  }

  /**
   * Get fee structure placeholder (term totals) if table exists
   */
  async getFeeStructurePlaceholder() {
    const table = await resolveTableName(['fee_structures', 'feedetails']);
    if (!table) {
      return { fterm: 0, sterm: 0, thterm: 0, trans: 0, spofee: 0 };
    }
    return { fterm: 0, sterm: 0, thterm: 0, trans: 0, spofee: 0 };
  }
}

module.exports = new ParentDashboardRepository();
