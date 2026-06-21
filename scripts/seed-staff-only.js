const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const SCHOOL_CODE = process.env.STAFF_SCHOOL_CODE || 'CORP001';
const BRANCH_CODES = ['MAIN', 'TECHPARK'];

const STAFF_MEMBERS = [
  {
    employeeId: 'STF-ADM-001',
    branchCode: 'MAIN',
    department: 'administration',
    designation: 'Director of Administration',
    joiningDate: '2014-04-01',
    user: {
      role: 'admin',
      email: 'corporate.admin@sunrise.edu',
      password: 'Admin@123',
      firstName: 'Kabir',
      lastName: 'Sharma',
      gender: 'male',
      dob: '1981-07-12',
      phone: '9988776611'
    }
  },
  {
    employeeId: 'STF-OPS-001',
    branchCode: 'MAIN',
    department: 'administration',
    designation: 'Head of Operations',
    joiningDate: '2016-04-01',
    user: {
      role: 'management',
      email: 'operations.head@sunrise.edu',
      password: 'Ops@123',
      firstName: 'Sanjana',
      lastName: 'Menon',
      gender: 'female',
      dob: '1984-02-03',
      phone: '9988773311'
    }
  },
  {
    employeeId: 'STF-ACD-001',
    branchCode: 'MAIN',
    department: 'other',
    designation: 'Academic Coordinator',
    joiningDate: '2016-06-01',
    user: {
      role: 'subjects',
      email: 'academics.coordinator@sunrise.edu',
      password: 'Academics@123',
      firstName: 'Arvind',
      lastName: 'Bhagat',
      gender: 'male',
      dob: '1983-12-02',
      phone: '9988772244'
    }
  },
  {
    employeeId: 'STF-ACC-001',
    branchCode: 'MAIN',
    department: 'accounts',
    designation: 'Senior Accounts Manager',
    joiningDate: '2015-04-10',
    user: {
      role: 'accounts',
      email: 'accounts.manager@sunrise.edu',
      password: 'Accounts@123',
      firstName: 'Arvind',
      lastName: 'Rao',
      gender: 'male',
      dob: '1986-11-20',
      phone: '9988779911'
    }
  },
  {
    employeeId: 'STF-EXM-001',
    branchCode: 'MAIN',
    department: 'exam',
    designation: 'Chief Examination Controller',
    joiningDate: '2016-05-15',
    user: {
      role: 'exam',
      email: 'exam.controller@sunrise.edu',
      password: 'Exam@123',
      firstName: 'Divya',
      lastName: 'Iyer',
      gender: 'female',
      dob: '1985-05-09',
      phone: '9988775511'
    }
  },
  {
    employeeId: 'STF-LIB-001',
    branchCode: 'MAIN',
    department: 'library',
    designation: 'Head Librarian',
    joiningDate: '2017-04-01',
    user: {
      role: 'library',
      email: 'library.manager@sunrise.edu',
      password: 'Library@123',
      firstName: 'Neelam',
      lastName: 'Saxena',
      gender: 'female',
      dob: '1987-03-14',
      phone: '9988776619'
    }
  },
  {
    employeeId: 'STF-TRN-001',
    branchCode: 'MAIN',
    department: 'transport',
    designation: 'Transport Lead',
    joiningDate: '2018-04-01',
    user: {
      role: 'transport',
      email: 'transport.manager@sunrise.edu',
      password: 'Transport@123',
      firstName: 'Prakash',
      lastName: 'Gowda',
      gender: 'male',
      dob: '1988-08-14',
      phone: '9988774433'
    }
  },
  {
    employeeId: 'STF-HOS-001',
    branchCode: 'MAIN',
    department: 'hostel',
    designation: 'Hostel Supervisor',
    joiningDate: '2017-06-20',
    person: {
      firstName: 'Shalini',
      lastName: 'George',
      gender: 'female',
      dob: '1989-05-18',
      phone: '9988773322'
    }
  },
  {
    employeeId: 'STF-TECH-ADM-001',
    branchCode: 'TECHPARK',
    department: 'administration',
    designation: 'Branch Administrator',
    joiningDate: '2018-05-05',
    person: {
      firstName: 'Vivek',
      lastName: 'Mahajan',
      gender: 'male',
      dob: '1987-06-08',
      phone: '9988776655'
    }
  },
  {
    employeeId: 'STF-TECH-EXM-001',
    branchCode: 'TECHPARK',
    department: 'exam',
    designation: 'Exam Coordinator',
    joiningDate: '2019-04-20',
    person: {
      firstName: 'Alok',
      lastName: 'Suryavanshi',
      gender: 'male',
      dob: '1988-09-05',
      phone: '9988771993'
    }
  },
  {
    employeeId: 'STF-TECH-LIB-001',
    branchCode: 'TECHPARK',
    department: 'library',
    designation: 'Library Coordinator',
    joiningDate: '2019-06-12',
    person: {
      firstName: 'Roshni',
      lastName: 'Kulkarni',
      gender: 'female',
      dob: '1990-11-22',
      phone: '9988779044'
    }
  },
  {
    employeeId: 'STF-TECH-ACC-001',
    branchCode: 'TECHPARK',
    department: 'accounts',
    designation: 'Accounts Executive',
    joiningDate: '2020-04-01',
    person: {
      firstName: 'Bhavya',
      lastName: 'Shekhar',
      gender: 'female',
      dob: '1991-02-12',
      phone: '9988773335'
    }
  },
  {
    employeeId: 'STF-TECH-TRN-001',
    branchCode: 'TECHPARK',
    department: 'transport',
    designation: 'Transport Coordinator',
    joiningDate: '2020-05-10',
    person: {
      firstName: 'Rakesh',
      lastName: 'Chandra',
      gender: 'male',
      dob: '1986-04-30',
      phone: '9988775533'
    }
  }
];

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    await connection.beginTransaction();

    const school = await fetchSchool(connection);
    const branchMap = await fetchBranches(connection, school.id);
    const roleMap = await fetchRoles(connection);

    for (const member of STAFF_MEMBERS) {
      const branchId = branchMap.get(member.branchCode);
      if (!branchId) {
        throw new Error(`Branch code ${member.branchCode} not found for school ${SCHOOL_CODE}`);
      }

      let personId;
      if (member.user) {
        const roleId = roleMap.get(member.user.role);
        if (!roleId) throw new Error(`Role ${member.user.role} not found`);
        personId = await ensureUserAndPerson(connection, school.id, member.user, roleId);
      } else {
        personId = await ensurePerson(connection, member.person);
      }

      await ensureStaffRecord(connection, {
        personId,
        schoolId: school.id,
        branchId,
        employeeId: member.employeeId,
        department: member.department,
        designation: member.designation,
        joiningDate: member.joiningDate
      });
    }

    await connection.commit();
    console.log('\n✅ Staff provisioning complete for school', SCHOOL_CODE);
  } catch (error) {
    await connection.rollback();
    console.error('\n❌ Staff provisioning failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

async function fetchSchool(connection) {
  const [rows] = await connection.execute(
    'SELECT id, name FROM schools WHERE code = ? LIMIT 1',
    [SCHOOL_CODE]
  );
  if (rows.length === 0) {
    throw new Error(`School with code ${SCHOOL_CODE} not found. Please seed the school first.`);
  }
  return rows[0];
}

async function fetchBranches(connection, schoolId) {
  const [rows] = await connection.execute(
    'SELECT id, code FROM school_branches WHERE school_id = ?',
    [schoolId]
  );
  const map = new Map();
  rows.forEach((row) => map.set(row.code, row.id));
  return map;
}

async function fetchRoles(connection) {
  const [rows] = await connection.execute('SELECT id, name FROM roles');
  const map = new Map();
  rows.forEach((row) => map.set(row.name, row.id));
  return map;
}

async function ensureUserAndPerson(connection, schoolId, profile, roleId) {
  const [existing] = await connection.execute(
    'SELECT u.id as user_id, p.id as person_id FROM users u LEFT JOIN persons p ON p.user_id = u.id WHERE u.email = ? LIMIT 1',
    [profile.email]
  );

  if (existing.length > 0) {
    if (existing[0].person_id) {
      return existing[0].person_id;
    }
    const personId = await createPerson(connection, {
      userId: existing[0].user_id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      gender: profile.gender,
      dob: profile.dob,
      phone: profile.phone
    });
    return personId;
  }

  const passwordHash = await bcrypt.hash(profile.password, 10);
  const [userResult] = await connection.execute(
    `INSERT INTO users (school_id, email, password_hash, role_id, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())`,
    [schoolId, profile.email, passwordHash, roleId]
  );

  const personId = await createPerson(connection, {
    userId: userResult.insertId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    gender: profile.gender,
    dob: profile.dob,
    phone: profile.phone
  });

  return personId;
}

async function ensurePerson(connection, profile) {
  const [existing] = await connection.execute(
    'SELECT id FROM persons WHERE first_name = ? AND last_name = ? AND date_of_birth = ? LIMIT 1',
    [profile.firstName, profile.lastName, profile.dob]
  );
  if (existing.length > 0) return existing[0].id;

  return createPerson(connection, {
    userId: null,
    firstName: profile.firstName,
    lastName: profile.lastName,
    gender: profile.gender,
    dob: profile.dob,
    phone: profile.phone
  });
}

async function createPerson(connection, { userId, firstName, lastName, gender, dob, phone }) {
  const [result] = await connection.execute(
    `INSERT INTO persons (
      user_id, first_name, last_name, gender, date_of_birth,
      phone, address_line1, city, state, country, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'India', NOW(), NOW())`,
    [
      userId,
      firstName,
      lastName,
      gender,
      dob,
      phone,
      'Sunrise Corporate Campus',
      'Bengaluru',
      'Karnataka'
    ]
  );
  return result.insertId;
}

async function ensureStaffRecord(connection, staff) {
  const [existing] = await connection.execute(
    'SELECT id FROM staff WHERE employee_id = ? OR person_id = ? LIMIT 1',
    [staff.employeeId, staff.personId]
  );
  if (existing.length > 0) {
    console.log(`• Staff ${staff.employeeId} already present, skipping.`);
    return;
  }
  await connection.execute(
    `INSERT INTO staff (
      person_id, school_id, branch_id, employee_id,
      department, designation, joining_date, employment_status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
    [
      staff.personId,
      staff.schoolId,
      staff.branchId,
      staff.employeeId,
      staff.department,
      staff.designation,
      staff.joiningDate
    ]
  );
  console.log(`• Staff ${staff.employeeId} inserted.`);
}

main();
