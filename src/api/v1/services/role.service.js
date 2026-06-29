const roleRepository = require('../repositories/role.repository');
const { AppError } = require('../../../middleware/error.middleware');

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

class RoleService {
  async listRoles(actor) {
    assertGlobalRbacReadAccess(actor);
    return roleRepository.findAll();
  }

  async getRoleById(id, actor) {
    assertGlobalRbacReadAccess(actor);
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new AppError('Role not found', 404);
    }
    return role;
  }

  async createRole(payload, actor) {
    assertGlobalRbacWriteAccess(actor);
    const name = (payload.name || '').trim().toLowerCase();
    if (!name) {
      throw new AppError('Role name is required', 400);
    }

    const existing = await roleRepository.findByName(name);
    if (existing) {
      throw new AppError('Role name already exists', 409);
    }

    return roleRepository.create({
      name,
      description: payload.description || null,
      is_system: false
    });
  }

  async updateRole(id, payload, actor) {
    assertGlobalRbacWriteAccess(actor);
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new AppError('Role not found', 404);
    }

    if (role.is_system) {
      throw new AppError('System roles cannot be modified', 403);
    }

    const data = {};
    if (payload.name !== undefined) {
      const name = payload.name.trim().toLowerCase();
      if (name !== role.name) {
        const existing = await roleRepository.findByName(name);
        if (existing) {
          throw new AppError('Role name already exists', 409);
        }
        data.name = name;
      }
    }
    if (payload.description !== undefined) data.description = payload.description;

    return roleRepository.update(id, data);
  }

  async deleteRole(id, actor) {
    assertGlobalRbacWriteAccess(actor);
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new AppError('Role not found', 404);
    }

    if (role.is_system) {
      throw new AppError('System roles cannot be deleted', 403);
    }

    await roleRepository.delete(id);
    return true;
  }
}

module.exports = new RoleService();
