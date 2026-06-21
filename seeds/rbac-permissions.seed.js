/**
 * RBAC Permissions Seed
 * Seeds all permissions and assigns them to roles.
 * Run: node backend/seeds/rbac-permissions.seed.js
 */
const { sequelize, Role, Permission, RolePermission } = require('../src/models');

const PERMISSIONS = [
  // Students
  { name: 'students:read', resource: 'students', action: 'read', description: 'View student records' },
  { name: 'students:write', resource: 'students', action: 'write', description: 'Create/update student records' },
  { name: 'students:delete', resource: 'students', action: 'delete', description: 'Delete student records' },

  // Teachers
  { name: 'teachers:read', resource: 'teachers', action: 'read', description: 'View teacher records' },
  { name: 'teachers:write', resource: 'teachers', action: 'write', description: 'Create/update teacher records' },
  { name: 'teachers:delete', resource: 'teachers', action: 'delete', description: 'Delete teacher records' },

  // Parents
  { name: 'parents:read', resource: 'parents', action: 'read', description: 'View parent records' },
  { name: 'parents:write', resource: 'parents', action: 'write', description: 'Create/update parent records' },
  { name: 'parents:delete', resource: 'parents', action: 'delete', description: 'Delete parent records' },

  // Fees
  { name: 'fees:read', resource: 'fees', action: 'read', description: 'View fee records' },
  { name: 'fees:write', resource: 'fees', action: 'write', description: 'Create/update fee payments' },
  { name: 'fees:delete', resource: 'fees', action: 'delete', description: 'Delete fee records' },

  // Fee Structures
  { name: 'fee-structures:read', resource: 'fee-structures', action: 'read', description: 'View fee structures' },
  { name: 'fee-structures:write', resource: 'fee-structures', action: 'write', description: 'Create/update fee structures' },
  { name: 'fee-structures:delete', resource: 'fee-structures', action: 'delete', description: 'Delete fee structures' },

  // Expenses
  { name: 'expenses:read', resource: 'expenses', action: 'read', description: 'View expense records' },
  { name: 'expenses:write', resource: 'expenses', action: 'write', description: 'Create/update expenses' },
  { name: 'expenses:delete', resource: 'expenses', action: 'delete', description: 'Delete expenses' },

  // Employees
  { name: 'employees:read', resource: 'employees', action: 'read', description: 'View employee records' },
  { name: 'employees:write', resource: 'employees', action: 'write', description: 'Create/update employees' },
  { name: 'employees:delete', resource: 'employees', action: 'delete', description: 'Delete employees' },

  // Classes
  { name: 'classes:read', resource: 'classes', action: 'read', description: 'View class records' },
  { name: 'classes:write', resource: 'classes', action: 'write', description: 'Create/update classes' },
  { name: 'classes:delete', resource: 'classes', action: 'delete', description: 'Delete classes' },

  // Sections
  { name: 'sections:read', resource: 'sections', action: 'read', description: 'View sections' },
  { name: 'sections:write', resource: 'sections', action: 'write', description: 'Create/update sections' },

  // Subjects
  { name: 'subjects:read', resource: 'subjects', action: 'read', description: 'View subject records' },
  { name: 'subjects:write', resource: 'subjects', action: 'write', description: 'Create/update subjects' },
  { name: 'subjects:delete', resource: 'subjects', action: 'delete', description: 'Delete subjects' },

  // Books
  { name: 'books:read', resource: 'books', action: 'read', description: 'View library books' },
  { name: 'books:write', resource: 'books', action: 'write', description: 'Create/update books' },
  { name: 'books:delete', resource: 'books', action: 'delete', description: 'Delete books' },

  // Hostels
  { name: 'hostels:read', resource: 'hostels', action: 'read', description: 'View hostel records' },
  { name: 'hostels:write', resource: 'hostels', action: 'write', description: 'Create/update hostels' },
  { name: 'hostels:delete', resource: 'hostels', action: 'delete', description: 'Delete hostel records' },

  // Marks
  { name: 'marks:read', resource: 'marks', action: 'read', description: 'View student marks' },
  { name: 'marks:write', resource: 'marks', action: 'write', description: 'Create/update marks' },

  // Holidays
  { name: 'holidays:read', resource: 'holidays', action: 'read', description: 'View holidays' },
  { name: 'holidays:write', resource: 'holidays', action: 'write', description: 'Create/update holidays' },
  { name: 'holidays:delete', resource: 'holidays', action: 'delete', description: 'Delete holidays' },

  // Timetables
  { name: 'timetables:read', resource: 'timetables', action: 'read', description: 'View timetables' },
  { name: 'timetables:write', resource: 'timetables', action: 'write', description: 'Create/update timetables' },
  { name: 'timetables:delete', resource: 'timetables', action: 'delete', description: 'Delete timetables' },

  // Transport
  { name: 'transport:read', resource: 'transport', action: 'read', description: 'View transport records' },
  { name: 'transport:write', resource: 'transport', action: 'write', description: 'Create/update transport' },
  { name: 'transport:delete', resource: 'transport', action: 'delete', description: 'Delete transport records' },

  // Communications
  { name: 'communications:read', resource: 'communications', action: 'read', description: 'View communications' },
  { name: 'communications:write', resource: 'communications', action: 'write', description: 'Send communications' },
  { name: 'communications:delete', resource: 'communications', action: 'delete', description: 'Delete communications' },

  // Assignments
  { name: 'assignments:read', resource: 'assignments', action: 'read', description: 'View assignments' },
  { name: 'assignments:write', resource: 'assignments', action: 'write', description: 'Create assignments' },

  // Leaves
  { name: 'leaves:read', resource: 'leaves', action: 'read', description: 'View leave requests' },
  { name: 'leaves:write', resource: 'leaves', action: 'write', description: 'Create leave requests' },
  { name: 'leaves:approve', resource: 'leaves', action: 'approve', description: 'Approve/reject leave requests' },

  // Academic Years
  { name: 'academic-years:read', resource: 'academic-years', action: 'read', description: 'View academic years' },
  { name: 'academic-years:write', resource: 'academic-years', action: 'write', description: 'Create/update academic years' },

  // Session Hours
  { name: 'session-hours:read', resource: 'session-hours', action: 'read', description: 'View session hours' },
  { name: 'session-hours:write', resource: 'session-hours', action: 'write', description: 'Create/update session hours' },

  // Dashboard
  { name: 'dashboard:read', resource: 'dashboard', action: 'read', description: 'View dashboard data' },

  // Reports
  { name: 'reports:read', resource: 'reports', action: 'read', description: 'View report data (fees, expenses, students, financial)' },
  { name: 'reports:export', resource: 'reports', action: 'export', description: 'Export reports' },

  // Users
  { name: 'users:read', resource: 'users', action: 'read', description: 'View user accounts' },
  { name: 'users:write', resource: 'users', action: 'write', description: 'Create/update user accounts' },
  { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete user accounts' },

  // Schools
  { name: 'schools:read', resource: 'schools', action: 'read', description: 'View school records' },
  { name: 'schools:write', resource: 'schools', action: 'write', description: 'Create/update schools' },
  { name: 'schools:delete', resource: 'schools', action: 'delete', description: 'Delete schools' },

];

/**
 * Role-to-permission mappings
 * Key = role name, Value = array of permission names
 */
const ROLE_PERMISSIONS = {
  super_admin: PERMISSIONS.map(p => p.name), // all permissions

  admin: PERMISSIONS.map(p => p.name).filter(p => !p.startsWith('schools:delete')), // all except school deletion

  teacher: [
    'students:read',
    'teachers:read',
    'parents:read',
    'classes:read',
    'sections:read',
    'subjects:read',
    'marks:read', 'marks:write',
    'timetables:read',
    'holidays:read',
    'leaves:read', 'leaves:write',
    'academic-years:read',
    'session-hours:read',
    'dashboard:read',
    'communications:read', 'communications:write',
    'assignments:read', 'assignments:write',
    'books:read',
    'hostels:read',
    'transport:read',
  ],

  student: [
    'students:read',
    'classes:read',
    'sections:read',
    'subjects:read',
    'marks:read',
    'timetables:read',
    'holidays:read',
    'leaves:read', 'leaves:write',
    'academic-years:read',
    'session-hours:read',
    'dashboard:read',
    'communications:read',
    'assignments:read',
    'fees:read',
    'fee-structures:read',
    'books:read',
    'hostels:read',
    'transport:read',
  ],

  parent: [
    'students:read',
    'teachers:read',
    'classes:read',
    'sections:read',
    'subjects:read',
    'marks:read',
    'timetables:read',
    'holidays:read',
    'leaves:read',
    'academic-years:read',
    'session-hours:read',
    'dashboard:read',
    'communications:read',
    'assignments:read',
    'fees:read',
    'fee-structures:read',
    'transport:read',
  ],

  accounts: [
    'students:read',
    'teachers:read',
    'parents:read',
    'fees:read', 'fees:write', 'fees:delete',
    'fee-structures:read', 'fee-structures:write', 'fee-structures:delete',
    'expenses:read', 'expenses:write', 'expenses:delete',
    'dashboard:read',
    'reports:read',
    'reports:export',
    'communications:read',
    'assignments:read',
    'classes:read',
    'sections:read',
    'academic-years:read',
  ],

  library: [
    'books:read', 'books:write', 'books:delete',
    'students:read',
    'teachers:read',
    'classes:read',
    'sections:read',
    'dashboard:read',
  ],

  management: [
    'students:read',
    'teachers:read',
    'parents:read',
    'employees:read', 'employees:write', 'employees:delete',
    'classes:read',
    'sections:read',
    'subjects:read',
    'fees:read',
    'expenses:read',
    'dashboard:read',
    'reports:read',
    'reports:export',
    'academic-years:read',
    'communications:read', 'communications:write',
    'assignments:read', 'assignments:write',
    'hostels:read', 'hostels:write',
    'transport:read',
    'holidays:read',
    'timetables:read',
  ],

  transport: [
    'transport:read', 'transport:write', 'transport:delete',
    'students:read',
    'classes:read',
    'sections:read',
    'dashboard:read',
    'communications:read', 'communications:write', 'communications:delete',
  ],

  principal: [
    'students:read',
    'teachers:read',
    'parents:read',
    'classes:read',
    'sections:read',
    'subjects:read',
    'marks:read',
    'timetables:read',
    'holidays:read',
    'leaves:read', 'leaves:approve',
    'academic-years:read',
    'session-hours:read',
    'dashboard:read',
    'communications:read', 'communications:write',
    'assignments:read', 'assignments:write',
    'books:read',
    'hostels:read',
    'transport:read',
    'employees:read',
    'reports:read', 'reports:export',
    'fees:read',
    'expenses:read',
  ],

  exam_incharge: [
    'students:read',
    'classes:read',
    'sections:read',
    'subjects:read',
    'marks:read', 'marks:write',
    'timetables:read',
    'holidays:read',
    'academic-years:read',
    'session-hours:read',
    'dashboard:read',
    'communications:read',
  ],

  curriculum_incharge: [
    'subjects:read', 'subjects:write', 'subjects:delete',
    'classes:read',
    'sections:read',
    'students:read',
    'teachers:read',
    'timetables:read', 'timetables:write',
    'holidays:read',
    'academic-years:read',
    'session-hours:read',
    'dashboard:read',
    'leaves:read', 'leaves:write',
    'communications:read',
  ],
};

async function seed() {
  const transaction = await sequelize.transaction();

  try {
    console.log('Seeding permissions...');

    // Upsert all permissions
    for (const perm of PERMISSIONS) {
      await Permission.findOrCreate({
        where: { name: perm.name },
        defaults: perm,
        transaction
      });
    }

    console.log(`Seeded ${PERMISSIONS.length} permissions`);

    // Map each role to its permissions
    for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await Role.findOne({
        where: sequelize.where(
          sequelize.fn('LOWER', sequelize.col('name')),
          roleName.toLowerCase()
        ),
        transaction
      });
      if (!role) {
        console.warn(`Role '${roleName}' not found, skipping permission assignment`);
        continue;
      }

      for (const permName of permissionNames) {
        const permission = await Permission.findOne({ where: { name: permName }, transaction });
        if (!permission) {
          console.warn(`Permission '${permName}' not found, skipping`);
          continue;
        }

        await RolePermission.findOrCreate({
          where: { role_id: role.id, permission_id: permission.id },
          defaults: { role_id: role.id, permission_id: permission.id },
          transaction
        });
      }

      console.log(`Assigned ${permissionNames.length} permissions to '${roleName}'`);
    }

    await transaction.commit();
    console.log('RBAC seed completed successfully');
  } catch (err) {
    await transaction.rollback();
    console.error('RBAC seed failed:', err);
    throw err;
  }
}

// Run if invoked directly
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seed, PERMISSIONS, ROLE_PERMISSIONS };
