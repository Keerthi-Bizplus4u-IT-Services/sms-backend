const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const { getExpensesValidator, expenseIdValidator, createExpenseValidator } = require('../validators/expense.validator');
const { validate } = require('../../../middleware/validation.middleware');

router.get(
  '/',
  authenticate,
  enforceTenant(),
  requirePermission('expenses:read'),
  getExpensesValidator,
  validate,
  expenseController.getExpenses
);

router.post(
  '/',
  authenticate,
  enforceTenant(),
  requirePermission('expenses:write'),
  createExpenseValidator,
  validate,
  expenseController.createExpense
);

router.delete(
  '/:eid',
  authenticate,
  enforceTenant(),
  requirePermission('expenses:delete'),
  expenseIdValidator,
  validate,
  expenseController.deleteExpense
);

module.exports = router;
