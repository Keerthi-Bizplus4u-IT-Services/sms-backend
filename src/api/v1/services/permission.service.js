const permissionRepository = require('../repositories/permission.repository');
const { AppError } = require('../../../middleware/error.middleware');
const { Role } = require('../../../models');

const normalizeRoleName = (actor) => {
  if (!actor) {
    return null;
  }

  const role =
    actor.roleName ||
    actor.role ||
    actor.user?.roleName ||
    actor.user?.role ||
    actor.authContext?.roleName ||
    actor.authContext?.role;

  if (!role || typeof role !== 'string') {
    return null;
  }

  return role.trim().toLowerCase();
};

const assertGlobalRbacReadAccess = (actor) => {
  const roleName = normalizeRoleName(actor);
  if (roleName === 'super_admin' || roleName === 'admin') {
    return;
  }

  throw new AppError('Global RBAC access requires admin privileges', 403);
};

const assertGlobalRbacWriteAccess = (actor) => {
  const roleName = normalizeRoleName(actor);
  if (roleName === 'super_admin') {
    return;
  }

  throw new AppError('Global RBAC write access requires super_admin role', 403);
};

class PermissionService {
  async listPermissions(actor) {
    assertGlobalRbacReadAccess(actor);
    return permissionRepository.findAll();
  }

  async getRolePermissions(roleId, actor) {
    assertGlobalRbacReadAccess(actor);
    const role = await permissionRepository.findByRoleId(roleId);
    if (!role) {
      throw new AppError('Role not found', 404);
    }
    return { role: role.name, permissions: role.permissions };
  }

  async assignPermissionsToRole(roleId, permissionIds, actor) {
    assertGlobalRbacWriteAccess(actor);
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
    return this.getRolePermissions(roleId, actor);
  }
}

module.exports = new PermissionService();
