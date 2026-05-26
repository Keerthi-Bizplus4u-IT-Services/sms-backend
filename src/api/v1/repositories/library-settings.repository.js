const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { AppError } = require('../../../middleware/error.middleware');

class LibrarySettingsRepository {
  buildScopeClause(scope = {}, alias = 's') {
    const parts = [];
    const params = [];
    if (Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
      parts.push(`AND ${alias}.school_id = ?`);
      params.push(scope.schoolId);
    }
    return { clause: parts.join(' '), params };
  }

  // Lending settings
  async findAllSettings(scope = {}) {
    const scopeFilter = this.buildScopeClause(scope);
    return sequelize.query(
      `SELECT * FROM library_settings s WHERE 1=1${scopeFilter.clause} ORDER BY borrower_type`,
      { replacements: [...scopeFilter.params], type: QueryTypes.SELECT }
    );
  }

  async findByBorrowerType(borrowerType, scope = {}) {
    const scopeFilter = this.buildScopeClause(scope);
    const rows = await sequelize.query(
      `SELECT * FROM library_settings s WHERE borrower_type = ?${scopeFilter.clause}`,
      { replacements: [borrowerType, ...scopeFilter.params], type: QueryTypes.SELECT }
    );
    return rows[0] || null;
  }

  async upsertSettings(data, scope = {}) {
    const schoolId = scope.schoolId;
    if (!schoolId) throw new AppError('School context is required', 400);

    const existing = await this.findByBorrowerType(data.borrower_type, scope);
    if (existing) {
      await sequelize.query(
        `UPDATE library_settings
         SET max_books_allowed = ?, default_issue_days = ?, max_renewals = ?, updated_at = NOW()
         WHERE id = ?`,
        {
          replacements: [
            data.max_books_allowed || existing.max_books_allowed,
            data.default_issue_days || existing.default_issue_days,
            data.max_renewals !== undefined ? data.max_renewals : existing.max_renewals,
            existing.id
          ],
          type: QueryTypes.UPDATE
        }
      );
      return this.findByBorrowerType(data.borrower_type, scope);
    }

    const [result] = await sequelize.query(
      `INSERT INTO library_settings (school_id, borrower_type, max_books_allowed, default_issue_days, max_renewals)
       VALUES (?, ?, ?, ?, ?) RETURNING *`,
      {
        replacements: [
          schoolId, data.borrower_type,
          data.max_books_allowed || 3, data.default_issue_days || 14, data.max_renewals || 2
        ],
        type: QueryTypes.INSERT
      }
    );
    return result[0] || result;
  }

  // Fine rules
  async getFineRules(borrowerType, scope = {}) {
    const scopeFilter = this.buildScopeClause(scope, 'r');
    return sequelize.query(
      `SELECT * FROM library_fine_rules r
       WHERE r.borrower_type = ? AND r.is_active = TRUE${scopeFilter.clause}
       ORDER BY r.tier_start_day ASC`,
      { replacements: [borrowerType, ...scopeFilter.params], type: QueryTypes.SELECT }
    );
  }

  async getAllFineRules(scope = {}) {
    const scopeFilter = this.buildScopeClause(scope, 'r');
    return sequelize.query(
      `SELECT * FROM library_fine_rules r WHERE 1=1${scopeFilter.clause} ORDER BY r.borrower_type, r.tier_start_day`,
      { replacements: [...scopeFilter.params], type: QueryTypes.SELECT }
    );
  }

  async createFineRule(data, scope = {}) {
    const schoolId = scope.schoolId;
    if (!schoolId) throw new AppError('School context is required', 400);

    const [result] = await sequelize.query(
      `INSERT INTO library_fine_rules
         (school_id, borrower_type, tier_start_day, tier_end_day, fine_per_day, grace_period_days, max_fine_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      {
        replacements: [
          schoolId, data.borrower_type,
          data.tier_start_day || 1, data.tier_end_day || null,
          data.fine_per_day, data.grace_period_days || 0, data.max_fine_amount || null
        ],
        type: QueryTypes.INSERT
      }
    );
    return result[0] || result;
  }

  async updateFineRule(id, data, scope = {}) {
    const fields = ['borrower_type', 'tier_start_day', 'tier_end_day', 'fine_per_day', 'grace_period_days', 'max_fine_amount', 'is_active'];
    const setClauses = [];
    const values = [];

    for (const field of fields) {
      if (data[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(data[field]);
      }
    }
    if (!setClauses.length) throw new AppError('No fields to update', 400);

    setClauses.push('updated_at = NOW()');
    const scopeFilter = this.buildScopeClause(scope, 'library_fine_rules');
    values.push(id, ...scopeFilter.params);

    const [, rowCount] = await sequelize.query(
      `UPDATE library_fine_rules SET ${setClauses.join(', ')} WHERE id = ?${scopeFilter.clause.replace(/r\./g, 'library_fine_rules.')}`,
      { replacements: values, type: QueryTypes.UPDATE }
    );
    if (!rowCount) throw new AppError('Fine rule not found', 404);

    const rows = await sequelize.query(
      `SELECT * FROM library_fine_rules WHERE id = ?`,
      { replacements: [id], type: QueryTypes.SELECT }
    );
    return rows[0];
  }

  async deleteFineRule(id, scope = {}) {
    const scopeFilter = this.buildScopeClause(scope, 'library_fine_rules');
    const [, rowCount] = await sequelize.query(
      `DELETE FROM library_fine_rules WHERE id = ?${scopeFilter.clause.replace(/r\./g, 'library_fine_rules.')}`,
      { replacements: [id, ...scopeFilter.params], type: QueryTypes.DELETE }
    );
    if (!rowCount) throw new AppError('Fine rule not found', 404);
    return { message: 'Fine rule deleted successfully' };
  }
}

module.exports = new LibrarySettingsRepository();
