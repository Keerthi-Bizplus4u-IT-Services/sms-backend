const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { AppError } = require('../../../middleware/error.middleware');

class LibraryTransactionRepository {
  buildScopeClause(scope = {}, alias = 't') {
    const parts = [];
    const params = [];
    if (Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
      parts.push(`AND ${alias}.school_id = ?`);
      params.push(scope.schoolId);
    }
    return { clause: parts.join(' '), params };
  }

  normalizePagination(page = 0, pageSize = 20) {
    const limit = Math.max(1, Math.min(parseInt(pageSize, 10) || 20, 100));
    const currentPage = Math.max(0, parseInt(page, 10) || 0);
    const offset = currentPage * limit;
    return { limit, offset, currentPage };
  }

  async findAll({ page = 0, pageSize = 20, filters = {} }, scope = {}) {
    const scopeFilter = this.buildScopeClause(scope);
    const clauses = [];
    const params = [];

    if (filters.status) {
      clauses.push('AND t.status = ?');
      params.push(filters.status);
    }
    if (filters.borrower_type) {
      clauses.push('AND t.borrower_type = ?');
      params.push(filters.borrower_type);
    }
    if (filters.book_id) {
      clauses.push('AND t.book_id = ?');
      params.push(parseInt(filters.book_id, 10));
    }

    const filterClause = clauses.join(' ');
    const allParams = [...params, ...scopeFilter.params];
    const { limit, offset, currentPage } = this.normalizePagination(page, pageSize);

    const countRows = await sequelize.query(
      `SELECT COUNT(*) AS total FROM library_transactions t
       WHERE 1=1${filterClause}${scopeFilter.clause}`,
      { replacements: allParams, type: QueryTypes.SELECT }
    );

    const items = await sequelize.query(
      `SELECT t.id, t.book_id, t.copy_id, t.borrower_type, t.borrower_id,
              t.issue_date, t.due_date, t.return_date,
              t.fine_amount, t.fine_paid, t.fine_paid_date,
              t.renewed_count, t.max_renewals, t.status,
              t.issued_by, t.returned_to, t.remarks,
              t.school_id, t.created_at, t.updated_at,
              b.title AS book_title, b.isbn AS book_isbn,
              c.accession_number, c.barcode AS copy_barcode
       FROM library_transactions t
       JOIN library_books b ON b.id = t.book_id
       LEFT JOIN library_book_copies c ON c.id = t.copy_id
       WHERE 1=1${filterClause}${scopeFilter.clause}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      { replacements: [...allParams, limit, offset], type: QueryTypes.SELECT }
    );

    const total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;
    return { items, total, page: currentPage, pageSize: limit };
  }

  async findById(id, scope = {}) {
    const scopeFilter = this.buildScopeClause(scope);
    const rows = await sequelize.query(
      `SELECT t.*, b.title AS book_title, b.isbn AS book_isbn,
              c.accession_number, c.barcode AS copy_barcode
       FROM library_transactions t
       JOIN library_books b ON b.id = t.book_id
       LEFT JOIN library_book_copies c ON c.id = t.copy_id
       WHERE t.id = ?${scopeFilter.clause}`,
      { replacements: [id, ...scopeFilter.params], type: QueryTypes.SELECT }
    );
    if (!rows.length) throw new AppError('Transaction not found', 404);
    return rows[0];
  }

  async countActiveByBorrower(borrowerType, borrowerId, scope = {}) {
    const scopeFilter = this.buildScopeClause(scope);
    const rows = await sequelize.query(
      `SELECT COUNT(*) AS total FROM library_transactions
       WHERE borrower_type = ? AND borrower_id = ?
         AND status IN ('issued', 'overdue')${scopeFilter.clause}`,
      { replacements: [borrowerType, borrowerId, ...scopeFilter.params], type: QueryTypes.SELECT }
    );
    return Number(rows[0]?.total || 0);
  }

  async issueBook(data, scope = {}) {
    const transaction = await sequelize.transaction();
    try {
      const columns = [
        'book_id', 'copy_id', 'borrower_type', 'borrower_id',
        'issue_date', 'due_date', 'max_renewals', 'status', 'issued_by'
      ];
      const values = [
        data.book_id, data.copy_id, data.borrower_type, data.borrower_id,
        data.issue_date, data.due_date, data.max_renewals || 2, 'issued', data.issued_by
      ];

      if (data.remarks) {
        columns.push('remarks');
        values.push(data.remarks);
      }
      if (Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
        columns.push('school_id');
        values.push(scope.schoolId);
      }

      const placeholders = columns.map(() => '?').join(', ');
      const [result] = await sequelize.query(
        `INSERT INTO library_transactions (${columns.join(', ')})
         VALUES (${placeholders}) RETURNING *`,
        { replacements: values, type: QueryTypes.INSERT, transaction }
      );

      // Mark copy as unavailable
      if (data.copy_id) {
        await sequelize.query(
          `UPDATE library_book_copies
           SET is_available = FALSE, current_borrower_type = ?, current_borrower_id = ?, updated_at = NOW()
           WHERE id = ?`,
          { replacements: [data.borrower_type, data.borrower_id, data.copy_id], type: QueryTypes.UPDATE, transaction }
        );
      }

      // Decrement available_copies
      await sequelize.query(
        `UPDATE library_books SET available_copies = GREATEST(0, available_copies - 1), updated_at = NOW()
         WHERE id = ?`,
        { replacements: [data.book_id], type: QueryTypes.UPDATE, transaction }
      );

      await transaction.commit();
      return result[0] || result;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async returnBook(id, returnData, scope = {}) {
    const transaction = await sequelize.transaction();
    try {
      const txn = await this.findById(id, scope);
      if (txn.status === 'returned') {
        throw new AppError('Book has already been returned', 409);
      }

      // Update transaction
      await sequelize.query(
        `UPDATE library_transactions
         SET return_date = ?, fine_amount = ?, status = 'returned',
             returned_to = ?, remarks = COALESCE(?, remarks), updated_at = NOW()
         WHERE id = ?`,
        {
          replacements: [
            returnData.return_date, returnData.fine_amount || 0,
            returnData.returned_to, returnData.remarks || null, id
          ],
          type: QueryTypes.UPDATE, transaction
        }
      );

      // Mark copy as available
      if (txn.copy_id) {
        await sequelize.query(
          `UPDATE library_book_copies
           SET is_available = TRUE, current_borrower_type = NULL, current_borrower_id = NULL, updated_at = NOW()
           WHERE id = ?`,
          { replacements: [txn.copy_id], type: QueryTypes.UPDATE, transaction }
        );
      }

      // Increment available_copies
      await sequelize.query(
        `UPDATE library_books
         SET available_copies = LEAST(total_copies, available_copies + 1), updated_at = NOW()
         WHERE id = ?`,
        { replacements: [txn.book_id], type: QueryTypes.UPDATE, transaction }
      );

      await transaction.commit();
      return this.findById(id, scope);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async renewBook(id, newDueDate, scope = {}) {
    const txn = await this.findById(id, scope);
    if (txn.status !== 'issued' && txn.status !== 'overdue') {
      throw new AppError('Only issued or overdue books can be renewed', 400);
    }
    if (txn.renewed_count >= txn.max_renewals) {
      throw new AppError(`Maximum renewals (${txn.max_renewals}) reached`, 400);
    }

    await sequelize.query(
      `UPDATE library_transactions
       SET due_date = ?, renewed_count = renewed_count + 1, status = 'issued', updated_at = NOW()
       WHERE id = ?`,
      { replacements: [newDueDate, id], type: QueryTypes.UPDATE }
    );
    return this.findById(id, scope);
  }

  async payFine(id, scope = {}) {
    const txn = await this.findById(id, scope);
    if (txn.fine_paid) {
      throw new AppError('Fine has already been paid', 409);
    }
    if (parseFloat(txn.fine_amount) <= 0) {
      throw new AppError('No fine to pay', 400);
    }

    await sequelize.query(
      `UPDATE library_transactions
       SET fine_paid = TRUE, fine_paid_date = CURRENT_DATE, updated_at = NOW()
       WHERE id = ?`,
      { replacements: [id], type: QueryTypes.UPDATE }
    );
    return this.findById(id, scope);
  }

  async findOverdue(scope = {}) {
    const scopeFilter = this.buildScopeClause(scope);
    return sequelize.query(
      `SELECT t.id, t.book_id, t.copy_id, t.borrower_type, t.borrower_id,
              t.issue_date, t.due_date, t.fine_amount, t.renewed_count,
              t.status, t.school_id,
              b.title AS book_title, b.isbn AS book_isbn,
              c.accession_number, c.barcode AS copy_barcode,
              (CURRENT_DATE - t.due_date) AS days_overdue
       FROM library_transactions t
       JOIN library_books b ON b.id = t.book_id
       LEFT JOIN library_book_copies c ON c.id = t.copy_id
       WHERE t.status IN ('issued', 'overdue') AND t.due_date < CURRENT_DATE${scopeFilter.clause}
       ORDER BY t.due_date ASC`,
      { replacements: [...scopeFilter.params], type: QueryTypes.SELECT }
    );
  }

  async findByBorrower(borrowerType, borrowerId, scope = {}) {
    const scopeFilter = this.buildScopeClause(scope);
    return sequelize.query(
      `SELECT t.*, b.title AS book_title, b.isbn AS book_isbn,
              c.accession_number, c.barcode AS copy_barcode
       FROM library_transactions t
       JOIN library_books b ON b.id = t.book_id
       LEFT JOIN library_book_copies c ON c.id = t.copy_id
       WHERE t.borrower_type = ? AND t.borrower_id = ?${scopeFilter.clause}
       ORDER BY t.created_at DESC`,
      { replacements: [borrowerType, borrowerId, ...scopeFilter.params], type: QueryTypes.SELECT }
    );
  }
}

module.exports = new LibraryTransactionRepository();
