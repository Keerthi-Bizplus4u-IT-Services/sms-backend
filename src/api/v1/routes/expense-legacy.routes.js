const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const { createExpenseValidator } = require('../validators/expense.validator');
const { validate } = require('../../../middleware/validation.middleware');

router.post(
  '/add-expense',
  authenticate,
  enforceTenant(),
  requirePermission('expenses:write'),
  createExpenseValidator,
  validate,
  expenseController.createExpense
);

module.exports = router;
