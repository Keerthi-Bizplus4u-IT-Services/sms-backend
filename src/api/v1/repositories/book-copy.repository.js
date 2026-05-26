const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { AppError } = require('../../../middleware/error.middleware');

class BookCopyRepository {
  buildScopeClause(scope = {}, alias = 'c') {
    const parts = [];
    const params = [];
    if (Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
      parts.push(`AND ${alias}.school_id = ?`);
      params.push(scope.schoolId);
    }
    return { clause: parts.join(' '), params };
  }

  async findByBookId(bookId, scope = {}) {
    const scopeFilter = this.buildScopeClause(scope);
    return sequelize.query(
      `SELECT c.id, c.book_id, c.accession_number, c.barcode, c.copy_number,
              c.purchase_date, c.purchase_price, c.vendor, c.condition_status,
              c.is_available, c.current_borrower_type, c.current_borrower_id,
              c.shelf_location, c.remarks, c.school_id, c.created_at, c.updated_at
       FROM library_book_copies c
       WHERE c.book_id = ?${scopeFilter.clause}
       ORDER BY c.copy_number ASC`,
      { replacements: [bookId, ...scopeFilter.params], type: QueryTypes.SELECT }
    );
  }

  async findById(id, scope = {}) {
    const scopeFilter = this.buildScopeClause(scope);
    const rows = await sequelize.query(
      `SELECT c.id, c.book_id, c.accession_number, c.barcode, c.copy_number,
              c.purchase_date, c.purchase_price, c.vendor, c.condition_status,
              c.is_available, c.current_borrower_type, c.current_borrower_id,
              c.shelf_location, c.remarks, c.school_id, c.created_at, c.updated_at
       FROM library_book_copies c
       WHERE c.id = ?${scopeFilter.clause}`,
      { replacements: [id, ...scopeFilter.params], type: QueryTypes.SELECT }
    );
    if (!rows.length) throw new AppError('Book copy not found', 404);
    return rows[0];
  }

  async findByBarcode(barcode, scope = {}) {
    const scopeFilter = this.buildScopeClause(scope);
    const rows = await sequelize.query(
      `SELECT c.*, b.title AS book_title, b.isbn AS book_isbn, b.authors AS book_authors
       FROM library_book_copies c
       JOIN library_books b ON b.id = c.book_id AND b.deleted_at IS NULL
       WHERE c.barcode = ?${scopeFilter.clause}`,
      { replacements: [barcode, ...scopeFilter.params], type: QueryTypes.SELECT }
    );
    if (!rows.length) throw new AppError('Book copy not found for this barcode', 404);
    return rows[0];
  }

  async generateAccessionNumber() {
    const rows = await sequelize.query(
      `SELECT nextval('library_accession_seq') AS seq`,
      { type: QueryTypes.SELECT }
    );
    const seq = String(rows[0].seq).padStart(5, '0');
    const year = new Date().getFullYear();
    return `ACC-${year}-${seq}`;
  }

  generateBarcode(isbn, copyNumber) {
    const base = isbn || 'NOISBN';
    return `${base}-C${String(copyNumber).padStart(3, '0')}`;
  }

  async create(data, scope = {}) {
    const accessionNumber = data.accession_number || await this.generateAccessionNumber();
    const barcode = data.barcode || this.generateBarcode(data.isbn, data.copy_number);

    const columns = [
      'book_id', 'accession_number', 'barcode', 'copy_number',
      'purchase_date', 'purchase_price', 'vendor', 'condition_status',
      'is_available', 'shelf_location', 'remarks'
    ];
    const values = [
      data.book_id, accessionNumber, barcode, data.copy_number || 1,
      data.purchase_date || null, data.purchase_price || null,
      data.vendor || null, data.condition_status || 'new',
      data.is_available !== undefined ? data.is_available : true,
      data.shelf_location || null, data.remarks || null
    ];

    if (Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
      columns.push('school_id');
      values.push(scope.schoolId);
    }

    const placeholders = columns.map(() => '?').join(', ');
    const [result] = await sequelize.query(
      `INSERT INTO library_book_copies (${columns.join(', ')})
       VALUES (${placeholders}) RETURNING *`,
      { replacements: values, type: QueryTypes.INSERT }
    );
    return result[0] || result;
  }

  async createBulk(bookId, count, bookData, scope = {}) {
    const copies = [];
    for (let i = 1; i <= count; i++) {
      const copy = await this.create({
        book_id: bookId,
        copy_number: i,
        isbn: bookData.isbn,
        purchase_date: bookData.acquired_date,
        purchase_price: bookData.price,
        shelf_location: bookData.shelf_location,
        condition_status: 'new'
      }, scope);
      copies.push(copy);
    }
    return copies;
  }

  async updateById(id, data, scope = {}) {
    const fields = [
      'condition_status', 'is_available', 'shelf_location', 'remarks',
      'purchase_date', 'purchase_price', 'vendor',
      'current_borrower_type', 'current_borrower_id'
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
      `UPDATE library_book_copies SET ${setClauses.join(', ')}
       WHERE id = ?${scopeFilter.clause}`,
      { replacements: values, type: QueryTypes.UPDATE }
    );
    if (!rowCount) throw new AppError('Book copy not found', 404);
    return this.findById(id, scope);
  }

  async deleteById(id, scope = {}) {
    if (!id) throw new AppError('Invalid copy identifier', 400);
    const scopeFilter = this.buildScopeClause(scope);

    // Check if copy is currently issued
    const copy = await this.findById(id, scope);
    if (!copy.is_available) {
      throw new AppError('Cannot delete a copy that is currently issued', 409);
    }

    const [, rowCount] = await sequelize.query(
      `DELETE FROM library_book_copies WHERE id = ?${scopeFilter.clause}`,
      { replacements: [id, ...scopeFilter.params], type: QueryTypes.DELETE }
    );
    if (!rowCount) throw new AppError('Book copy not found', 404);
    return { message: 'Book copy deleted successfully' };
  }

  async countByBookId(bookId, scope = {}) {
    const scopeFilter = this.buildScopeClause(scope);
    const rows = await sequelize.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN is_available = TRUE THEN 1 ELSE 0 END) AS available
       FROM library_book_copies
       WHERE book_id = ?${scopeFilter.clause}`,
      { replacements: [bookId, ...scopeFilter.params], type: QueryTypes.SELECT }
    );
    return {
      total: Number(rows[0]?.total || 0),
      available: Number(rows[0]?.available || 0)
    };
  }
}

module.exports = new BookCopyRepository();
