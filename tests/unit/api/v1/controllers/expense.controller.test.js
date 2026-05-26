jest.mock('../../../../../src/api/v1/services/expense.service', () => ({
  getExpenses: jest.fn(),
  createExpense: jest.fn(),
  deleteExpense: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  resolveSchoolIdFromRequest: jest.fn(),
  parsePositiveInt: jest.fn(() => null)
}));

const expenseController = require('../../../../../src/api/v1/controllers/expense.controller');
const expenseService = require('../../../../../src/api/v1/services/expense.service');
const { success } = require('../../../../../src/utils/response');
const { resolveSchoolIdFromRequest } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('ExpenseController', () => {
  let req, res, next;
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    resolveSchoolIdFromRequest.mockReturnValue(1);
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
    req.query = {};
  });
  describe('getExpenses', () => {
    it('should retrieve expenses with scope', async () => {
      req.query = { page: '1' };
      expenseService.getExpenses.mockResolvedValue({ expenses: [] });
      await expenseController.getExpenses(req, res, next);
      expect(expenseService.getExpenses).toHaveBeenCalledWith(req.query, expect.objectContaining({ schoolId: 1 }));
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'Expenses retrieved successfully', 200);
    });
  });
  describe('createExpense', () => {
    it('should create expense', async () => {
      req.body = { amount: 1000, description: 'Supplies' };
      expenseService.createExpense.mockResolvedValue({ id: 1 });
      await expenseController.createExpense(req, res, next);
      expect(expenseService.createExpense).toHaveBeenCalledWith(req.body, expect.objectContaining({ schoolId: 1 }));
      expect(success).toHaveBeenCalledWith(res, { id: 1 }, 'Expense added successfully', 201);
    });
  });
  describe('deleteExpense', () => {
    it('should delete expense by eid (no scope)', async () => {
      req.params = { eid: '5' };
      expenseService.deleteExpense.mockResolvedValue(null);
      await expenseController.deleteExpense(req, res, next);
      expect(expenseService.deleteExpense).toHaveBeenCalledWith('5');
      expect(success).toHaveBeenCalledWith(res, null, 'Expense deleted successfully', 200);
    });
  });
});
