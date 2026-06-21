/**
 * Unit Tests for Permission Controller
 */

jest.mock('../../../../../src/api/v1/services/permission.service');
jest.mock('../../../../../src/utils/response');

const permissionController = require('../../../../../src/api/v1/controllers/permission.controller');
const permissionService = require('../../../../../src/api/v1/services/permission.service');
const { success } = require('../../../../../src/utils/response');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('PermissionController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
  });

  describe('listPermissions', () => {
    it('should retrieve all permissions', async () => {
      const permissions = [{ id: 1, name: 'manage_students' }, { id: 2, name: 'manage_teachers' }];
      permissionService.listPermissions.mockResolvedValue(permissions);

      await permissionController.listPermissions(req, res, next);

      expect(permissionService.listPermissions).toHaveBeenCalled();
      expect(success).toHaveBeenCalledWith(res, permissions, 'Permissions retrieved successfully');
    });

    it('should call next on error', async () => {
      const err = new Error('DB error');
      permissionService.listPermissions.mockRejectedValue(err);

      await permissionController.listPermissions(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('getRolePermissions', () => {
    it('should retrieve permissions for a role', async () => {
      req.params = { roleId: '1' };
      const data = { roleId: 1, permissions: [{ id: 1, name: 'manage_students' }] };
      permissionService.getRolePermissions.mockResolvedValue(data);

      await permissionController.getRolePermissions(req, res, next);

      expect(permissionService.getRolePermissions).toHaveBeenCalledWith('1');
      expect(success).toHaveBeenCalledWith(res, data, 'Role permissions retrieved successfully');
    });

    it('should call next when role not found', async () => {
      req.params = { roleId: '999' };
      permissionService.getRolePermissions.mockRejectedValue(new Error('Role not found'));

      await permissionController.getRolePermissions(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('assignPermissionsToRole', () => {
    it('should assign permissions to a role', async () => {
      req.params = { roleId: '1' };
      req.body = { permissionIds: [1, 2, 3] };
      permissionService.assignPermissionsToRole.mockResolvedValue({ assigned: 3 });

      await permissionController.assignPermissionsToRole(req, res, next);

      expect(permissionService.assignPermissionsToRole).toHaveBeenCalledWith('1', [1, 2, 3]);
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'Permissions assigned successfully');
    });

    it('should call next on invalid permission IDs', async () => {
      req.params = { roleId: '1' };
      req.body = { permissionIds: [999] };
      permissionService.assignPermissionsToRole.mockRejectedValue(new Error('Invalid permission IDs'));

      await permissionController.assignPermissionsToRole(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
