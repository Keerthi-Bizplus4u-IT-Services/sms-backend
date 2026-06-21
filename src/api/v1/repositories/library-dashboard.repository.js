const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

class LibraryDashboardRepository {
  async getSummary(scope = {}) {
    const schoolFilter = this._schoolFilter(scope);

    const [
      totalBooks,
      totalCopies,
      availableCopies,
      totalCategories,
      categoryBreakdown,
      issuedBooks,
      overdueBooks,
      recentTransactions,
      totalFinesCollected
    ] = await Promise.all([
      this._countBooks(schoolFilter),
      this._sumCopies(schoolFilter),
      this._sumAvailableCopies(schoolFilter),
      this._countCategories(schoolFilter),
      this._categoryBreakdown(schoolFilter),
      this._countByStatus('issued', schoolFilter),
      this._countOverdue(schoolFilter),
      this._recentTransactions(schoolFilter),
      this._totalFinesCollected(schoolFilter)
    ]);

    return {
      totalBooks,
      totalCopies,
      availableCopies,
      issuedCopies: totalCopies - availableCopies,
      totalCategories,
      categoryBreakdown,
      issuedBooks,
      overdueBooks,
      recentTransactions,
      totalFinesCollected
    };
  }

  _schoolFilter(scope) {
    if (Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
      return { clause: 'AND school_id = :schoolId', replacements: { schoolId: scope.schoolId } };
    }
    return { clause: '', replacements: {} };
  }

  async _countBooks(filter) {
    const rows = await sequelize.query(
      `SELECT COUNT(*) AS total FROM library_books WHERE deleted_at IS NULL ${filter.clause}`,
      { replacements: filter.replacements, type: QueryTypes.SELECT }
    );
    return toNumber(rows?.[0]?.total);
  }

  async _sumCopies(filter) {
    const rows = await sequelize.query(
      `SELECT COALESCE(SUM(total_copies), 0) AS total FROM library_books WHERE deleted_at IS NULL ${filter.clause}`,
      { replacements: filter.replacements, type: QueryTypes.SELECT }
    );
    return toNumber(rows?.[0]?.total);
  }

  async _sumAvailableCopies(filter) {
    const rows = await sequelize.query(
      `SELECT COALESCE(SUM(available_copies), 0) AS total FROM library_books WHERE deleted_at IS NULL ${filter.clause}`,
      { replacements: filter.replacements, type: QueryTypes.SELECT }
    );
    return toNumber(rows?.[0]?.total);
  }

  async _countCategories(filter) {
    const rows = await sequelize.query(
      `SELECT COUNT(DISTINCT category) AS total FROM library_books WHERE deleted_at IS NULL AND category IS NOT NULL AND category != '' ${filter.clause}`,
      { replacements: filter.replacements, type: QueryTypes.SELECT }
    );
    return toNumber(rows?.[0]?.total);
  }

  async _categoryBreakdown(filter) {
    const rows = await sequelize.query(
      `SELECT COALESCE(category, 'Uncategorized') AS category,
              COUNT(*) AS book_count,
              COALESCE(SUM(total_copies), 0) AS total_copies,
              COALESCE(SUM(available_copies), 0) AS available_copies
       FROM library_books
       WHERE deleted_at IS NULL ${filter.clause}
       GROUP BY category
       ORDER BY book_count DESC
       LIMIT 20`,
      { replacements: filter.replacements, type: QueryTypes.SELECT }
    );
    return rows.map(r => ({
      category: r.category || 'Uncategorized',
      bookCount: toNumber(r.book_count),
      totalCopies: toNumber(r.total_copies),
      availableCopies: toNumber(r.available_copies)
    }));
  }

  async _countByStatus(status, filter) {
    const rows = await sequelize.query(
      `SELECT COUNT(*) AS total FROM library_transactions WHERE status = :status ${filter.clause}`,
      { replacements: { status, ...filter.replacements }, type: QueryTypes.SELECT }
    );
    return toNumber(rows?.[0]?.total);
  }

  async _countOverdue(filter) {
    const rows = await sequelize.query(
      `SELECT COUNT(*) AS total FROM library_transactions
       WHERE status IN ('issued', 'overdue') AND due_date < CURRENT_DATE ${filter.clause}`,
      { replacements: filter.replacements, type: QueryTypes.SELECT }
    );
    return toNumber(rows?.[0]?.total);
  }

  async _recentTransactions(filter) {
    const rows = await sequelize.query(
      `SELECT t.id, t.status, t.issue_date, t.due_date, t.return_date,
              t.borrower_type, t.fine_amount,
              b.title AS book_title
       FROM library_transactions t
       JOIN library_books b ON b.id = t.book_id
       WHERE 1=1 ${filter.clause.replace(/school_id/g, 't.school_id')}
       ORDER BY t.created_at DESC
       LIMIT 10`,
      { replacements: filter.replacements, type: QueryTypes.SELECT }
    );
    return rows.map(r => ({
      id: r.id,
      bookTitle: r.book_title,
      borrowerType: r.borrower_type,
      status: r.status,
      issueDate: r.issue_date,
      dueDate: r.due_date,
      returnDate: r.return_date,
      fineAmount: toNumber(r.fine_amount)
    }));
  }

  async _totalFinesCollected(filter) {
    const rows = await sequelize.query(
      `SELECT COALESCE(SUM(fine_amount), 0) AS total
       FROM library_transactions
       WHERE fine_paid = TRUE ${filter.clause}`,
      { replacements: filter.replacements, type: QueryTypes.SELECT }
    );
    return toNumber(rows?.[0]?.total);
  }
}

module.exports = new LibraryDashboardRepository();
