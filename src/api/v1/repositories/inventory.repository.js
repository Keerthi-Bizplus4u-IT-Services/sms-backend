const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { AppError } = require('../../../middleware/error.middleware');

class InventoryRepository {
  buildFilterClause(filters = {}) {
    const clauses = [];
    const params = [];

    if (filters.search) {
      clauses.push('AND inventory.item_name ILIKE ?');
      params.push(`%${filters.search}%`);
    }

    if (filters.category) {
      clauses.push('AND inventory.category = ?');
      params.push(filters.category);
    }

    if (filters.status) {
      clauses.push('AND inventory.status = ?');
      params.push(filters.status);
    }

    if (filters.supplier) {
      clauses.push('AND inventory.supplier ILIKE ?');
      params.push(`%${filters.supplier}%`);
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

  buildScopeClause(scope = {}) {
    const parts = [];
    const params = [];

    if (Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
      parts.push('AND inventory.school_id = ?');
      params.push(scope.schoolId);
    }
    if (Number.isInteger(scope.branchId) && scope.branchId > 0) {
      parts.push('AND inventory.branch_id = ?');
      params.push(scope.branchId);
    }

    return {
      clause: parts.length ? ` ${parts.join(' ')}` : '',
      params
    };
  }

  async findAll({ page = 0, pageSize = 10, filters = {} }, scope = {}) {
    const { clause, params } = this.buildFilterClause(filters);
    const { limit, offset, currentPage } = this.normalizePagination(page, pageSize);
    const scopeFilter = this.buildScopeClause(scope);
    const allFilterParams = [...params, ...scopeFilter.params];

    const countRows = await sequelize.query(
      `
        SELECT COUNT(*) AS total
        FROM inventory
        WHERE 1=1${clause}${scopeFilter.clause}
      `,
      {
        replacements: allFilterParams,
        type: QueryTypes.SELECT
      }
    );

    const items = await sequelize.query(
      `
        SELECT
          inventory.id,
          inventory.item_name,
          inventory.category,
          inventory.quantity,
          inventory.unit,
          inventory.unit_price,
          inventory.supplier,
          inventory.location,
          inventory.status,
          inventory.purchase_date,
          inventory.notes,
          inventory.school_id,
          inventory.branch_id,
          inventory.created_at,
          inventory.updated_at
        FROM inventory
        WHERE 1=1${clause}${scopeFilter.clause}
        ORDER BY inventory.id DESC
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

  async findById(id, scope = {}) {
    const scopeFilter = this.buildScopeClause(scope);

    const rows = await sequelize.query(
      `
        SELECT
          inventory.id,
          inventory.item_name,
          inventory.category,
          inventory.quantity,
          inventory.unit,
          inventory.unit_price,
          inventory.supplier,
          inventory.location,
          inventory.status,
          inventory.purchase_date,
          inventory.notes,
          inventory.school_id,
          inventory.branch_id,
          inventory.created_at,
          inventory.updated_at
        FROM inventory
        WHERE inventory.id = ?${scopeFilter.clause}
      `,
      {
        replacements: [id, ...scopeFilter.params],
        type: QueryTypes.SELECT
      }
    );

    if (!rows.length) {
      throw new AppError('Inventory item not found', 404);
    }

    return rows[0];
  }

  async create(data, scope = {}) {
    const fields = ['item_name', 'category', 'quantity', 'unit', 'unit_price', 'supplier', 'location', 'status', 'purchase_date', 'notes'];
    const columns = [];
    const placeholders = [];
    const values = [];

    for (const field of fields) {
      if (data[field] !== undefined) {
        columns.push(field);
        placeholders.push('?');
        values.push(data[field]);
      }
    }

    if (Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
      columns.push('school_id');
      placeholders.push('?');
      values.push(scope.schoolId);
    }
    if (Number.isInteger(scope.branchId) && scope.branchId > 0) {
      columns.push('branch_id');
      placeholders.push('?');
      values.push(scope.branchId);
    }

    const [result] = await sequelize.query(
      `INSERT INTO inventory (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      {
        replacements: values,
        type: QueryTypes.INSERT
      }
    );

    return result[0] || result;
  }

  async updateById(id, data, scope = {}) {
    const fields = ['item_name', 'category', 'quantity', 'unit', 'unit_price', 'supplier', 'location', 'status', 'purchase_date', 'notes'];
    const setClauses = [];
    const values = [];

    for (const field of fields) {
      if (data[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (!setClauses.length) {
      throw new AppError('No fields to update', 400);
    }

    setClauses.push('updated_at = NOW()');

    const scopeFilter = this.buildScopeClause(scope);
    values.push(id, ...scopeFilter.params);

    const [, rowCount] = await sequelize.query(
      `UPDATE inventory SET ${setClauses.join(', ')} WHERE id = ?${scopeFilter.clause}`,
      {
        replacements: values,
        type: QueryTypes.UPDATE
      }
    );

    if (!rowCount) {
      throw new AppError('Inventory item not found', 404);
    }

    return this.findById(id, scope);
  }

  async deleteById(id, scope = {}) {
    if (!id) {
      throw new AppError('Invalid inventory identifier', 400);
    }

    const scopeFilter = this.buildScopeClause(scope);

    const [, rowCount] = await sequelize.query(
      `DELETE FROM inventory WHERE id = ?${scopeFilter.clause}`,
      {
        replacements: [id, ...scopeFilter.params],
        type: QueryTypes.DELETE
      }
    );

    if (!rowCount) {
      throw new AppError('Inventory item not found', 404);
    }

    return { message: 'Inventory item deleted successfully' };
  }
}

module.exports = new InventoryRepository();
