/**
 * Unit Tests for Role Controller
 */

jest.mock('../../../../../src/api/v1/services/role.service');
jest.mock('../../../../../src/utils/response');

const roleController = require('../../../../../src/api/v1/controllers/role.controller');
const roleService = require('../../../../../src/api/v1/services/role.service');
const { success, created } = require('../../../../../src/utils/response');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('RoleController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest({ user: { roleName: 'super_admin' } });
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    created.mockReturnValue(res);
  });

  describe('listRoles', () => {
    it('should retrieve all roles', async () => {
      const roles = [{ id: 1, name: 'admin' }, { id: 2, name: 'teacher' }];
      roleService.listRoles.mockResolvedValue(roles);

      await roleController.listRoles(req, res, next);

      expect(roleService.listRoles).toHaveBeenCalledWith(req);
      expect(success).toHaveBeenCalledWith(res, roles, 'Roles retrieved successfully');
    });

    it('should call next on error', async () => {
      const err = new Error('DB error');
      roleService.listRoles.mockRejectedValue(err);

      await roleController.listRoles(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('getRole', () => {
    it('should retrieve a role by ID', async () => {
      req.params = { id: '1' };
      roleService.getRoleById.mockResolvedValue({ id: 1, name: 'admin' });

      await roleController.getRole(req, res, next);

      expect(roleService.getRoleById).toHaveBeenCalledWith('1', req);
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'Role retrieved successfully');
    });

    it('should call next on not-found', async () => {
      req.params = { id: '999' };
      roleService.getRoleById.mockRejectedValue(new Error('Role not found'));

      await roleController.getRole(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('createRole', () => {
    it('should create a role', async () => {
      req.body = { name: 'manager', description: 'School manager' };
      roleService.createRole.mockResolvedValue({ id: 3, name: 'manager' });

      await roleController.createRole(req, res, next);

      expect(roleService.createRole).toHaveBeenCalledWith(req.body, req);
      expect(created).toHaveBeenCalledWith(res, expect.any(Object), 'Role created successfully');
    });

    it('should propagate duplicate name error', async () => {
      req.body = { name: 'admin' };
      roleService.createRole.mockRejectedValue(new Error('Role already exists'));

      await roleController.createRole(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateRole', () => {
    it('should update a role', async () => {
      req.params = { id: '3' };
      req.body = { description: 'Updated description' };
      roleService.updateRole.mockResolvedValue({ id: 3, description: 'Updated description' });

      await roleController.updateRole(req, res, next);

      expect(roleService.updateRole).toHaveBeenCalledWith('3', req.body, req);
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'Role updated successfully');
    });
  });

  describe('deleteRole', () => {
    it('should delete a role', async () => {
      req.params = { id: '3' };
      roleService.deleteRole.mockResolvedValue();

      await roleController.deleteRole(req, res, next);

      expect(roleService.deleteRole).toHaveBeenCalledWith('3', req);
      expect(success).toHaveBeenCalledWith(res, null, 'Role deleted successfully');
    });

    it('should propagate error when role has users', async () => {
      req.params = { id: '1' };
      roleService.deleteRole.mockRejectedValue(new Error('Cannot delete role with assigned users'));

      await roleController.deleteRole(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
