const { Permission, Role, RolePermission } = require('../../../models');

const permissionRepository = {
  async findAll() {
    return Permission.findAll({
      order: [['resource', 'ASC'], ['action', 'ASC']]
    });
  },

  async findById(id) {
    return Permission.findByPk(id);
  },

  async findByName(name) {
    return Permission.findOne({ where: { name } });
  },

  async findByRoleId(roleId) {
    const role = await Role.findByPk(roleId, {
      include: [{
        model: Permission,
        as: 'permissions',
        through: { attributes: [] }
      }]
    });
    return role;
  },

  async setRolePermissions(roleId, permissionIds) {
    await RolePermission.destroy({ where: { role_id: roleId } });
    if (permissionIds.length === 0) return [];

    const records = permissionIds.map(pid => ({
      role_id: roleId,
      permission_id: pid
    }));
    return RolePermission.bulkCreate(records);
  }
};

module.exports = permissionRepository;
