const { Role } = require('../../../models');

const roleRepository = {
  async findAll() {
    return Role.findAll({
      order: [['id', 'ASC']]
    });
  },

  async findById(id) {
    return Role.findByPk(id);
  },

  async findByName(name) {
    return Role.findOne({ where: { name } });
  },

  async create(data) {
    return Role.create(data);
  },

  async update(id, data) {
    const role = await Role.findByPk(id);
    if (!role) return null;
    return role.update(data);
  },

  async delete(id) {
    const role = await Role.findByPk(id);
    if (!role) return null;
    await role.destroy();
    return true;
  }
};

module.exports = roleRepository;
