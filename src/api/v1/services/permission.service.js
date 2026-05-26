const permissionRepository = require('../repositories/permission.repository');
const { AppError } = require('../../../middleware/error.middleware');
const { Role } = require('../../../models');

class PermissionService {
  async listPermissions() {
    return permissionRepository.findAll();
  }

  async getRolePermissions(roleId) {
    const role = await permissionRepository.findByRoleId(roleId);
    if (!role) {
      throw new AppError('Role not found', 404);
    }
    return { role: role.name, permissions: role.permissions };
  }

  async assignPermissionsToRole(roleId, permissionIds) {
    const role = await Role.findByPk(roleId);
    if (!role) {
      throw new AppError('Role not found', 404);
    }

    // Validate all permission IDs exist
    for (const pid of permissionIds) {
      const perm = await permissionRepository.findById(pid);
      if (!perm) {
        throw new AppError(`Permission with ID ${pid} not found`, 400);
      }
    }

    await permissionRepository.setRolePermissions(roleId, permissionIds);
    return this.getRolePermissions(roleId);
  }
}

module.exports = new PermissionService();
