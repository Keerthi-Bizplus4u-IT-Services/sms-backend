jest.mock('../../../../../src/api/v1/services/book.service', () => ({
  getBooks: jest.fn(),
  getBookById: jest.fn(),
  createBook: jest.fn(),
  updateBook: jest.fn(),
  deleteBook: jest.fn(),
  getBookCopies: jest.fn(),
  addBookCopy: jest.fn(),
  deleteBookCopy: jest.fn(),
  findCopyByBarcode: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  resolveSchoolIdFromRequest: jest.fn()
}));

const bookController = require('../../../../../src/api/v1/controllers/book.controller');
const bookService = require('../../../../../src/api/v1/services/book.service');
const { success } = require('../../../../../src/utils/response');
const { resolveSchoolIdFromRequest } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('BookController', () => {
  let req, res, next;
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    resolveSchoolIdFromRequest.mockReturnValue(1);
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });
  describe('getBooks', () => {
    it('should retrieve books', async () => {
      req.query = { page: '1', limit: '10' };
      bookService.getBooks.mockResolvedValue({ books: [] });
      await bookController.getBooks(req, res, next);
      expect(bookService.getBooks).toHaveBeenCalledWith(req.query, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'Books retrieved successfully', 200);
    });
  });
  describe('getBookById', () => {
    it('should get book by parseInt ID', async () => {
      req.params = { id: '1' };
      bookService.getBookById.mockResolvedValue({ id: 1 });
      await bookController.getBookById(req, res, next);
      expect(bookService.getBookById).toHaveBeenCalledWith(1, { schoolId: 1 });
    });
  });
  describe('createBook', () => {
    it('should create book', async () => {
      req.body = { title: 'New Book', isbn: '978-0-1234-5678-9' };
      bookService.createBook.mockResolvedValue({ id: 1 });
      await bookController.createBook(req, res, next);
      expect(bookService.createBook).toHaveBeenCalledWith(req.body, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, { id: 1 }, 'Book created successfully', 201);
    });
  });
  describe('deleteBook', () => {
    it('should delete book with parseInt ID', async () => {
      req.params = { id: '1' };
      bookService.deleteBook.mockResolvedValue(null);
      await bookController.deleteBook(req, res, next);
      expect(bookService.deleteBook).toHaveBeenCalledWith(1, { schoolId: 1 });
    });
  });
  describe('findByBarcode', () => {
    it('should find book copy by barcode', async () => {
      req.params = { barcode: 'LIB-001' };
      bookService.findCopyByBarcode.mockResolvedValue({ id: 1, barcode: 'LIB-001' });
      await bookController.findByBarcode(req, res, next);
      expect(bookService.findCopyByBarcode).toHaveBeenCalledWith('LIB-001', { schoolId: 1 });
    });
  });
  describe('addBookCopy', () => {
    it('should add book copy', async () => {
      req.params = { id: '1' };
      req.body = { barcode: 'LIB-002' };
      bookService.addBookCopy.mockResolvedValue({ id: 2 });
      await bookController.addBookCopy(req, res, next);
      expect(bookService.addBookCopy).toHaveBeenCalledWith(1, req.body, { schoolId: 1 });
    });
  });
});
