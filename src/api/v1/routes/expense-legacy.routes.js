const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const { createExpenseValidator } = require('../validators/expense.validator');
const { validate } = require('../../../middleware/validation.middleware');

router.post(
  '/add-expense',
  authenticate,
  requirePermission('expenses:read'),
  createExpenseValidator,
  validate,
  expenseController.createExpense
);

module.exports = router;
