/**
 * Migrates records from the legacy `teacher` table into the normalized
 * V1 `persons` + `teachers` tables so that the React app can rely on the
 * new API without falling back to legacy endpoints.
 *
 * The script is idempotent — it skips teachers whose employee id already
 * exists for the target school. Run it whenever new legacy records are added.
 */

const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TARGET_SCHOOL_ID = Number(process.env.DEFAULT_SCHOOL_ID || 1);
const TARGET_BRANCH_CODE = process.env.DEFAULT_BRANCH_CODE || 'MAIN';
const DEFAULT_JOIN_DATE = new Date(2018, 5, 1); // June 1, 2018
const MIN_TARGET_COUNT = Number(process.env.MIN_V1_TEACHER_TARGET || 5);
const SAMPLE_TEACHERS = [
  {
    uid: -101,
    fname: 'Aisha',
    lname: 'Sharma',
    gen: 'female',
    dob: '1987-04-12',
    idno: 'ALPHA-ENG-001',
    bg: 'O+',
    rel: 'Hindu',
    email: 'aisha.sharma@alphatimes.edu',
    address: '45 Teacher Colony, Hyderabad',
    phone: '9000000101',
    skills: 'M.A. English, B.Ed',
    sphoto: null,
    subject: 'English',
    salary: '52000',
    active: 1,
  },
  {
    uid: -102,
    fname: 'Rahul',
    lname: 'Menon',
    gen: 'male',
    dob: '1985-09-23',
    idno: 'ALPHA-MATH-002',
    bg: 'A+',
    rel: 'Hindu',
    email: 'rahul.menon@alphatimes.edu',
    address: '12 Jubilee Hills, Hyderabad',
    phone: '9000000102',
    skills: 'M.Sc. Mathematics, NET',
    sphoto: null,
    subject: 'Mathematics',
    salary: '54000',
    active: 1,
  },
  {
    uid: -103,
    fname: 'Fatima',
    lname: 'Syed',
    gen: 'female',
    dob: '1988-01-15',
    idno: 'ALPHA-SCI-003',
    bg: 'B+',
    rel: 'Muslim',
    email: 'fatima.syed@alphatimes.edu',
    address: '18 Banjara Hills, Hyderabad',
    phone: '9000000103',
    skills: 'M.Sc. Biology',
    sphoto: null,
    subject: 'Science',
    salary: '53000',
    active: 1,
  },
  {
    uid: -104,
    fname: 'Vikram',
    lname: 'Kulkarni',
    gen: 'male',
    dob: '1984-06-08',
    idno: 'ALPHA-SOC-004',
    bg: 'AB+',
    rel: 'Hindu',
    email: 'vikram.kulkarni@alphatimes.edu',
    address: '33 Begumpet, Hyderabad',
    phone: '9000000104',
    skills: 'M.A. History',
    sphoto: null,
    subject: 'Social Science',
    salary: '50000',
    active: 1,
  },
  {
    uid: -105,
    fname: 'Meera',
    lname: 'Iyer',
    gen: 'female',
    dob: '1989-11-30',
    idno: 'ALPHA-COMP-005',
    bg: 'O-',
    rel: 'Hindu',
    email: 'meera.iyer@alphatimes.edu',
    address: '27 Gachibowli, Hyderabad',
    phone: '9000000105',
    skills: 'MCA',
    sphoto: null,
    subject: 'Computer Science',
    salary: '55000',
    active: 1,
  },
];

const DB_CONFIG = {
  host: process.env.DB_HOST || process.env.HOST || 'localhost',
  user: process.env.DB_USER || process.env.USER || 'root',
  password: process.env.DB_PASSWORD || process.env.PASSWORD || '',
  database: process.env.DB_NAME || process.env.DATABASE || 'sms',
  port: Number(process.env.DB_PORT || 3306),
  multipleStatements: false,
};

const BLOOD_GROUPS = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

const normalizeString = (value, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : fallback;
};

const normalizeGender = (value) => {
  const token = normalizeString(value).toLowerCase();
  if (['male', 'm', '1'].includes(token)) return 'male';
  if (['female', 'f', '0', '2'].includes(token)) return 'female';
  if (['other', 'o', '3'].includes(token)) return 'other';
  return 'other';
};

