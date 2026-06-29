const roleService = require('../services/role.service');
const { success, created } = require('../../../utils/response');

const roleController = {
  async listRoles(req, res, next) {
    try {
      const roles = await roleService.listRoles(req);
      return success(res, roles, 'Roles retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getRole(req, res, next) {
    try {
      const role = await roleService.getRoleById(req.params.id, req);
      return success(res, role, 'Role retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async createRole(req, res, next) {
    try {
      const role = await roleService.createRole(req.body, req);
      return created(res, role, 'Role created successfully');
    } catch (err) {
      next(err);
    }
  },

  async updateRole(req, res, next) {
    try {
      const role = await roleService.updateRole(req.params.id, req.body, req);
      return success(res, role, 'Role updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async deleteRole(req, res, next) {
    try {
      await roleService.deleteRole(req.params.id, req);
      return success(res, null, 'Role deleted successfully');
    } catch (err) {
      next(err);
    }
  }
};

module.exports = roleController;
