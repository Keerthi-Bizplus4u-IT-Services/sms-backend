const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { AppError } = require('../../../middleware/error.middleware');
const { getTableColumns, resolveTableName } = require('./helpers/schema.utils');

class ExpenseRepository {
  constructor() {
    this._tableName = null;
    this._columnsByTable = new Map();
  }

  async getTableName() {
    if (!this._tableName) {
      this._tableName = await resolveTableName(['expense', 'expenses']);
    }

    if (!this._tableName) {
      throw new AppError('Expense table is not available. Run migration backend/migrations/2026-04-10_create_expenses_table.sql', 500);
    }

    return this._tableName;
  }

  async getColumns() {
    const tableName = await this.getTableName();
    if (!this._columnsByTable.has(tableName)) {
      this._columnsByTable.set(tableName, await getTableColumns(tableName));
    }
    return this._columnsByTable.get(tableName);
  }

  resolveColumn(columns, candidates = []) {
    return candidates.find((columnName) => columns.has(columnName)) || null;
  }

  asSelectedColumn(alias, columnName) {
    return columnName ? `${alias}.${columnName}` : 'NULL';
  }

  buildFilterClause(filters = {}, columns = new Set()) {
    const clauses = [];
    const params = [];
    const idColumn = this.resolveColumn(columns, ['exid', 'id']);
    const nameColumn = this.resolveColumn(columns, ['name', 'ename']);
    const purposeColumn = this.resolveColumn(columns, ['purpose', 'item', 'note']);

    if (filters.eid && idColumn) {
      clauses.push(`AND CAST(expense.${idColumn} AS TEXT) LIKE ?`);
      params.push(`%${filters.eid}%`);
    }

    if (filters.ename && nameColumn) {
      clauses.push(`AND expense.${nameColumn} LIKE ?`);
      params.push(`%${filters.ename}%`);
    }

    if (filters.item && purposeColumn) {
      clauses.push(`AND expense.${purposeColumn} LIKE ?`);
      params.push(`%${filters.item}%`);
    }

    return {
      clause: clauses.length ? ` ${clauses.join(' ')}` : '',
      params
    };
  }

  normalizePagination(page = 0, pageSize = 10) {
    const limit = Math.max(1, Math.min(parseInt(pageSize, 10) || 10, 100));
    const currentPage = Math.max(0, parseInt(page, 10) || 0);
    const offset = currentPage * limit;
    return { limit, offset, currentPage };
  }

  async findAll({ page = 0, pageSize = 10, filters = {} }, scope = {}) {
    const tableName = await this.getTableName();
    const columns = await this.getColumns();
    const idColumn = this.resolveColumn(columns, ['exid', 'id']);
    const nameColumn = this.resolveColumn(columns, ['name', 'ename']);
    const purposeColumn = this.resolveColumn(columns, ['purpose', 'item', 'note']);
    const dateColumn = this.resolveColumn(columns, ['date', 'edate']);
    const { clause, params } = this.buildFilterClause(filters, columns);
    const { limit, offset, currentPage } = this.normalizePagination(page, pageSize);

    // Build positional scope filters compatible with existing ? placeholders
    const scopeParts = [];
    const scopeParams = [];

    if (columns.has('deleted_at')) {
      scopeParts.push('AND expense.deleted_at IS NULL');
    }
    if (columns.has('school_id') && Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
      scopeParts.push('AND expense.school_id = ?');
      scopeParams.push(scope.schoolId);
    }
    if (columns.has('branch_id') && Number.isInteger(scope.branchId) && scope.branchId > 0) {
      scopeParts.push('AND expense.branch_id = ?');
      scopeParams.push(scope.branchId);
    }
    const scopeClause = scopeParts.length ? ` ${scopeParts.join(' ')}` : '';
    const allFilterParams = [...params, ...scopeParams];

    const countRows = await sequelize.query(
      `
        SELECT COUNT(*) AS total
        FROM ${tableName} expense
        WHERE 1=1${clause}${scopeClause}
      `,
      {
        replacements: allFilterParams,
        type: QueryTypes.SELECT
      }
    );

    const items = await sequelize.query(
      `
        SELECT
          ${this.asSelectedColumn('expense', idColumn)} AS eid,
          ${this.asSelectedColumn('expense', nameColumn)} AS ename,
          ${this.asSelectedColumn('expense', this.resolveColumn(columns, ['idno']))} AS idno,
          ${this.asSelectedColumn('expense', this.resolveColumn(columns, ['exptype']))} AS exptype,
          ${this.asSelectedColumn('expense', this.resolveColumn(columns, ['invoiceno']))} AS invoiceno,
          ${this.asSelectedColumn('expense', this.resolveColumn(columns, ['amount', 'amount_decimal']))} AS amount,
          ${this.asSelectedColumn('expense', this.resolveColumn(columns, ['phone']))} AS phone,
          ${this.asSelectedColumn('expense', this.resolveColumn(columns, ['email']))} AS email,
          ${this.asSelectedColumn('expense', this.resolveColumn(columns, ['status']))} AS status,
          ${this.asSelectedColumn('expense', dateColumn)} AS date,
          ${this.asSelectedColumn('expense', dateColumn)} AS edate,
          ${this.asSelectedColumn('expense', purposeColumn)} AS purpose,
          ${this.asSelectedColumn('expense', purposeColumn)} AS item
        FROM ${tableName} expense
        WHERE 1=1${clause}${scopeClause}
        ORDER BY ${idColumn ? `expense.${idColumn}` : '1'} DESC
        LIMIT ? OFFSET ?
      `,
      {
        replacements: [...allFilterParams, limit, offset],
        type: QueryTypes.SELECT
      }
    );

    const total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;

    return {
      items,
      total,
      page: currentPage,
      pageSize: limit
    };
  }

