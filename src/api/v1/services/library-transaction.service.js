const libraryTransactionRepository = require('../repositories/library-transaction.repository');
const librarySettingsRepository = require('../repositories/library-settings.repository');
const bookCopyRepository = require('../repositories/book-copy.repository');
const bookRepository = require('../repositories/book.repository');
const { calculateFine, DEFAULT_FINE_RULES } = require('../utils/fine-calculator');
const { AppError } = require('../../../middleware/error.middleware');

class LibraryTransactionService {
  async getTransactions(query = {}, scope = {}) {
    const { page, pageSize, ...filters } = query;
    return libraryTransactionRepository.findAll({ page, pageSize, filters }, scope);
  }

  async getTransactionById(id, scope = {}) {
    return libraryTransactionRepository.findById(id, scope);
  }

  async issueBook(data, scope = {}) {
    const { copy_id, borrower_type, borrower_id, issued_by, remarks } = data;

    // Get copy and verify availability
    const copy = await bookCopyRepository.findById(copy_id, scope);
    if (!copy.is_available) {
      throw new AppError('This copy is not available for lending', 409);
    }

    // Check the book is not reference-only
    const book = await bookRepository.findById(copy.book_id, scope);
    if (book.is_reference_only) {
      throw new AppError('Reference-only books cannot be issued', 400);
    }

    // Check lending limit
    const settings = await librarySettingsRepository.findByBorrowerType(borrower_type, scope);
    const maxBooks = settings?.max_books_allowed || 3;
    const activeCount = await libraryTransactionRepository.countActiveByBorrower(borrower_type, borrower_id, scope);
    if (activeCount >= maxBooks) {
      throw new AppError(`Lending limit reached. Maximum ${maxBooks} books allowed for ${borrower_type}`, 400);
    }

    // Calculate due date from settings
    const issueDays = settings?.default_issue_days || 14;
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + issueDays);

    const maxRenewals = settings?.max_renewals || 2;

    return libraryTransactionRepository.issueBook({
      book_id: copy.book_id,
      copy_id,
      borrower_type,
      borrower_id,
      issue_date: issueDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      max_renewals: maxRenewals,
      issued_by,
      remarks
    }, scope);
  }

  async returnBook(id, data, scope = {}) {
    const txn = await libraryTransactionRepository.findById(id, scope);

    const returnDate = data.return_date || new Date().toISOString().split('T')[0];

    // Calculate fine
    const fineRules = await this._getFineRules(txn.borrower_type, scope);
    const { fineAmount } = calculateFine(txn.due_date, returnDate, fineRules);

    return libraryTransactionRepository.returnBook(id, {
      return_date: returnDate,
      fine_amount: fineAmount,
      returned_to: data.returned_to,
      remarks: data.remarks
    }, scope);
  }

  async renewBook(id, scope = {}) {
    const txn = await libraryTransactionRepository.findById(id, scope);
    const settings = await librarySettingsRepository.findByBorrowerType(txn.borrower_type, scope);
    const issueDays = settings?.default_issue_days || 14;

    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + issueDays);

    return libraryTransactionRepository.renewBook(id, newDueDate.toISOString().split('T')[0], scope);
  }

  async payFine(id, scope = {}) {
    return libraryTransactionRepository.payFine(id, scope);
  }

  async getOverdueBooks(scope = {}) {
    return libraryTransactionRepository.findOverdue(scope);
  }

  async getBorrowerHistory(borrowerType, borrowerId, scope = {}) {
    return libraryTransactionRepository.findByBorrower(borrowerType, borrowerId, scope);
  }

  async calculateFinePreview(id, scope = {}) {
    const txn = await libraryTransactionRepository.findById(id, scope);
    const returnDate = new Date().toISOString().split('T')[0];
    const fineRules = await this._getFineRules(txn.borrower_type, scope);
    return calculateFine(txn.due_date, returnDate, fineRules);
  }

  async _getFineRules(borrowerType, scope = {}) {
    try {
      const rules = await librarySettingsRepository.getFineRules(borrowerType, scope);
      if (rules && rules.length > 0) return rules;
    } catch (_) {
      // Fall through to defaults
    }
    return DEFAULT_FINE_RULES[borrowerType] || DEFAULT_FINE_RULES.student;
  }
}

module.exports = new LibraryTransactionService();
