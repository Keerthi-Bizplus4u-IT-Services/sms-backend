const employeeRoleService = require('../services/employee-role.service');
const { success, created } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');

class EmployeeRoleController {
  /**
   * GET /employees/role-assignments
   * Returns all employees (for the school) with their assigned roles.
   */
  getAllWithRoles = asyncHandler(async (req, res) => {
    const schoolId = req.user?.schoolId || null;
    const result = await employeeRoleService.getAllEmployeesWithRoles(schoolId);
    return success(res, result, 'Employee role assignments retrieved successfully');
  });

  /**
   * GET /employees/roles/allowed
   * Returns the list of assignable role names.
   */
  getAllowedRoles = asyncHandler(async (_req, res) => {
    const roles = await employeeRoleService.listAllowedRoles();
    return success(res, roles, 'Allowed roles retrieved successfully');
  });

  /**
   * GET /employees/:eid/roles
   * Returns all roles assigned to a specific employee.
   */
  getEmployeeRoles = asyncHandler(async (req, res) => {
    const result = await employeeRoleService.getEmployeeRoles(req.params.eid);
    return success(res, result, 'Employee roles retrieved successfully');
  });

  /**
   * POST /employees/:eid/roles
   * Assigns a role to an employee.
   * Body: { role_name: string }
   */
  assignRole = asyncHandler(async (req, res) => {
    const schoolId = req.user?.schoolId || null;
    const assignedBy = req.user?.id || null;
    const { role_name } = req.body;

    if (!role_name || typeof role_name !== 'string' || !role_name.trim()) {
      return res.status(400).json({ success: false, message: 'role_name is required' });
    }

    const result = await employeeRoleService.assignRole(
      req.params.eid,
      role_name.trim(),
      schoolId,
      assignedBy
    );
    return created(res, result, 'Role assigned successfully');
  });

  /**
   * DELETE /employees/:eid/roles/:roleName
   * Removes a role from an employee.
   */
  removeRole = asyncHandler(async (req, res) => {
    const result = await employeeRoleService.removeRole(req.params.eid, req.params.roleName);
    return success(res, result, 'Role removed successfully');
  });
}

module.exports = new EmployeeRoleController();
