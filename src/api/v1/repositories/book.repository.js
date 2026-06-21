const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { AppError } = require('../../../middleware/error.middleware');

class BookRepository {
  buildFilterClause(filters = {}) {
    const clauses = [];
    const params = [];

    if (filters.search) {
      clauses.push('AND (b.title ILIKE ? OR b.isbn ILIKE ? OR b.authors ILIKE ?)');
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }
    if (filters.category) {
      clauses.push('AND b.category = ?');
      params.push(filters.category);
    }
    if (filters.book_type) {
      clauses.push('AND b.book_type = ?');
      params.push(filters.book_type);
    }
    if (filters.language) {
      clauses.push('AND b.language = ?');
      params.push(filters.language);
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

  buildScopeClause(scope = {}, alias = 'b') {
    const parts = [];
    const params = [];
    if (Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
      parts.push(`AND ${alias}.school_id = ?`);
      params.push(scope.schoolId);
    }
    return { clause: parts.join(' '), params };
  }

  async findAll({ page = 0, pageSize = 10, filters = {} }, scope = {}) {
    const { clause, params } = this.buildFilterClause(filters);
    const { limit, offset, currentPage } = this.normalizePagination(page, pageSize);
    const scopeFilter = this.buildScopeClause(scope);
    const allParams = [...params, ...scopeFilter.params];

    const countRows = await sequelize.query(
      `SELECT COUNT(*) AS total FROM library_books b
       WHERE b.deleted_at IS NULL${clause}${scopeFilter.clause}`,
      { replacements: allParams, type: QueryTypes.SELECT }
    );

    const items = await sequelize.query(
      `SELECT
         b.id, b.isbn, b.title, b.authors, b.publisher, b.edition,
         b.publication_year, b.category, b.language, b.book_type,
         b.total_copies, b.available_copies, b.shelf_location,
         b.price, b.acquired_date, b.condition_status,
         b.is_reference_only, b.book_image_url, b.digital_url,
         b.description, b.school_id, b.created_at, b.updated_at
       FROM library_books b
       WHERE b.deleted_at IS NULL${clause}${scopeFilter.clause}
       ORDER BY b.id DESC
       LIMIT ? OFFSET ?`,
      { replacements: [...allParams, limit, offset], type: QueryTypes.SELECT }
    );

    const total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;
    return { items, total, page: currentPage, pageSize: limit };
  }

  async findById(id, scope = {}) {
    const scopeFilter = this.buildScopeClause(scope);
    const rows = await sequelize.query(
      `SELECT
         b.id, b.isbn, b.title, b.authors, b.publisher, b.edition,
         b.publication_year, b.category, b.language, b.book_type,
         b.total_copies, b.available_copies, b.shelf_location,
         b.price, b.acquired_date, b.condition_status,
         b.is_reference_only, b.book_image_url, b.digital_url,
         b.description, b.school_id, b.created_at, b.updated_at
       FROM library_books b
       WHERE b.id = ? AND b.deleted_at IS NULL${scopeFilter.clause}`,
      { replacements: [id, ...scopeFilter.params], type: QueryTypes.SELECT }
    );
    if (!rows.length) throw new AppError('Book not found', 404);
    return rows[0];
  }

  async create(data, scope = {}) {
    const fields = [
      'isbn', 'title', 'authors', 'publisher', 'edition',
      'publication_year', 'category', 'language', 'book_type',
      'total_copies', 'available_copies', 'shelf_location',
      'price', 'acquired_date', 'condition_status',
      'is_reference_only', 'book_image_url', 'digital_url', 'description'
    ];
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

    const [result] = await sequelize.query(
      `INSERT INTO library_books (${columns.join(', ')})
       VALUES (${placeholders.join(', ')}) RETURNING *`,
      { replacements: values, type: QueryTypes.INSERT }
    );
    return result[0] || result;
  }

  async updateById(id, data, scope = {}) {
    const fields = [
      'isbn', 'title', 'authors', 'publisher', 'edition',
      'publication_year', 'category', 'language', 'book_type',
      'total_copies', 'available_copies', 'shelf_location',
      'price', 'acquired_date', 'condition_status',
      'is_reference_only', 'book_image_url', 'digital_url', 'description'
    ];
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
    const scopeFilter = this.buildScopeClause(scope);
    values.push(id, ...scopeFilter.params);

    const [, rowCount] = await sequelize.query(
      `UPDATE library_books SET ${setClauses.join(', ')}
       WHERE id = ? AND deleted_at IS NULL${scopeFilter.clause}`,
      { replacements: values, type: QueryTypes.UPDATE }
    );
    if (!rowCount) throw new AppError('Book not found', 404);
    return this.findById(id, scope);
  }

  async deleteById(id, scope = {}) {
    if (!id) throw new AppError('Invalid book identifier', 400);
    const scopeFilter = this.buildScopeClause(scope);

    const [, rowCount] = await sequelize.query(
      `UPDATE library_books SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = ? AND deleted_at IS NULL${scopeFilter.clause}`,
      { replacements: [id, ...scopeFilter.params], type: QueryTypes.UPDATE }
    );
    if (!rowCount) throw new AppError('Book not found', 404);
    return { message: 'Book deleted successfully' };
  }
}

module.exports = new BookRepository();
