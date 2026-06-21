jest.mock('../../../../../src/api/v1/services/library-transaction.service', () => ({
  getTransactions: jest.fn(),
  getTransactionById: jest.fn(),
  issueBook: jest.fn(),
  returnBook: jest.fn(),
  renewBook: jest.fn(),
  payFine: jest.fn(),
  getOverdueBooks: jest.fn(),
  getBorrowerHistory: jest.fn(),
  calculateFinePreview: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  resolveSchoolIdFromRequest: jest.fn()
}));

const libTxnCtrl = require('../../../../../src/api/v1/controllers/library-transaction.controller');
const libTxnSvc = require('../../../../../src/api/v1/services/library-transaction.service');
const { success } = require('../../../../../src/utils/response');
const { resolveSchoolIdFromRequest } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('LibraryTransactionController', () => {
  let req, res, next;
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    resolveSchoolIdFromRequest.mockReturnValue(1);
    req.user = { id: 1, userId: 1, roleName: 'admin', schoolId: 1 };
  });
  describe('getTransactions', () => {
    it('should retrieve transactions', async () => {
      req.query = { page: '1' };
      libTxnSvc.getTransactions.mockResolvedValue({ transactions: [] });
      await libTxnCtrl.getTransactions(req, res, next);
      expect(libTxnSvc.getTransactions).toHaveBeenCalledWith(req.query, { schoolId: 1 });
    });
  });
  describe('issueBook', () => {
    it('should issue book with issued_by from user', async () => {
      req.body = { book_copy_id: 1, borrower_id: 5 };
      libTxnSvc.issueBook.mockResolvedValue({ id: 1 });
      await libTxnCtrl.issueBook(req, res, next);
      expect(libTxnSvc.issueBook).toHaveBeenCalledWith(expect.objectContaining({ book_copy_id: 1, issued_by: 1 }), { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'Book issued successfully', 201);
    });
  });
  describe('returnBook', () => {
    it('should return book with parseInt ID', async () => {
      req.params = { id: '1' };
      req.body = { condition: 'good' };
      libTxnSvc.returnBook.mockResolvedValue({ id: 1 });
      await libTxnCtrl.returnBook(req, res, next);
      expect(libTxnSvc.returnBook).toHaveBeenCalledWith(1, expect.objectContaining({ condition: 'good', returned_to: 1 }), { schoolId: 1 });
    });
  });
  describe('renewBook', () => {
    it('should renew book', async () => {
      req.params = { id: '1' };
      libTxnSvc.renewBook.mockResolvedValue({ id: 1 });
      await libTxnCtrl.renewBook(req, res, next);
      expect(libTxnSvc.renewBook).toHaveBeenCalledWith(1, { schoolId: 1 });
    });
  });
  describe('getOverdueBooks', () => {
    it('should get overdue books', async () => {
      libTxnSvc.getOverdueBooks.mockResolvedValue([]);
      await libTxnCtrl.getOverdueBooks(req, res, next);
      expect(libTxnSvc.getOverdueBooks).toHaveBeenCalledWith({ schoolId: 1 });
    });
  });
  describe('calculateFinePreview', () => {
    it('should calculate fine', async () => {
      req.params = { id: '1' };
      libTxnSvc.calculateFinePreview.mockResolvedValue({ fine: 50 });
      await libTxnCtrl.calculateFinePreview(req, res, next);
      expect(libTxnSvc.calculateFinePreview).toHaveBeenCalledWith(1, { schoolId: 1 });
    });
  });
});
