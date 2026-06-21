const permissionService = require('../services/permission.service');
const { success } = require('../../../utils/response');

const permissionController = {
  async listPermissions(req, res, next) {
    try {
      const permissions = await permissionService.listPermissions();
      return success(res, permissions, 'Permissions retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async getRolePermissions(req, res, next) {
    try {
      const data = await permissionService.getRolePermissions(req.params.roleId);
      return success(res, data, 'Role permissions retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  async assignPermissionsToRole(req, res, next) {
    try {
      const data = await permissionService.assignPermissionsToRole(
        req.params.roleId,
        req.body.permissionIds
      );
      return success(res, data, 'Permissions assigned successfully');
    } catch (err) {
      next(err);
    }
  }
};

module.exports = permissionController;