const normalizeBloodGroup = (value) => {
  const token = normalizeString(value).toUpperCase();
  return BLOOD_GROUPS.has(token) ? token : null;
};

const parseDate = (value, fallback) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return fallback;
    }

    const iso = new Date(normalized);
    if (!Number.isNaN(iso.getTime())) {
      return iso;
    }

    const tokens = normalized.split(/[-/]/).map((part) => Number(part));
    if (tokens.length === 3 && tokens.every((part) => Number.isFinite(part))) {
      const [a, b, c] = tokens;
      // Detect dd-mm-yyyy vs yyyy-mm-dd
      if (a > 1900) {
        return new Date(a, (b || 1) - 1, c || 1);
      }
      if (c > 1900) {
        return new Date(c, (b || 1) - 1, a || 1);
      }
      return new Date(a, (b || 1) - 1, c || 1);
    }
  }

  return fallback;
};

const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const toJoinDate = (index) => {
  const clone = new Date(DEFAULT_JOIN_DATE);
  clone.setDate(clone.getDate() + index * 17);
  return formatDate(clone);
};

const toDob = (value, fallbackYear = 1988) => {
  const fallbackDate = new Date(fallbackYear, 0, 1);
  const parsed = parseDate(value, fallbackDate);
  return formatDate(parsed);
};

const toSalary = (value) => {
  const num = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(num) ? num : null;
};

const toStatus = (value) => {
  if (value === null || value === undefined) return 'inactive';
  const str = String(value).trim().toLowerCase();
  return str === '1' || str === 'active' ? 'active' : 'inactive';
};

async function ensureSchool(connection, schoolId) {
  const [rows] = await connection.execute('SELECT id FROM schools WHERE id = ?', [schoolId]);
  if (!rows.length) {
    throw new Error(
      `School with id ${schoolId} not found. Please seed the default school before running this migration.`
    );
  }
  return rows[0].id;
}

async function ensureBranch(connection, schoolId) {
  const [rows] = await connection.execute(
    'SELECT id FROM school_branches WHERE school_id = ? ORDER BY id ASC LIMIT 1',
    [schoolId]
  );
  if (rows.length) {
    return rows[0].id;
  }
  const [result] = await connection.execute(
    `INSERT INTO school_branches (
      school_id, code, name, branch_type, city, state, country,
      has_library, has_playground, has_canteen, has_hostel, has_transport,
      is_active, created_at, updated_at
    ) VALUES (?, ?, 'Main Campus', 'main', 'Hyderabad', 'Telangana', 'India',
      1, 1, 1, 0, 1, 1, NOW(), NOW())`,
    [schoolId, TARGET_BRANCH_CODE]
  );
  return result.insertId;
}

async function fetchLegacyTeachers(connection) {
  const [rows] = await connection.query('SELECT * FROM teacher ORDER BY uid ASC');
  return rows;
}

async function teacherExists(connection, schoolId, employeeId) {
  const [rows] = await connection.execute(
    'SELECT id FROM teachers WHERE school_id = ? AND employee_id = ? LIMIT 1',
    [schoolId, employeeId]
  );
  return rows.length > 0;
}

async function resolveUniqueIdNumber(connection, candidate) {
  const idNumber = normalizeString(candidate, null);
  if (!idNumber) {
    return null;
  }
  const [rows] = await connection.execute(
    'SELECT id FROM persons WHERE id_number = ? LIMIT 1',
    [idNumber]
  );
  return rows.length ? null : idNumber;
}

