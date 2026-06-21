const inventoryService = require('../services/inventory.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { parsePositiveInt, resolveSchoolIdFromRequest } = require('../utils/context');

const resolveInventoryScope = (req) => ({
  schoolId: resolveSchoolIdFromRequest(req),
  branchId: parsePositiveInt(req?.query?.branchId) || parsePositiveInt(req?.query?.branch_id)
});

class InventoryController {
  getInventory = asyncHandler(async (req, res) => {
    const result = await inventoryService.getInventory(req.query, resolveInventoryScope(req));
    return success(res, result, 'Inventory retrieved successfully', 200);
  });

  getInventoryItem = asyncHandler(async (req, res) => {
    const result = await inventoryService.getInventoryItem(parseInt(req.params.id, 10), resolveInventoryScope(req));
    return success(res, result, 'Inventory item retrieved successfully', 200);
  });

  createInventoryItem = asyncHandler(async (req, res) => {
    const result = await inventoryService.createInventoryItem(req.body, resolveInventoryScope(req));
    return success(res, result, 'Inventory item created successfully', 201);
  });

  updateInventoryItem = asyncHandler(async (req, res) => {
    const result = await inventoryService.updateInventoryItem(parseInt(req.params.id, 10), req.body, resolveInventoryScope(req));
    return success(res, result, 'Inventory item updated successfully', 200);
  });

  deleteInventoryItem = asyncHandler(async (req, res) => {
    await inventoryService.deleteInventoryItem(parseInt(req.params.id, 10), resolveInventoryScope(req));
    return success(res, null, 'Inventory item deleted successfully', 200);
  });
}

module.exports = new InventoryController();
