const roleRepository = require('../repositories/role.repository');
const { AppError } = require('../../../middleware/error.middleware');

class RoleService {
  async listRoles() {
    return roleRepository.findAll();
  }

  async getRoleById(id) {
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new AppError('Role not found', 404);
    }
    return role;
  }

  async createRole(payload) {
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

  async updateRole(id, payload) {
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

  async deleteRole(id) {
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
