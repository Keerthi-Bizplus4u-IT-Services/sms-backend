/**
 * Seed: Roles & Permissions (RBAC)
 * Uses the existing RBAC seed logic.
 */
const { sequelize, Role, Permission, RolePermission } = require('../../src/models');

const ROLES = [
  { id: 1, name: 'admin', description: 'School administrator', is_system: true },
  { id: 2, name: 'student', description: 'Student user', is_system: false },
  { id: 3, name: 'parent', description: 'Parent/guardian user', is_system: false },
  { id: 4, name: 'teacher', description: 'Teaching staff', is_system: false },
  { id: 5, name: 'accounts', description: 'Accounts / Finance staff', is_system: false },
  { id: 6, name: 'library', description: 'Library staff', is_system: false },
  { id: 7, name: 'management', description: 'Management staff', is_system: false },
  { id: 8, name: 'transport', description: 'Transport department', is_system: false },
  { id: 9, name: 'principal', description: 'School principal', is_system: false },
  { id: 10, name: 'super_admin', description: 'Super Administrator with full access', is_system: true },
  { id: 11, name: 'exam_incharge', description: 'Exam/assessment in-charge', is_system: false },
  { id: 12, name: 'curriculum_incharge', description: 'Curriculum/subject coordinator', is_system: false },
];

