jest.mock('../../../../../src/api/v1/repositories/role.repository');

const roleService = require('../../../../../src/api/v1/services/role.service');
const roleRepository = require('../../../../../src/api/v1/repositories/role.repository');

describe('RoleService global RBAC guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('denies role reads for non-admin actors', async () => {
    await expect(roleService.listRoles({ user: { roleName: 'teacher' } }))
      .rejects
      .toMatchObject({ statusCode: 403, message: 'Global RBAC access requires admin privileges' });

    expect(roleRepository.findAll).not.toHaveBeenCalled();
  });

  it('allows role reads for admin actors', async () => {
    roleRepository.findAll.mockResolvedValue([{ id: 1, name: 'admin' }]);

    const roles = await roleService.listRoles({ user: { roleName: 'admin' } });

    expect(roleRepository.findAll).toHaveBeenCalled();
    expect(roles).toEqual([{ id: 1, name: 'admin' }]);
  });

  it('denies role writes for non-super_admin actors', async () => {
    await expect(
      roleService.createRole({ name: 'manager' }, { user: { roleName: 'admin' } })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Global RBAC write access requires super_admin role'
    });

    expect(roleRepository.findByName).not.toHaveBeenCalled();
    expect(roleRepository.create).not.toHaveBeenCalled();
  });

  it('allows role writes for super_admin actors', async () => {
    roleRepository.findByName.mockResolvedValue(null);
    roleRepository.create.mockResolvedValue({ id: 9, name: 'manager', is_system: false });

    const role = await roleService.createRole(
      { name: 'manager', description: 'Manager role' },
      { user: { roleName: 'super_admin' } }
    );

    expect(roleRepository.findByName).toHaveBeenCalledWith('manager');
    expect(roleRepository.create).toHaveBeenCalledWith({
      name: 'manager',
      description: 'Manager role',
      is_system: false
    });
    expect(role).toMatchObject({ id: 9, name: 'manager' });
  });
});
