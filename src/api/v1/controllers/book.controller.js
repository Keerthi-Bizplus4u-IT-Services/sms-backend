const bookService = require('../services/book.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { resolveSchoolIdFromRequest } = require('../utils/context');

const resolveBookScope = (req) => ({
  schoolId: resolveSchoolIdFromRequest(req)
});

class BookController {
  getBooks = asyncHandler(async (req, res) => {
    const result = await bookService.getBooks(req.query, resolveBookScope(req));
    return success(res, result, 'Books retrieved successfully', 200);
  });

  getBookById = asyncHandler(async (req, res) => {
    const result = await bookService.getBookById(parseInt(req.params.id, 10), resolveBookScope(req));
    return success(res, result, 'Book retrieved successfully', 200);
  });

  createBook = asyncHandler(async (req, res) => {
    const result = await bookService.createBook(req.body, resolveBookScope(req));
    return success(res, result, 'Book created successfully', 201);
  });

  updateBook = asyncHandler(async (req, res) => {
    const result = await bookService.updateBook(parseInt(req.params.id, 10), req.body, resolveBookScope(req));
    return success(res, result, 'Book updated successfully', 200);
  });

  deleteBook = asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id || req.params.bid, 10);
    await bookService.deleteBook(id, resolveBookScope(req));
    return success(res, null, 'Book deleted successfully', 200);
  });

  // Copy endpoints
  getBookCopies = asyncHandler(async (req, res) => {
    const result = await bookService.getBookCopies(parseInt(req.params.id, 10), resolveBookScope(req));
    return success(res, result, 'Book copies retrieved successfully', 200);
  });

  addBookCopy = asyncHandler(async (req, res) => {
    const result = await bookService.addBookCopy(parseInt(req.params.id, 10), req.body, resolveBookScope(req));
    return success(res, result, 'Book copy added successfully', 201);
  });

  updateBookCopy = asyncHandler(async (req, res) => {
    const result = await bookService.updateBookCopy(parseInt(req.params.copyId, 10), req.body, resolveBookScope(req));
    return success(res, result, 'Book copy updated successfully', 200);
  });

  deleteBookCopy = asyncHandler(async (req, res) => {
    await bookService.deleteBookCopy(parseInt(req.params.copyId, 10), resolveBookScope(req));
    return success(res, null, 'Book copy deleted successfully', 200);
  });

  findByBarcode = asyncHandler(async (req, res) => {
    const result = await bookService.findCopyByBarcode(req.params.barcode, resolveBookScope(req));
    return success(res, result, 'Book copy found', 200);
  });
}

module.exports = new BookController();