async function insertPerson(connection, legacyTeacher) {
  const firstName = normalizeString(legacyTeacher.fname, 'Teacher');
  const lastName = normalizeString(legacyTeacher.lname, 'Staff');
  const gender = normalizeGender(legacyTeacher.gen);
  const dob = toDob(legacyTeacher.dob);
  const bloodGroup = normalizeBloodGroup(legacyTeacher.bg);
  const phone = normalizeString(legacyTeacher.phone, null);
  const address = normalizeString(legacyTeacher.address, null);
  const photoUrl = normalizeString(legacyTeacher.sphoto, '') || null;
  const idNumber = await resolveUniqueIdNumber(connection, legacyTeacher.idno);

  const [result] = await connection.execute(
    `INSERT INTO persons (
      user_id, first_name, last_name, gender, date_of_birth,
      blood_group, religion, id_number, phone, address_line1,
      city, state, postal_code, country, photo_url, created_at, updated_at
    ) VALUES (
      NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Hyderabad', 'Telangana', NULL, 'India', ?, NOW(), NOW()
    )`,
    [firstName, lastName, gender, dob, bloodGroup, legacyTeacher.rel || null, idNumber, phone, address, photoUrl]
  );

  return result.insertId;
}

async function resolveUniqueEmployeeId(connection, desiredId) {
  if (!desiredId) {
    throw new Error('Employee id is required to resolve uniqueness');
  }
  let candidate = desiredId;
  let counter = 1;
  /* eslint-disable no-await-in-loop */
  while (true) {
    const [rows] = await connection.execute(
      'SELECT id FROM teachers WHERE employee_id = ? LIMIT 1',
      [candidate]
    );
    if (!rows.length) {
      return candidate;
    }
    candidate = `${desiredId}-${counter}`;
    counter += 1;
  }
}

async function insertTeacher(connection, { personId, branchId, legacyTeacher, index }) {
  const employeeIdSource = normalizeString(legacyTeacher.idno);
  const desiredEmployeeId = employeeIdSource || `LEGACY-TCH-${legacyTeacher.uid}`;
  const employeeId = await resolveUniqueEmployeeId(connection, desiredEmployeeId);
  const joinDate = toJoinDate(index);
  const designation = normalizeString(legacyTeacher.subject, 'Teacher');
  const qualification = normalizeString(legacyTeacher.skills, null);
  const specialization = designation;
  const salary = toSalary(legacyTeacher.salary);
  const status = toStatus(legacyTeacher.active);

  await connection.execute(
    `INSERT INTO teachers (
      person_id, school_id, branch_id, employee_id,
      join_date, joining_date, designation, qualification,
      specialization, experience_years, employment_status,
      status, salary, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NOW(), NOW())`,
    [
      personId,
      TARGET_SCHOOL_ID,
      branchId,
      employeeId,
      joinDate,
      joinDate,
      designation,
      qualification,
      specialization,
      status,
      status,
      salary,
    ]
  );
}

async function migrate() {
  const connection = await mysql.createConnection(DB_CONFIG);
  try {
    await ensureSchool(connection, TARGET_SCHOOL_ID);
    const branchId = await ensureBranch(connection, TARGET_SCHOOL_ID);
    const legacyTeachers = await fetchLegacyTeachers(connection);
    const teachersToProcess = [...legacyTeachers];
    const shouldBootstrapSamples = TARGET_SCHOOL_ID === 1;

    if (shouldBootstrapSamples && teachersToProcess.length < MIN_TARGET_COUNT) {
      const needed = Math.min(
        SAMPLE_TEACHERS.length,
        MIN_TARGET_COUNT - teachersToProcess.length
      );
      teachersToProcess.push(...SAMPLE_TEACHERS.slice(0, needed));
    }

    if (!teachersToProcess.length) {
      console.log('No legacy teachers found, nothing to migrate.');
      await connection.end();
      return;
    }

    let migrated = 0;
    for (let index = 0; index < teachersToProcess.length; index += 1) {
      const legacyTeacher = teachersToProcess[index];
      const employeeIdSource = normalizeString(legacyTeacher.idno);
      const employeeId = employeeIdSource || `LEGACY-TCH-${legacyTeacher.uid}`;

      if (await teacherExists(connection, TARGET_SCHOOL_ID, employeeId)) {
        continue;
      }

      const personId = await insertPerson(connection, legacyTeacher);
      await insertTeacher(connection, { personId, branchId, legacyTeacher, index });
      migrated += 1;
    }

    console.log(`Legacy teacher migration completed. Migrated ${migrated} record(s).`);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  migrate().catch((error) => {
    console.error('Legacy teacher migration failed:', error);
    process.exit(1);
  });
}
