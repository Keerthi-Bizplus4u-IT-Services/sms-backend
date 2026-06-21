const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const { getExpensesValidator, expenseIdValidator, createExpenseValidator } = require('../validators/expense.validator');
const { validate } = require('../../../middleware/validation.middleware');

router.get(
  '/',
  authenticate,
  requirePermission('expenses:read'),
  getExpensesValidator,
  validate,
  expenseController.getExpenses
);

router.post(
  '/',
  authenticate,
  requirePermission('expenses:read'),
  createExpenseValidator,
  validate,
  expenseController.createExpense
);

router.delete(
  '/:eid',
  authenticate,
  requirePermission('expenses:delete'),
  expenseIdValidator,
  validate,
  expenseController.deleteExpense
);

module.exports = router;