const PERMISSIONS = [
  { name: 'students:read', resource: 'students', action: 'read', description: 'View student records' },
  { name: 'students:write', resource: 'students', action: 'write', description: 'Create/update student records' },
  { name: 'students:delete', resource: 'students', action: 'delete', description: 'Delete student records' },
  { name: 'teachers:read', resource: 'teachers', action: 'read', description: 'View teacher records' },
  { name: 'teachers:write', resource: 'teachers', action: 'write', description: 'Create/update teacher records' },
  { name: 'teachers:delete', resource: 'teachers', action: 'delete', description: 'Delete teacher records' },
  { name: 'parents:read', resource: 'parents', action: 'read', description: 'View parent records' },
  { name: 'parents:write', resource: 'parents', action: 'write', description: 'Create/update parent records' },
  { name: 'parents:delete', resource: 'parents', action: 'delete', description: 'Delete parent records' },
  { name: 'fees:read', resource: 'fees', action: 'read', description: 'View fee records' },
  { name: 'fees:write', resource: 'fees', action: 'write', description: 'Create/update fee payments' },
  { name: 'fees:delete', resource: 'fees', action: 'delete', description: 'Delete fee records' },
  { name: 'fee-structures:read', resource: 'fee-structures', action: 'read', description: 'View fee structures' },
  { name: 'fee-structures:write', resource: 'fee-structures', action: 'write', description: 'Create/update fee structures' },
  { name: 'fee-structures:delete', resource: 'fee-structures', action: 'delete', description: 'Delete fee structures' },
  { name: 'expenses:read', resource: 'expenses', action: 'read', description: 'View expense records' },
  { name: 'expenses:write', resource: 'expenses', action: 'write', description: 'Create/update expenses' },
  { name: 'expenses:delete', resource: 'expenses', action: 'delete', description: 'Delete expenses' },
  { name: 'employees:read', resource: 'employees', action: 'read', description: 'View employee records' },
  { name: 'employees:write', resource: 'employees', action: 'write', description: 'Create/update employees' },
  { name: 'employees:delete', resource: 'employees', action: 'delete', description: 'Delete employees' },
  { name: 'classes:read', resource: 'classes', action: 'read', description: 'View class records' },
  { name: 'classes:write', resource: 'classes', action: 'write', description: 'Create/update classes' },
  { name: 'classes:delete', resource: 'classes', action: 'delete', description: 'Delete classes' },
  { name: 'sections:read', resource: 'sections', action: 'read', description: 'View sections' },
  { name: 'sections:write', resource: 'sections', action: 'write', description: 'Create/update sections' },
  { name: 'subjects:read', resource: 'subjects', action: 'read', description: 'View subject records' },
  { name: 'subjects:write', resource: 'subjects', action: 'write', description: 'Create/update subjects' },
  { name: 'subjects:delete', resource: 'subjects', action: 'delete', description: 'Delete subjects' },
  { name: 'books:read', resource: 'books', action: 'read', description: 'View library books' },
  { name: 'books:write', resource: 'books', action: 'write', description: 'Create/update books' },
  { name: 'books:delete', resource: 'books', action: 'delete', description: 'Delete books' },
  { name: 'hostels:read', resource: 'hostels', action: 'read', description: 'View hostel records' },
  { name: 'hostels:write', resource: 'hostels', action: 'write', description: 'Create/update hostels' },
  { name: 'hostels:delete', resource: 'hostels', action: 'delete', description: 'Delete hostel records' },
  { name: 'marks:read', resource: 'marks', action: 'read', description: 'View student marks' },
  { name: 'marks:write', resource: 'marks', action: 'write', description: 'Create/update marks' },
  { name: 'holidays:read', resource: 'holidays', action: 'read', description: 'View holidays' },
  { name: 'holidays:write', resource: 'holidays', action: 'write', description: 'Create/update holidays' },
  { name: 'holidays:delete', resource: 'holidays', action: 'delete', description: 'Delete holidays' },
  { name: 'timetables:read', resource: 'timetables', action: 'read', description: 'View timetables' },
  { name: 'timetables:write', resource: 'timetables', action: 'write', description: 'Create/update timetables' },
  { name: 'timetables:delete', resource: 'timetables', action: 'delete', description: 'Delete timetables' },
  { name: 'transport:read', resource: 'transport', action: 'read', description: 'View transport records' },
  { name: 'transport:write', resource: 'transport', action: 'write', description: 'Create/update transport' },
  { name: 'transport:delete', resource: 'transport', action: 'delete', description: 'Delete transport records' },
  { name: 'communications:read', resource: 'communications', action: 'read', description: 'View communications' },
  { name: 'communications:write', resource: 'communications', action: 'write', description: 'Send communications' },
  { name: 'leaves:read', resource: 'leaves', action: 'read', description: 'View leave requests' },
  { name: 'leaves:write', resource: 'leaves', action: 'write', description: 'Create leave requests' },
  { name: 'leaves:approve', resource: 'leaves', action: 'approve', description: 'Approve/reject leave requests' },
  { name: 'academic-years:read', resource: 'academic-years', action: 'read', description: 'View academic years' },
  { name: 'academic-years:write', resource: 'academic-years', action: 'write', description: 'Create/update academic years' },
  { name: 'session-hours:read', resource: 'session-hours', action: 'read', description: 'View session hours' },
  { name: 'session-hours:write', resource: 'session-hours', action: 'write', description: 'Create/update session hours' },
  { name: 'dashboard:read', resource: 'dashboard', action: 'read', description: 'View dashboard data' },
  { name: 'reports:export', resource: 'reports', action: 'export', description: 'Export reports' },
  { name: 'users:read', resource: 'users', action: 'read', description: 'View user accounts' },
  { name: 'users:write', resource: 'users', action: 'write', description: 'Create/update user accounts' },
  { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete user accounts' },
  { name: 'schools:read', resource: 'schools', action: 'read', description: 'View school records' },
  { name: 'schools:write', resource: 'schools', action: 'write', description: 'Create/update schools' },
  { name: 'schools:delete', resource: 'schools', action: 'delete', description: 'Delete schools' },
];

const ROLE_PERMISSIONS = {
  super_admin: PERMISSIONS.map(p => p.name),
  admin: PERMISSIONS.map(p => p.name).filter(p => p !== 'schools:delete'),
  teacher: [
    'students:read', 'teachers:read', 'parents:read',
    'classes:read', 'sections:read', 'subjects:read',
    'marks:read', 'marks:write',
    'timetables:read', 'holidays:read',
    'leaves:read', 'leaves:write',
    'academic-years:read', 'session-hours:read',
    'dashboard:read', 'communications:read', 'communications:write',
    'books:read', 'hostels:read', 'transport:read',
  ],
  student: [
    'students:read', 'classes:read', 'sections:read', 'subjects:read',
    'marks:read', 'timetables:read', 'holidays:read',
    'leaves:read', 'leaves:write',
    'academic-years:read', 'session-hours:read',
    'dashboard:read', 'communications:read',
    'fees:read', 'fee-structures:read',
    'books:read', 'hostels:read', 'transport:read',
  ],
  parent: [
    'students:read', 'teachers:read',
    'classes:read', 'sections:read', 'subjects:read',
    'marks:read', 'timetables:read', 'holidays:read',
    'leaves:read',
    'academic-years:read', 'session-hours:read',
    'dashboard:read', 'communications:read',
    'fees:read', 'fee-structures:read', 'transport:read',
  ],
  accounts: [
    'students:read', 'teachers:read', 'parents:read',
    'fees:read', 'fees:write', 'fees:delete',
    'fee-structures:read', 'fee-structures:write', 'fee-structures:delete',
    'expenses:read', 'expenses:write', 'expenses:delete',
    'dashboard:read', 'reports:read', 'reports:export',
    'communications:read',
    'classes:read', 'sections:read', 'academic-years:read',
  ],
  library: [
    'books:read', 'books:write', 'books:delete',
    'students:read', 'teachers:read',
    'classes:read', 'sections:read', 'dashboard:read',
    'communications:read',
  ],
  management: [
    'students:read', 'teachers:read', 'parents:read',
    'employees:read', 'employees:write', 'employees:delete',
    'classes:read', 'sections:read', 'subjects:read',
    'fees:read', 'expenses:read',
    'dashboard:read', 'reports:export',
    'academic-years:read',
    'communications:read', 'communications:write',
    'hostels:read', 'hostels:write',
    'transport:read', 'holidays:read', 'timetables:read',
  ],
  transport: [
    'transport:read', 'transport:write', 'transport:delete',
    'students:read', 'classes:read', 'sections:read', 'dashboard:read',
  ],
  principal: [
    'students:read', 'teachers:read', 'parents:read',
    'classes:read', 'sections:read', 'subjects:read',
    'books:read',
    'marks:read',
    'holidays:read', 'holidays:write',
    'timetables:read', 'timetables:write',
    'leaves:read', 'leaves:approve',
    'academic-years:read', 'session-hours:read',
    'dashboard:read', 'communications:read', 'communications:write',
    'reports:export'
  ],
  exam_incharge: [
    'students:read', 'teachers:read', 'classes:read', 'sections:read', 'subjects:read',
    'marks:read', 'marks:write',
    'academic-years:read',
    'holidays:read', 'timetables:read',
    'dashboard:read', 'reports:export',
    'communications:read', 'communications:write'
  ],
  curriculum_incharge: [
    'students:read', 'teachers:read',
    'classes:read', 'classes:write',
    'sections:read', 'sections:write',
    'subjects:read', 'subjects:write',
    'timetables:read', 'timetables:write',
    'session-hours:read', 'session-hours:write',
    'academic-years:read',
    'holidays:read',
    'dashboard:read', 'communications:read', 'communications:write'
  ],
};

async function seed() {
  const transaction = await sequelize.transaction();

  try {
    // Seed roles
    for (const role of ROLES) {
      await Role.findOrCreate({
        where: { id: role.id },
        defaults: role,
        transaction
      });
    }
    console.log(`   Seeded ${ROLES.length} roles`);

    // Seed permissions
    for (const perm of PERMISSIONS) {
      await Permission.findOrCreate({
        where: { name: perm.name },
        defaults: perm,
        transaction
      });
    }
    console.log(`   Seeded ${PERMISSIONS.length} permissions`);

    // Assign permissions to roles
    for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await Role.findOne({
        where: sequelize.where(
          sequelize.fn('LOWER', sequelize.col('name')),
          roleName.toLowerCase()
        ),
        transaction
      });
      if (!role) continue;

      for (const permName of permNames) {
        const perm = await Permission.findOne({ where: { name: permName }, transaction });
        if (!perm) continue;

        await RolePermission.findOrCreate({
          where: { role_id: role.id, permission_id: perm.id },
          defaults: { role_id: role.id, permission_id: perm.id },
          transaction
        });
      }
    }
    console.log('   Role-permission mappings assigned');

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = seed;
