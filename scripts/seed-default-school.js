const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({
  path: path.join(__dirname, '../.env')
});

const DEFAULT_CLASS_TEMPLATES = [
  { name: 'Grade 1', numericGrade: 1, displayOrder: 1 },
  { name: 'Grade 2', numericGrade: 2, displayOrder: 2 },
  { name: 'Grade 3', numericGrade: 3, displayOrder: 3 },
  { name: 'Grade 4', numericGrade: 4, displayOrder: 4 }
];

const SECTION_TEMPLATES = ['Section A', 'Section B'];

const FALLBACK_STUDENTS = [
  {
    fname: 'Aaron',
    lname: 'Sharma',
    gen: 'male',
    dob_date: '2012-05-14',
    roll: 'AT-101',
    email: 'aaron.sharma@example.com',
    phone: '9000000001',
    sanumber: 'ADM-AT-101'
  },
  {
    fname: 'Bhavya',
    lname: 'Iyer',
    gen: 'female',
    dob_date: '2011-11-02',
    roll: 'AT-102',
    email: 'bhavya.iyer@example.com',
    phone: '9000000002',
    sanumber: 'ADM-AT-102'
  },
  {
    fname: 'Chirag',
    lname: 'Verma',
    gen: 'male',
    dob_date: '2010-09-30',
    roll: 'AT-103',
    email: 'chirag.verma@example.com',
    phone: '9000000003',
    sanumber: 'ADM-AT-103'
  },
  {
    fname: 'Diya',
    lname: 'Kulkarni',
    gen: 'female',
    dob_date: '2013-01-22',
    roll: 'AT-104',
    email: 'diya.k@example.com',
    phone: '9000000004',
    sanumber: 'ADM-AT-104'
  },
  {
    fname: 'Eshan',
    lname: 'Mehta',
    gen: 'male',
    dob_date: '2012-07-18',
    roll: 'AT-105',
    email: 'eshan.mehta@example.com',
    phone: '9000000005',
    sanumber: 'ADM-AT-105'
  }
];

const dbConfig = {
  host: process.env.DB_HOST || process.env.HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || process.env.USER || 'root',
  password: process.env.DB_PASSWORD || process.env.PASSWORD || '',
  database: process.env.DB_NAME || process.env.DATABASE || 'sms',
  multipleStatements: false
};

const DEFAULT_SCHOOL_ID = Number(process.env.DEFAULT_SCHOOL_ID || 1);
const DEFAULT_BRANCH_CODE = process.env.DEFAULT_BRANCH_CODE || 'MAIN';

const pad = (value) => String(value).padStart(2, '0');

const formatDate = (date, fallback = new Date('2010-01-01')) => {
  const target = date instanceof Date && !Number.isNaN(date.getTime()) ? date : fallback;
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
};

const parseDate = (input) => {
  if (!input) {
    return null;
  }

  if (input instanceof Date) {
    return input;
  }

  const native = new Date(input);
  if (!Number.isNaN(native.getTime())) {
    return native;
  }

  const parts = String(input)
    .trim()
    .split(/[-/]/)
    .map((token) => Number(token));

  if (parts.length === 3 && parts.every((token) => !Number.isNaN(token) && token > 0)) {
    const [part1, part2, part3] = parts;
    if (part3 > 31) {
      return new Date(part1, part2 - 1, part3);
    }
    if (part1 > 31) {
      return new Date(part1, part2 - 1, part3);
    }
    return new Date(part3, part2 - 1, part1);
  }

  return null;
};

const normalizeGender = (value) => {
  if (!value) {
    return 'other';
  }
  const normalized = String(value).toLowerCase();
  if (normalized.startsWith('m')) {
    return 'male';
  }
  if (normalized.startsWith('f')) {
    return 'female';
  }
  if (normalized.includes('prefer')) {
    return 'prefer_not_to_say';
  }
  return 'other';
};

const ensureSchoolExists = async (connection, schoolId) => {
  const [rows] = await connection.query('SELECT id FROM schools WHERE id = ?', [schoolId]);
  if (rows.length) {
    return rows[0].id;
  }

  const [result] = await connection.query(
    `INSERT INTO schools (
      id, code, name, short_name, school_type, affiliation, country,
      is_active, subscription_plan, max_students, max_staff, created_at, updated_at
    ) VALUES (?, 'DEFAULT', 'Default School', 'Default', 'k12', 'Not Specified',
      'India', 1, 'standard', 500, 50, NOW(), NOW())`,
    [schoolId]
  );

  console.log(`➕ Created default school record with id ${result.insertId || schoolId}`);
  return schoolId;
};

