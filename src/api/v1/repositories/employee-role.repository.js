const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { AppError } = require('../../../middleware/error.middleware');

const ALLOWED_ROLES = [
  'librarian',
  'principal',
  'school_admin',
  'accountant',
  'hostel_incharge',
  'transport_incharge',
  'exam_incharge',
  'curriculum_incharge',
];

class EmployeeRoleRepository {
  async getAssignmentsForEmployee(employeeId) {
    const numericId = parseInt(employeeId, 10);
    if (Number.isNaN(numericId)) throw new AppError('Invalid employee identifier', 400);

    return sequelize.query(
      `SELECT era.id, era.employee_id, era.school_id, era.role_name, era.created_at,
              e.fname, e.lname, e.designation
       FROM employee_role_assignments era
       JOIN employees e ON e.id = era.employee_id
       WHERE era.employee_id = :employeeId`,
      { replacements: { employeeId: numericId }, type: QueryTypes.SELECT }
    );
  }

  async getAssignmentsForSchool(schoolId) {
    return sequelize.query(
      `SELECT era.id, era.employee_id, era.school_id, era.role_name, era.created_at,
              e.fname, e.lname, e.designation, e.ephoto, e.phone, e.email
       FROM employee_role_assignments era
       JOIN employees e ON e.id = era.employee_id
       WHERE era.school_id = :schoolId
       ORDER BY era.role_name, e.fname`,
      { replacements: { schoolId }, type: QueryTypes.SELECT }
    );
  }

  async assignRole(employeeId, roleName, schoolId, assignedBy) {
    const numericId = parseInt(employeeId, 10);
    if (Number.isNaN(numericId)) throw new AppError('Invalid employee identifier', 400);

    if (!ALLOWED_ROLES.includes(roleName)) {
      throw new AppError(`Invalid role. Allowed roles: ${ALLOWED_ROLES.join(', ')}`, 400);
    }

    // Verify employee exists and belongs to the school
    const empRows = await sequelize.query(
      `SELECT id FROM employees WHERE id = :eid AND deleted_at IS NULL`,
      { replacements: { eid: numericId }, type: QueryTypes.SELECT }
    );
    if (!empRows.length) throw new AppError('Employee not found', 404);

    const rows = await sequelize.query(
      `INSERT INTO employee_role_assignments (employee_id, school_id, role_name, assigned_by)
       VALUES (:employeeId, :schoolId, :roleName, :assignedBy)
       ON CONFLICT (employee_id, role_name) DO NOTHING
       RETURNING id`,
      {
        replacements: { employeeId: numericId, schoolId, roleName, assignedBy: assignedBy || null },
        type: QueryTypes.SELECT
      }
    );

    return { employeeId: numericId, roleName, alreadyAssigned: rows.length === 0 };
  }

  async removeRole(employeeId, roleName) {
    const numericId = parseInt(employeeId, 10);
    if (Number.isNaN(numericId)) throw new AppError('Invalid employee identifier', 400);

    const result = await sequelize.query(
      `DELETE FROM employee_role_assignments
       WHERE employee_id = :employeeId AND role_name = :roleName`,
      { replacements: { employeeId: numericId, roleName }, type: QueryTypes.UPDATE }
    );

    return { removed: true };
  }

  async getAllEmployeesWithRoles(schoolId) {
    return sequelize.query(
      `SELECT e.id AS eid, e.fname, e.lname, e.designation, e.ephoto, e.phone, e.email,
              COALESCE(
                json_agg(era.role_name ORDER BY era.role_name) FILTER (WHERE era.role_name IS NOT NULL),
                '[]'
              ) AS roles
       FROM employees e
       LEFT JOIN employee_role_assignments era ON era.employee_id = e.id AND era.school_id = :schoolId
       WHERE e.deleted_at IS NULL AND e.school_id = :schoolId
       GROUP BY e.id, e.fname, e.lname, e.designation, e.ephoto, e.phone, e.email
       ORDER BY e.fname`,
      { replacements: { schoolId }, type: QueryTypes.SELECT }
    );
  }
}

module.exports = new EmployeeRoleRepository();
module.exports.ALLOWED_ROLES = ALLOWED_ROLES;
