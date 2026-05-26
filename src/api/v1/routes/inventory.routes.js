const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const { getInventoryValidator, inventoryIdValidator, createInventoryValidator, updateInventoryValidator } = require('../validators/inventory.validator');
const { validate } = require('../../../middleware/validation.middleware');

router.get(
  '/',
  authenticate,
  requirePermission('inventory:read'),
  getInventoryValidator,
  validate,
  inventoryController.getInventory
);

router.get(
  '/:id',
  authenticate,
  requirePermission('inventory:read'),
  inventoryIdValidator,
  validate,
  inventoryController.getInventoryItem
);

router.post(
  '/',
  authenticate,
  requirePermission('inventory:create'),
  createInventoryValidator,
  validate,
  inventoryController.createInventoryItem
);

router.put(
  '/:id',
  authenticate,
  requirePermission('inventory:update'),
  updateInventoryValidator,
  validate,
  inventoryController.updateInventoryItem
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('inventory:delete'),
  inventoryIdValidator,
  validate,
  inventoryController.deleteInventoryItem
);

module.exports = router;