const ensureBranchExists = async (connection, schoolId) => {
  const [rows] = await connection.query(
    'SELECT id FROM school_branches WHERE school_id = ? AND deleted_at IS NULL LIMIT 1',
    [schoolId]
  );

  if (rows.length) {
    return rows[0].id;
  }

  const [result] = await connection.query(
    `INSERT INTO school_branches (
      school_id, code, name, branch_type, city, state, country,
      has_library, has_playground, has_canteen, has_hostel, has_transport,
      is_active, created_at, updated_at
    ) VALUES (?, ?, 'Main Campus', 'main', 'Bengaluru', 'Karnataka', 'India',
      1, 1, 1, 0, 1, 1, NOW(), NOW())`,
    [schoolId, DEFAULT_BRANCH_CODE]
  );

  console.log(`➕ Created default branch for school ${schoolId} with id ${result.insertId}`);
  return result.insertId;
};

const ensureAcademicYear = async (connection, schoolId) => {
  const [rows] = await connection.query(
    'SELECT id FROM academic_years WHERE school_id = ? ORDER BY is_current DESC, id DESC LIMIT 1',
    [schoolId]
  );

  if (rows.length) {
    return rows[0].id;
  }

  const now = new Date();
  const cutoff = new Date(now.getFullYear(), 3, 1); // April 1st of current year
  const startYear = now >= cutoff ? now.getFullYear() : now.getFullYear() - 1;
  const endYear = startYear + 1;
  const startDate = `${startYear}-04-01`;
  const endDate = `${endYear}-03-31`;
  const label = `${startYear}-${endYear}`;

  const [result] = await connection.query(
    `INSERT INTO academic_years (
      school_id, name, start_date, end_date, is_current, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
    [schoolId, label, startDate, endDate]
  );

  console.log(`➕ Created academic year ${label} for school ${schoolId}`);
  return result.insertId;
};

const ensureClassesAndSections = async (connection, branchId, academicYearId) => {
  const [existingClasses] = await connection.query(
    'SELECT id, name FROM classes WHERE branch_id = ? AND academic_year_id = ? AND deleted_at IS NULL ORDER BY display_order ASC, id ASC',
    [branchId, academicYearId]
  );

  const classesToUse = existingClasses.length ? existingClasses : await Promise.all(
    DEFAULT_CLASS_TEMPLATES.map(async (template) => {
      const [result] = await connection.query(
        `INSERT INTO classes (
          academic_year_id, branch_id, name, numeric_grade, display_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [academicYearId, branchId, template.name, template.numericGrade, template.displayOrder]
      );
      console.log(`➕ Created class ${template.name}`);
      return { id: result.insertId, name: template.name };
    })
  );

  const classWithSections = [];

  for (const cls of classesToUse) {
    let [sections] = await connection.query(
      'SELECT id, name FROM sections WHERE class_id = ? AND deleted_at IS NULL ORDER BY id ASC',
      [cls.id]
    );

    if (!sections.length) {
      sections = [];
      for (const sectionName of SECTION_TEMPLATES) {
        const [result] = await connection.query(
          `INSERT INTO sections (class_id, name, max_students, room_number, created_at, updated_at)
           VALUES (?, ?, 40, NULL, NOW(), NOW())`,
          [cls.id, sectionName]
        );
        sections.push({ id: result.insertId, name: sectionName });
        console.log(`➕ Created ${sectionName} for ${cls.name}`);
      }
    }

    classWithSections.push({
      ...cls,
      sections
    });
  }

  return classWithSections;
};

const fetchLegacyStudents = async (connection) => {
  const [rows] = await connection.query(
    `SELECT uid, fname, lname, gen, dob, dob_date, roll, email, phone, sphoto,
            sanumber, admissiondate, admitted_at
     FROM student
     WHERE deleted_at IS NULL
     ORDER BY uid ASC`
  );
  return rows;
};

