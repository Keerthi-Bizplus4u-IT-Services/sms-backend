const inventoryRepository = require('../repositories/inventory.repository');

class InventoryService {
  async getInventory(query = {}, scope = {}) {
    const { page, pageSize, limit, ...filters } = query;
    return await inventoryRepository.findAll(
      {
        page,
        pageSize: pageSize || limit,
        filters
      },
      scope
    );
  }

  async getInventoryItem(id, scope = {}) {
    return await inventoryRepository.findById(id, scope);
  }

  async createInventoryItem(data, scope = {}) {
    return await inventoryRepository.create(data, scope);
  }

  async updateInventoryItem(id, data, scope = {}) {
    return await inventoryRepository.updateById(id, data, scope);
  }

  async deleteInventoryItem(id, scope = {}) {
    return await inventoryRepository.deleteById(id, scope);
  }
}

module.exports = new InventoryService();
