const expenseService = require('../services/expense.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { parsePositiveInt, resolveSchoolIdFromRequest } = require('../utils/context');

const resolveExpenseScope = (req) => ({
  schoolId: resolveSchoolIdFromRequest(req),
  branchId: parsePositiveInt(req?.query?.branchId) || parsePositiveInt(req?.query?.branch_id)
});

class ExpenseController {
  getExpenses = asyncHandler(async (req, res) => {
    const result = await expenseService.getExpenses(req.query, resolveExpenseScope(req));
    return success(res, result, 'Expenses retrieved successfully', 200);
  });

  createExpense = asyncHandler(async (req, res) => {
    const result = await expenseService.createExpense(req.body, resolveExpenseScope(req));
    return success(res, result, 'Expense added successfully', 201);
  });

  deleteExpense = asyncHandler(async (req, res) => {
    await expenseService.deleteExpense(req.params.eid);
    return success(res, null, 'Expense deleted successfully', 200);
  });
}

module.exports = new ExpenseController();