const ensurePerson = async (connection, legacyStudent) => {
  const firstName = (legacyStudent.fname || 'Student').trim();
  const lastName = (legacyStudent.lname || 'Alpha').trim();
  const gender = normalizeGender(legacyStudent.gen);
  const dob =
    parseDate(legacyStudent.dob_date) ||
    parseDate(legacyStudent.dob) ||
    new Date('2010-01-01');

  const [result] = await connection.query(
    `INSERT INTO persons (
      first_name, last_name, middle_name, email, gender, date_of_birth,
      phone, photo_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      firstName,
      lastName,
      null,
      legacyStudent.email || null,
      gender,
      formatDate(dob),
      legacyStudent.phone || null,
      legacyStudent.sphoto ? `/photos/${legacyStudent.sphoto}` : null
    ]
  );

  return result.insertId;
};

const backfillLegacyContacts = async (connection, schoolId) => {
  const [result] = await connection.query(
    `UPDATE persons p
     JOIN students s ON s.person_id = p.id AND s.school_id = ?
     JOIN student legacy ON legacy.roll COLLATE utf8mb4_unicode_ci = s.roll_number
     SET p.email = legacy.email
     WHERE (p.email IS NULL OR p.email = '') AND legacy.email IS NOT NULL AND legacy.email <> ''`,
    [schoolId]
  );

  if (result.affectedRows) {
    console.log(`🔁 Backfilled email addresses for ${result.affectedRows} students.`);
  }
};

const migrateStudents = async (connection, options) => {
  const { schoolId, branchId, classWithSections } = options;

  const [existing] = await connection.query(
    'SELECT COUNT(*) AS total FROM students WHERE school_id = ?',
    [schoolId]
  );

  if (existing[0].total > 0) {
    console.log(
      `ℹ️  ${existing[0].total} student records already present for school ${schoolId}. Skipping migration.`
    );
    await backfillLegacyContacts(connection, schoolId);
    return { inserted: 0 };
  }

  let legacyStudents = await fetchLegacyStudents(connection);

  if (!legacyStudents.length) {
    console.log('⚠️  No legacy student records found. Using fallback demo data.');
    legacyStudents = FALLBACK_STUDENTS.map((student, index) => ({
      ...student,
      uid: 1000 + index,
      admissiondate: '2020-06-01'
    }));
  }

  if (!classWithSections.length) {
    throw new Error('No classes available to assign students. Please seed classes first.');
  }

  const classCount = classWithSections.length;
  const insertedStudents = [];

  await connection.beginTransaction();
  try {
    for (let idx = 0; idx < legacyStudents.length; idx++) {
      const legacy = legacyStudents[idx];
      const classInfo = classWithSections[idx % classCount];
      const sections = classInfo.sections;
      const sectionInfo = sections[idx % sections.length];

      const personId = await ensurePerson(connection, legacy);
      const admissionDate =
        parseDate(legacy.admitted_at) ||
        parseDate(legacy.admissiondate) ||
        new Date();

      const admissionNumber =
        (legacy.sanumber && legacy.sanumber.trim()) ||
        `ADM-${schoolId}-${1000 + idx}`;
      const rollNumber =
        (legacy.roll && legacy.roll.trim()) ||
        `${classInfo.name.replace(/\s+/g, '')}-${idx + 1}`;

      await connection.query(
        `INSERT INTO students (
          person_id, school_id, branch_id, admission_number, roll_number,
          class_id, section_id, admission_date, status, emergency_contact,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, NOW(), NOW())`,
        [
          personId,
          schoolId,
          branchId,
          admissionNumber,
          rollNumber,
          classInfo.id,
          sectionInfo.id,
          formatDate(admissionDate, new Date()),
          legacy.phone || null
        ]
      );

      insertedStudents.push({
        name: `${legacy.fname || 'Student'} ${legacy.lname || ''}`.trim(),
        class: classInfo.name,
        section: sectionInfo.name
      });
    }

    await connection.commit();
    console.log(`✅ Inserted ${insertedStudents.length} students for school ${schoolId}.`);
    await backfillLegacyContacts(connection, schoolId);
    return { inserted: insertedStudents.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
};

const run = async () => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    await ensureSchoolExists(connection, DEFAULT_SCHOOL_ID);
    const branchId = await ensureBranchExists(connection, DEFAULT_SCHOOL_ID);
    const academicYearId = await ensureAcademicYear(connection, DEFAULT_SCHOOL_ID);
    const classWithSections = await ensureClassesAndSections(connection, branchId, academicYearId);
    await migrateStudents(connection, {
      schoolId: DEFAULT_SCHOOL_ID,
      branchId,
      classWithSections
    });
    console.log('🎉 Default school data ready.');
  } catch (error) {
    console.error('❌ Failed to seed default school data:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
};

run();
