jest.mock('../../../../../src/api/v1/repositories/employee-role.repository', () => ({
  getAssignmentsForEmployee: jest.fn(),
  getAssignmentsForSchool: jest.fn(),
  getAllEmployeesWithRoles: jest.fn(),
  assignRole: jest.fn(),
  removeRole: jest.fn(),
  ALLOWED_ROLES: ['principal', 'librarian']
}));

const employeeRoleService = require('../../../../../src/api/v1/services/employee-role.service');
const employeeRoleRepository = require('../../../../../src/api/v1/repositories/employee-role.repository');

describe('EmployeeRoleService tenant scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes school scope when getting employee roles', async () => {
    employeeRoleRepository.getAssignmentsForEmployee.mockResolvedValueOnce([]);

    await employeeRoleService.getEmployeeRoles(12, 4);

    expect(employeeRoleRepository.getAssignmentsForEmployee).toHaveBeenCalledWith(12, 4);
  });

  it('passes school scope when removing employee role', async () => {
    employeeRoleRepository.removeRole.mockResolvedValueOnce({ removed: true });

    await employeeRoleService.removeRole(12, 'principal', 4);

    expect(employeeRoleRepository.removeRole).toHaveBeenCalledWith(12, 'principal', 4);
  });

  it('passes school scope when assigning role', async () => {
    employeeRoleRepository.assignRole.mockResolvedValueOnce({ employeeId: 12, roleName: 'principal', alreadyAssigned: false });

    await employeeRoleService.assignRole(12, 'principal', 4, 9);

    expect(employeeRoleRepository.assignRole).toHaveBeenCalledWith(12, 'principal', 4, 9);
  });
});
