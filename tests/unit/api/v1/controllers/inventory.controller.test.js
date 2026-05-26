jest.mock('../../../../../src/api/v1/services/inventory.service', () => ({
  getInventory: jest.fn(),
  getInventoryItem: jest.fn(),
  createInventoryItem: jest.fn(),
  updateInventoryItem: jest.fn(),
  deleteInventoryItem: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  resolveSchoolIdFromRequest: jest.fn(),
  parsePositiveInt: jest.fn(() => null)
}));

const inventoryController = require('../../../../../src/api/v1/controllers/inventory.controller');
const inventoryService = require('../../../../../src/api/v1/services/inventory.service');
const { success } = require('../../../../../src/utils/response');
const { resolveSchoolIdFromRequest } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('InventoryController', () => {
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
  describe('getInventory', () => {
    it('should retrieve inventory', async () => {
      req.query = { page: '1' };
      inventoryService.getInventory.mockResolvedValue({ items: [] });
      await inventoryController.getInventory(req, res, next);
      expect(inventoryService.getInventory).toHaveBeenCalledWith(req.query, expect.objectContaining({ schoolId: 1 }));
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'Inventory retrieved successfully', 200);
    });
  });
  describe('getInventoryItem', () => {
    it('should get item by parseInt ID', async () => {
      req.params = { id: '1' };
      inventoryService.getInventoryItem.mockResolvedValue({ id: 1 });
      await inventoryController.getInventoryItem(req, res, next);
      expect(inventoryService.getInventoryItem).toHaveBeenCalledWith(1, expect.objectContaining({ schoolId: 1 }));
    });
  });
  describe('createInventoryItem', () => {
    it('should create inventory item', async () => {
      req.body = { name: 'Projector', quantity: 5 };
      inventoryService.createInventoryItem.mockResolvedValue({ id: 1 });
      await inventoryController.createInventoryItem(req, res, next);
      expect(inventoryService.createInventoryItem).toHaveBeenCalledWith(req.body, expect.objectContaining({ schoolId: 1 }));
      expect(success).toHaveBeenCalledWith(res, { id: 1 }, 'Inventory item created successfully', 201);
    });
  });
  describe('updateInventoryItem', () => {
    it('should update inventory item', async () => {
      req.params = { id: '1' };
      req.body = { quantity: 10 };
      inventoryService.updateInventoryItem.mockResolvedValue({ id: 1, quantity: 10 });
      await inventoryController.updateInventoryItem(req, res, next);
      expect(inventoryService.updateInventoryItem).toHaveBeenCalledWith(1, req.body, expect.objectContaining({ schoolId: 1 }));
    });
  });
  describe('deleteInventoryItem', () => {
    it('should delete inventory item', async () => {
      req.params = { id: '1' };
      inventoryService.deleteInventoryItem.mockResolvedValue(null);
      await inventoryController.deleteInventoryItem(req, res, next);
      expect(inventoryService.deleteInventoryItem).toHaveBeenCalledWith(1, expect.objectContaining({ schoolId: 1 }));
    });
  });
});
