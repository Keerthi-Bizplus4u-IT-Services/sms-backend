jest.mock('../../../../../src/api/v1/repositories/permission.repository');
jest.mock('../../../../../src/models', () => ({
  Role: {
    findByPk: jest.fn()
  }
}));

const permissionService = require('../../../../../src/api/v1/services/permission.service');
const permissionRepository = require('../../../../../src/api/v1/repositories/permission.repository');
const { Role } = require('../../../../../src/models');

describe('PermissionService global RBAC guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('denies permission reads for non-admin actors', async () => {
    await expect(permissionService.listPermissions({ user: { roleName: 'teacher' } }))
      .rejects
      .toMatchObject({ statusCode: 403, message: 'Global RBAC access requires admin privileges' });

    expect(permissionRepository.findAll).not.toHaveBeenCalled();
  });

  it('allows permission reads for admin actors', async () => {
    permissionRepository.findAll.mockResolvedValue([{ id: 1, name: 'students:read' }]);

    const permissions = await permissionService.listPermissions({ user: { roleName: 'admin' } });

    expect(permissionRepository.findAll).toHaveBeenCalled();
    expect(permissions).toEqual([{ id: 1, name: 'students:read' }]);
  });

  it('denies permission writes for non-super_admin actors', async () => {
    await expect(
      permissionService.assignPermissionsToRole('1', [1, 2], { user: { roleName: 'admin' } })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Global RBAC write access requires super_admin role'
    });

    expect(Role.findByPk).not.toHaveBeenCalled();
  });

  it('allows permission writes for super_admin actors', async () => {
    Role.findByPk.mockResolvedValue({ id: 1, name: 'manager' });
    permissionRepository.findById
      .mockResolvedValueOnce({ id: 1, name: 'students:read' })
      .mockResolvedValueOnce({ id: 2, name: 'students:write' });
    permissionRepository.setRolePermissions.mockResolvedValue([{ role_id: 1, permission_id: 1 }]);
    permissionRepository.findByRoleId.mockResolvedValue({
      id: 1,
      name: 'manager',
      permissions: [{ id: 1, name: 'students:read' }, { id: 2, name: 'students:write' }]
    });

    const result = await permissionService.assignPermissionsToRole(
      '1',
      [1, 2],
      { user: { roleName: 'super_admin' } }
    );

    expect(Role.findByPk).toHaveBeenCalledWith('1');
    expect(permissionRepository.setRolePermissions).toHaveBeenCalledWith('1', [1, 2]);
    expect(result).toEqual({
      role: 'manager',
      permissions: [{ id: 1, name: 'students:read' }, { id: 2, name: 'students:write' }]
    });
  });
});
