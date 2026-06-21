const employeeRoleRepository = require('../repositories/employee-role.repository');

class EmployeeRoleService {
  async listAllowedRoles() {
    return employeeRoleRepository.ALLOWED_ROLES.map((name) => ({
      name,
      label: name
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
    }));
  }

  async getEmployeeRoles(employeeId) {
    return employeeRoleRepository.getAssignmentsForEmployee(employeeId);
  }

  async getSchoolRoleAssignments(schoolId) {
    return employeeRoleRepository.getAssignmentsForSchool(schoolId);
  }

  async getAllEmployeesWithRoles(schoolId) {
    return employeeRoleRepository.getAllEmployeesWithRoles(schoolId);
  }

  async assignRole(employeeId, roleName, schoolId, assignedBy) {
    return employeeRoleRepository.assignRole(employeeId, roleName, schoolId, assignedBy);
  }

  async removeRole(employeeId, roleName) {
    return employeeRoleRepository.removeRole(employeeId, roleName);
  }
}

module.exports = new EmployeeRoleService();