  async create(data = {}, scope = {}) {
    const tableName = await this.getTableName();
    const columns = await this.getColumns();
    const fieldMap = {
      ename: ['name', 'ename'],
      idno: ['idno'],
      exptype: ['exptype'],
      invoiceno: ['invoiceno'],
      amount: ['amount', 'amount_decimal'],
      phone: ['phone'],
      email: ['email'],
      status: ['status'],
      edate: ['date', 'edate'],
      date: ['date', 'edate'],
      purpose: ['purpose', 'item', 'note'],
      item: ['purpose', 'item', 'note']
    };

    const payloadByColumn = {};
    for (const [inputField, candidateColumns] of Object.entries(fieldMap)) {
      if (data[inputField] === undefined || data[inputField] === null || data[inputField] === '') {
        continue;
      }

      const columnName = this.resolveColumn(columns, candidateColumns);
      if (!columns.has(columnName)) {
        continue;
      }
      payloadByColumn[columnName] = data[inputField];
    }

    if (columns.has('school_id') && Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
      payloadByColumn.school_id = scope.schoolId;
    }

    if (columns.has('branch_id') && Number.isInteger(scope.branchId) && scope.branchId > 0) {
      payloadByColumn.branch_id = scope.branchId;
    }

    const insertColumns = Object.keys(payloadByColumn);
    if (!insertColumns.length) {
      throw new AppError('No valid expense fields provided', 400);
    }

    const placeholders = insertColumns.map(() => '?');
    const values = insertColumns.map((columnName) => payloadByColumn[columnName]);

    const [result] = await sequelize.query(
      `INSERT INTO ${tableName} (${insertColumns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      {
        replacements: values,
        type: QueryTypes.INSERT
      }
    );

    return result[0] || result;
  }

  async deleteById(eid, scope = {}) {
    const tableName = await this.getTableName();
    const columns = await this.getColumns();
    const idColumn = this.resolveColumn(columns, ['exid', 'id']);
    const numericId = parseInt(eid, 10);

    if (Number.isNaN(numericId)) {
      throw new AppError('Invalid expense identifier', 400);
    }

    if (!idColumn) {
      throw new AppError('Expense identifier column is not available', 500);
    }

    const whereParts = [`${idColumn} = ?`];
    const replacements = [numericId];

    if (columns.has('school_id') && Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
      whereParts.push('school_id = ?');
      replacements.push(scope.schoolId);
    }

    if (columns.has('branch_id') && Number.isInteger(scope.branchId) && scope.branchId > 0) {
      whereParts.push('branch_id = ?');
      replacements.push(scope.branchId);
    }

    const [result] = await sequelize.query(
      `DELETE FROM ${tableName} WHERE ${whereParts.join(' AND ')}`,
      {
        replacements,
        type: QueryTypes.DELETE
      }
    );

    const affectedRows = result?.affectedRows ?? result ?? 0;

    if (!affectedRows) {
      throw new AppError('Expense not found', 404);
    }

    return { message: 'Expense deleted successfully' };
  }
}

module.exports = new ExpenseRepository();
