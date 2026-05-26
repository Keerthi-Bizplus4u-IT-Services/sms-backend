const libraryTransactionService = require('../services/library-transaction.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { resolveSchoolIdFromRequest } = require('../utils/context');

const resolveScope = (req) => ({
  schoolId: resolveSchoolIdFromRequest(req)
});

class LibraryTransactionController {
  getTransactions = asyncHandler(async (req, res) => {
    const result = await libraryTransactionService.getTransactions(req.query, resolveScope(req));
    return success(res, result, 'Transactions retrieved successfully', 200);
  });

  getTransactionById = asyncHandler(async (req, res) => {
    const result = await libraryTransactionService.getTransactionById(parseInt(req.params.id, 10), resolveScope(req));
    return success(res, result, 'Transaction retrieved successfully', 200);
  });

  issueBook = asyncHandler(async (req, res) => {
    const data = {
      ...req.body,
      issued_by: req.user?.userId || req.user?.id
    };
    const result = await libraryTransactionService.issueBook(data, resolveScope(req));
    return success(res, result, 'Book issued successfully', 201);
  });

  returnBook = asyncHandler(async (req, res) => {
    const data = {
      ...req.body,
      returned_to: req.user?.userId || req.user?.id
    };
    const result = await libraryTransactionService.returnBook(parseInt(req.params.id, 10), data, resolveScope(req));
    return success(res, result, 'Book returned successfully', 200);
  });

  renewBook = asyncHandler(async (req, res) => {
    const result = await libraryTransactionService.renewBook(parseInt(req.params.id, 10), resolveScope(req));
    return success(res, result, 'Book renewed successfully', 200);
  });

  payFine = asyncHandler(async (req, res) => {
    const result = await libraryTransactionService.payFine(parseInt(req.params.id, 10), resolveScope(req));
    return success(res, result, 'Fine paid successfully', 200);
  });

  getOverdueBooks = asyncHandler(async (req, res) => {
    const result = await libraryTransactionService.getOverdueBooks(resolveScope(req));
    return success(res, result, 'Overdue books retrieved successfully', 200);
  });

  getBorrowerHistory = asyncHandler(async (req, res) => {
    const result = await libraryTransactionService.getBorrowerHistory(
      req.params.type, parseInt(req.params.id, 10), resolveScope(req)
    );
    return success(res, result, 'Borrower history retrieved successfully', 200);
  });

  calculateFinePreview = asyncHandler(async (req, res) => {
    const result = await libraryTransactionService.calculateFinePreview(parseInt(req.params.id, 10), resolveScope(req));
    return success(res, result, 'Fine preview calculated', 200);
  });
}

module.exports = new LibraryTransactionController();
