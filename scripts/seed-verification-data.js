const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const STUDENTS_PER_SECTION = 20;
const SUBJECTS_PER_CLASS = 6;
const SCHOOL_CODE = 'CORP001';

const SCHOOL_CONFIG = {
  code: SCHOOL_CODE,
  name: 'Sunrise Corporate School',
  short_name: 'Sunrise Corporate',
  school_type: 'k12',
  affiliation: 'CBSE',
  affiliation_number: 'CBSE-2025-7788',
  registration_number: 'REG-CORP-7788',
  established_year: 2004,
  logo_url: 'https://cdn.example.com/sunrise/logo.png',
  website: 'https://sunrisecorporateschool.example.com',
  email: 'info@sunrisecorporateschool.example.com',
  phone: '+91-80-4000-1234',
  address_line1: '88 Corporate Avenue, RMZ Ecoworld',
  address_line2: 'Outer Ring Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal_code: '560103',
  country: 'India',
  subscription_plan: 'premium',
  subscription_expires_at: '2026-03-31',
  max_students: 2000,
  max_staff: 250
};

const BRANCHES = [
  {
    code: 'MAIN',
    name: 'Koramangala Corporate Campus',
    branch_type: 'main',
    address_line1: '12, 4th Block',
    address_line2: 'Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code: '560034',
    phone: '+91-80-4000-2233',
    email: 'main@sunrisecorporateschool.example.com',
    established_date: '2004-06-01',
    total_classrooms: 48,
    total_labs: 9,
    has_library: true,
    has_playground: true,
    has_canteen: true,
    has_hostel: false,
    has_transport: true
  },
  {
    code: 'TECHPARK',
    name: 'Electronic City Tech Park Campus',
    branch_type: 'branch',
    address_line1: '22, Hosur Road',
    address_line2: 'Electronic City Phase 1',
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code: '560100',
    phone: '+91-80-4000-9988',
    email: 'techpark@sunrisecorporateschool.example.com',
    established_date: '2015-05-15',
    total_classrooms: 32,
    total_labs: 6,
    has_library: true,
    has_playground: true,
    has_canteen: true,
    has_hostel: false,
    has_transport: true
  }
];

const USER_PROFILES = [
  {
    key: 'admin',
    role_id: 1,
    email: 'corporate.admin@sunrise.edu',
    password: 'Admin@123',
    first_name: 'Kabir',
    last_name: 'Sharma',
    gender: 'male',
    date_of_birth: '1981-07-12',
    phone: '9988776611',
    department: 'management',
    designation: 'Director of Academics'
  },
  {
    key: 'ops',
    role_id: 10,
    email: 'operations.head@sunrise.edu',
    password: 'Ops@123',
    first_name: 'Sanjana',
    last_name: 'Menon',
    gender: 'female',
    date_of_birth: '1984-02-03',
    phone: '9988773311',
    department: 'management',
    designation: 'Head of Operations'
  },
  {
    key: 'accounts',
    role_id: 6,
    email: 'accounts.manager@sunrise.edu',
    password: 'Accounts@123',
    first_name: 'Arvind',
    last_name: 'Rao',
    gender: 'male',
    date_of_birth: '1986-11-20',
    phone: '9988779911',
    department: 'accounts',
    designation: 'Senior Accounts Manager'
  },
  {
    key: 'exam',
    role_id: 8,
    email: 'exam.controller@sunrise.edu',
    password: 'Exam@123',
    first_name: 'Divya',
    last_name: 'Iyer',
    gender: 'female',
    date_of_birth: '1985-05-09',
    phone: '9988775511',
    department: 'exam',
    designation: 'Chief Examination Controller'
  },
  {
    key: 'library',
    role_id: 5,
    email: 'library.manager@sunrise.edu',
    password: 'Library@123',
    first_name: 'Neelam',
    last_name: 'Saxena',
    gender: 'female',
    date_of_birth: '1987-03-14',
    phone: '9988776619',
    department: 'library',
    designation: 'Head Librarian'
  },
  {
    key: 'academics',
    role_id: 6,
    email: 'academics.coordinator@sunrise.edu',
    password: 'Academics@123',
    first_name: 'Arvind',
    last_name: 'Bhagat',
    gender: 'male',
    date_of_birth: '1983-12-02',
    phone: '9988772244',
    department: 'administration',
    designation: 'Academic Coordinator'
  },
  {
    key: 'transport',
    role_id: 9,
    email: 'transport.manager@sunrise.edu',
    password: 'Transport@123',
    first_name: 'Prakash',
    last_name: 'Gowda',
    gender: 'male',
    date_of_birth: '1988-08-14',
    phone: '9988774433',
    department: 'transport',
    designation: 'Transport Manager'
  }
];

const SUBJECT_DEFINITIONS = [
  { code: 'ENG', name: 'English Language & Literature', description: 'CBSE communicative English', credit_hours: 5 },
  { code: 'HIN', name: 'Hindi', description: 'Second language Hindi', credit_hours: 4 },
  { code: 'MAT', name: 'Mathematics', description: 'NCERT Mathematics', credit_hours: 6 },
  { code: 'SCI', name: 'Science', description: 'Integrated Science', credit_hours: 6 },
  { code: 'SST', name: 'Social Science', description: 'History, Civics and Geography', credit_hours: 5 },
  { code: 'CSC', name: 'Computer Science', description: 'Foundational computer applications', credit_hours: 4 }
];

const CURRENT_CLASS_BLUEPRINTS = [
  { academic_year: '2024-2025', branch_code: 'MAIN', name: 'Grade 6', numeric_grade: 6, display_order: 6, sections: ['A', 'B'] },
  { academic_year: '2024-2025', branch_code: 'MAIN', name: 'Grade 7', numeric_grade: 7, display_order: 7, sections: ['A', 'B'] },
  { academic_year: '2024-2025', branch_code: 'MAIN', name: 'Grade 8', numeric_grade: 8, display_order: 8, sections: ['A', 'B'] },
  { academic_year: '2024-2025', branch_code: 'TECHPARK', name: 'Grade 6', numeric_grade: 6, display_order: 16, sections: ['A', 'B'] }
];

const LEGACY_CLASS_BLUEPRINTS = [
  { academic_year: '2023-2024', branch_code: 'MAIN', name: 'Grade 5', numeric_grade: 5, display_order: 5, sections: ['A'] },
  { academic_year: '2023-2024', branch_code: 'TECHPARK', name: 'Grade 5', numeric_grade: 5, display_order: 15, sections: ['A'] }
];

const TEACHER_BLUEPRINTS = [
  { key: 'MAIN-ENG', branch_code: 'MAIN', first_name: 'Aditi', last_name: 'Nair', gender: 'female', qualification: 'M.A. English', specialization: 'English Pedagogy', experience_years: 9.5, joining_date: '2017-06-01', subject_codes: ['ENG'], employee_id: 'T-MAIN-ENG' },
  { key: 'MAIN-HIN', branch_code: 'MAIN', first_name: 'Rashmi', last_name: 'Kulkarni', gender: 'female', qualification: 'M.A. Hindi', specialization: 'Hindi Literature', experience_years: 11.2, joining_date: '2015-06-05', subject_codes: ['HIN'], employee_id: 'T-MAIN-HIN' },
  { key: 'MAIN-MAT', branch_code: 'MAIN', first_name: 'Raghav', last_name: 'Menon', gender: 'male', qualification: 'M.Sc. Mathematics', specialization: 'Applied Mathematics', experience_years: 10.1, joining_date: '2016-05-20', subject_codes: ['MAT'], employee_id: 'T-MAIN-MAT' },
  { key: 'MAIN-SCI', branch_code: 'MAIN', first_name: 'Sneha', last_name: 'Patil', gender: 'female', qualification: 'M.Sc. Science', specialization: 'Physics and Chemistry', experience_years: 8.3, joining_date: '2018-04-12', subject_codes: ['SCI'], employee_id: 'T-MAIN-SCI' },
  { key: 'MAIN-SST', branch_code: 'MAIN', first_name: 'Vikram', last_name: 'Basu', gender: 'male', qualification: 'M.A. History', specialization: 'Social Sciences', experience_years: 12.7, joining_date: '2014-06-18', subject_codes: ['SST'], employee_id: 'T-MAIN-SST' },
  { key: 'MAIN-CSC', branch_code: 'MAIN', first_name: 'Lavanya', last_name: 'Kumar', gender: 'female', qualification: 'MCA', specialization: 'Computer Applications', experience_years: 7.4, joining_date: '2019-07-01', subject_codes: ['CSC'], employee_id: 'T-MAIN-CSC' },
  { key: 'TECH-ENG', branch_code: 'TECHPARK', first_name: 'Farah', last_name: 'Ahmed', gender: 'female', qualification: 'M.A. English', specialization: 'English Communication', experience_years: 6.8, joining_date: '2020-06-25', subject_codes: ['ENG'], employee_id: 'T-TECH-ENG' },
  { key: 'TECH-HIN', branch_code: 'TECHPARK', first_name: 'Sunil', last_name: 'Bhandari', gender: 'male', qualification: 'M.A. Hindi', specialization: 'Secondary Hindi', experience_years: 9.1, joining_date: '2017-04-05', subject_codes: ['HIN'], employee_id: 'T-TECH-HIN' },
  { key: 'TECH-MAT', branch_code: 'TECHPARK', first_name: 'Kiran', last_name: 'Saxena', gender: 'male', qualification: 'M.Sc. Mathematics', specialization: 'Statistics', experience_years: 8.9, joining_date: '2018-05-15', subject_codes: ['MAT'], employee_id: 'T-TECH-MAT' },
  { key: 'TECH-SCI', branch_code: 'TECHPARK', first_name: 'Priya', last_name: 'Raghavan', gender: 'female', qualification: 'M.Sc. Biology', specialization: 'Life Sciences', experience_years: 7.2, joining_date: '2019-06-10', subject_codes: ['SCI'], employee_id: 'T-TECH-SCI' },
  { key: 'TECH-SST', branch_code: 'TECHPARK', first_name: 'Harish', last_name: 'Verma', gender: 'male', qualification: 'M.A. Geography', specialization: 'Socio Economic Studies', experience_years: 10.6, joining_date: '2016-04-01', subject_codes: ['SST'], employee_id: 'T-TECH-SST' },
  { key: 'TECH-CSC', branch_code: 'TECHPARK', first_name: 'Megha', last_name: 'Deshpande', gender: 'female', qualification: 'M.Tech. IT', specialization: 'STEM Integrations', experience_years: 6.1, joining_date: '2020-04-05', subject_codes: ['CSC'], employee_id: 'T-TECH-CSC' }
];

const STAFF_BLUEPRINTS = [
  { key: 'central_admin', branch_code: 'MAIN', department: 'administration', designation: 'Director of Administration', employee_id: 'STF-ADM-001', user_key: 'admin', gender: 'male', first_name: 'Kabir', last_name: 'Sharma', date_of_birth: '1981-07-12', joining_date: '2014-04-01' },
  { key: 'ops_head', branch_code: 'MAIN', department: 'administration', designation: 'Head of Operations', employee_id: 'STF-OPS-001', user_key: 'ops', gender: 'female', first_name: 'Sanjana', last_name: 'Menon', date_of_birth: '1984-02-03', joining_date: '2016-04-01' },
  { key: 'academics_head', branch_code: 'MAIN', department: 'other', designation: 'Academic Coordinator', employee_id: 'STF-ACD-001', user_key: 'academics', gender: 'male', first_name: 'Arvind', last_name: 'Bhagat', date_of_birth: '1983-12-02', joining_date: '2016-06-01' },
  { key: 'accounts_manager', branch_code: 'MAIN', department: 'accounts', designation: 'Senior Accounts Manager', employee_id: 'STF-ACC-001', user_key: 'accounts', gender: 'male', first_name: 'Arvind', last_name: 'Rao', date_of_birth: '1986-11-20', joining_date: '2015-04-10' },
  { key: 'exam_controller', branch_code: 'MAIN', department: 'exam', designation: 'Chief Examination Controller', employee_id: 'STF-EXM-001', user_key: 'exam', gender: 'female', first_name: 'Divya', last_name: 'Iyer', date_of_birth: '1985-05-09', joining_date: '2016-05-15' },
  { key: 'library_manager', branch_code: 'MAIN', department: 'library', designation: 'Head Librarian', employee_id: 'STF-LIB-001', user_key: 'library', gender: 'female', first_name: 'Neelam', last_name: 'Saxena', date_of_birth: '1987-03-14', joining_date: '2017-04-01' },
  { key: 'transport_lead', branch_code: 'MAIN', department: 'transport', designation: 'Transport Lead', employee_id: 'STF-TRN-001', user_key: 'transport', gender: 'male', first_name: 'Prakash', last_name: 'Gowda', date_of_birth: '1988-08-14', joining_date: '2018-04-01' },
  { key: 'hostel_supervisor', branch_code: 'MAIN', department: 'hostel', designation: 'Hostel Supervisor', employee_id: 'STF-HOS-001', user_key: null, gender: 'female', first_name: 'Shalini', last_name: 'George', date_of_birth: '1989-05-18', joining_date: '2017-06-20' },
  { key: 'tech_branch_admin', branch_code: 'TECHPARK', department: 'administration', designation: 'Branch Administrator', employee_id: 'STF-TECH-ADM-001', user_key: null, gender: 'male', first_name: 'Vivek', last_name: 'Mahajan', date_of_birth: '1987-06-08', joining_date: '2018-05-05' },
  { key: 'tech_exam_lead', branch_code: 'TECHPARK', department: 'exam', designation: 'Exam Coordinator', employee_id: 'STF-TECH-EXM-001', user_key: null, gender: 'male', first_name: 'Alok', last_name: 'Suryavanshi', date_of_birth: '1988-09-05', joining_date: '2019-04-20' },
  { key: 'tech_library', branch_code: 'TECHPARK', department: 'library', designation: 'Library Coordinator', employee_id: 'STF-TECH-LIB-001', user_key: null, gender: 'female', first_name: 'Roshni', last_name: 'Kulkarni', date_of_birth: '1990-11-22', joining_date: '2019-06-12' },
  { key: 'tech_accounts', branch_code: 'TECHPARK', department: 'accounts', designation: 'Accounts Executive', employee_id: 'STF-TECH-ACC-001', user_key: null, gender: 'female', first_name: 'Bhavya', last_name: 'Shekhar', date_of_birth: '1991-02-12', joining_date: '2020-04-01' },
  { key: 'tech_transport', branch_code: 'TECHPARK', department: 'transport', designation: 'Transport Coordinator', employee_id: 'STF-TECH-TRN-001', user_key: null, gender: 'male', first_name: 'Rakesh', last_name: 'Chandra', date_of_birth: '1986-04-30', joining_date: '2020-05-10' }
];

const ACADEMIC_YEARS = [
  { name: '2023-2024', start_date: '2023-04-01', end_date: '2024-03-31', is_current: false },
  { name: '2024-2025', start_date: '2024-04-01', end_date: '2025-03-31', is_current: true }
];

const EXAMS = [
  { name: 'Periodic Test 1', exam_type: 'unit_test', start_date: '2024-06-10', end_date: '2024-06-20', result_date: '2024-06-30' },
  { name: 'Mid Term Assessment', exam_type: 'mid_term', start_date: '2024-09-10', end_date: '2024-09-25', result_date: '2024-10-05' },
  { name: 'Annual Examination', exam_type: 'final', start_date: '2025-02-05', end_date: '2025-02-20', result_date: '2025-03-05' }
];

const GRADING_SCALES = [
  { grade: 'A1', min: 91, max: 100, grade_point: 10.0, description: 'Outstanding' },
  { grade: 'A2', min: 81, max: 90, grade_point: 9.0, description: 'Excellent' },
  { grade: 'B1', min: 71, max: 80, grade_point: 8.0, description: 'Very good' },
  { grade: 'B2', min: 61, max: 70, grade_point: 7.0, description: 'Good' },
  { grade: 'C1', min: 51, max: 60, grade_point: 6.0, description: 'Above average' },
  { grade: 'C2', min: 41, max: 50, grade_point: 5.0, description: 'Average' },
  { grade: 'D', min: 33, max: 40, grade_point: 4.0, description: 'Needs improvement' },
  { grade: 'E', min: 0, max: 32.99, grade_point: 0.0, description: 'Fail' }
];

const FEE_DEFINITIONS = [
  { fee_type: 'tuition', due_term: 'annual', amount_by_grade: { 6: 68000, 7: 72000, 8: 76000 } },
  { fee_type: 'exam', due_term: 'term_2', amount_by_grade: { 6: 2500, 7: 2700, 8: 3000 } },
  { fee_type: 'transport', due_term: 'term_1', amount_by_grade: { 6: 18000, 7: 18000, 8: 18000 } }
];

const PERIOD_SUBJECT_SEQUENCE = ['ENG', 'MAT', 'SCI', 'SST'];

const FIRST_NAMES = [
  'Aarav', 'Vihaan', 'Aditya', 'Ishaan', 'Kabir', 'Rohan', 'Kunal', 'Dev', 'Arjun', 'Rahul',
  'Ananya', 'Diya', 'Ira', 'Kiara', 'Myra', 'Sara', 'Meera', 'Ritika', 'Suhani', 'Tara'
];

const LAST_NAMES = [
  'Sharma', 'Iyer', 'Nair', 'Reddy', 'Patel', 'Gupta', 'Bhat', 'Kumar', 'Das', 'Varma',
  'Shetty', 'Rao', 'Chawla', 'Kapoor', 'Menon', 'Mukherjee'
];

const LOCALITIES = [
  'Koramangala', 'Indiranagar', 'Whitefield', 'Jayanagar', 'HSR Layout', 'Malleshwaram',
  'Yelahanka', 'Sarjapur', 'Bannerghatta', 'Hebbal'
];
async function seedVerificationData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    timezone: '+05:30',
    decimalNumbers: true
  });

  const context = {
    connection,
    schoolId: null,
    branchMap: new Map(),
    academicYearMap: new Map(),
    classMap: new Map(),
    sectionMap: new Map(),
    subjectMap: new Map(),
    userMap: new Map(),
    teacherMap: new Map(),
    teacherList: [],
    staffList: [],
    students: [],
    studentBySection: new Map(),
    studentByClass: new Map(),
    enrollmentMap: new Map(),
    feeStructureMap: new Map(),
    studentFeeMap: new Map(),
    examMap: new Map(),
    examScheduleMap: new Map()
  };

  try {
    await ensureSeedIsFresh(context);
    await connection.beginTransaction();

    context.schoolId = await createSchool(context);
    await createBranches(context);
    await createCoreUsers(context);
    await createAcademicYears(context);
    await createClassesAndSections(context, LEGACY_CLASS_BLUEPRINTS);
    await createClassesAndSections(context, CURRENT_CLASS_BLUEPRINTS);
    await createSubjects(context);
    await linkSubjectsToClasses(context);
    await createTeachers(context);
    await createStaff(context);
    await createSalaryRecords(context);
    await createStudentsAndParents(context);
    await createCurrentYearEnrollments(context);
    await createPromotionAndTransferHistory(context);
    await createAttendanceSessions(context);
    await createFeesAndPayments(context);
    await createExamsSchedulesAndMarks(context);
    await createGradingScale(context);

    await connection.commit();
    console.log('');
    console.log('Demo dataset inserted for school code ' + SCHOOL_CODE);
    console.log('   - Branches: ' + context.branchMap.size);
    console.log('   - Classes: ' + context.classMap.size);
    console.log('   - Sections: ' + context.sectionMap.size);
    console.log('   - Students: ' + context.students.length);
    console.log('   - Subjects/Class: ' + SUBJECTS_PER_CLASS + ' | Students/Section: ' + STUDENTS_PER_SECTION);
  } catch (error) {
    await connection.rollback();
    console.error('Demo data seed failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function ensureSeedIsFresh({ connection }) {
  const [rows] = await connection.query('SELECT id FROM schools WHERE code = ?', [SCHOOL_CODE]);
  if (rows.length > 0) {
    throw new Error('School with code ' + SCHOOL_CODE + ' already exists. Remove the verification dataset or update the code before rerunning.');
  }
}

async function createSchool({ connection }) {
  const insertSql = `
    INSERT INTO schools (
      code, name, short_name, school_type, affiliation, affiliation_number,
      registration_number, established_year, logo_url, website, email, phone,
      address_line1, address_line2, city, state, postal_code, country,
      subscription_plan, subscription_expires_at, max_students, max_staff
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    SCHOOL_CONFIG.code,
    SCHOOL_CONFIG.name,
    SCHOOL_CONFIG.short_name,
    SCHOOL_CONFIG.school_type,
    SCHOOL_CONFIG.affiliation,
    SCHOOL_CONFIG.affiliation_number,
    SCHOOL_CONFIG.registration_number,
    SCHOOL_CONFIG.established_year,
    SCHOOL_CONFIG.logo_url,
    SCHOOL_CONFIG.website,
    SCHOOL_CONFIG.email,
    SCHOOL_CONFIG.phone,
    SCHOOL_CONFIG.address_line1,
    SCHOOL_CONFIG.address_line2,
    SCHOOL_CONFIG.city,
    SCHOOL_CONFIG.state,
    SCHOOL_CONFIG.postal_code,
    SCHOOL_CONFIG.country,
    SCHOOL_CONFIG.subscription_plan,
    SCHOOL_CONFIG.subscription_expires_at,
    SCHOOL_CONFIG.max_students,
    SCHOOL_CONFIG.max_staff
  ];
  const [result] = await connection.execute(insertSql, params);
  console.log('- School created');
  return result.insertId;
}

async function createBranches(context) {
  const { connection, schoolId, branchMap } = context;
  const insertSql = `
    INSERT INTO school_branches (
      school_id, code, name, branch_type,
      address_line1, address_line2, city, state, postal_code, country,
      phone, email, established_date, total_classrooms, total_labs,
      has_library, has_playground, has_canteen, has_hostel, has_transport, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
  `;
  for (const branch of BRANCHES) {
    const params = [
      schoolId,
      branch.code,
      branch.name,
      branch.branch_type,
      branch.address_line1,
      branch.address_line2,
      branch.city,
      branch.state,
      branch.postal_code,
      'India',
      branch.phone,
      branch.email,
      branch.established_date,
      branch.total_classrooms,
      branch.total_labs,
      branch.has_library,
      branch.has_playground,
      branch.has_canteen,
      branch.has_hostel,
      branch.has_transport
    ];
    const [result] = await connection.execute(insertSql, params);
    branchMap.set(branch.code, {
      id: result.insertId,
      ...branch
    });
  }
  console.log('- Branches created: ' + branchMap.size);
}

async function createCoreUsers(context) {
  const { connection, schoolId, userMap } = context;
  const insertUserSql = `
    INSERT INTO users (
      school_id, email, password_hash, role_id, is_active,
      email_verified_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, TRUE, NOW(), NOW(), NOW())
  `;
  const insertPersonSql = `
    INSERT INTO persons (
      user_id, first_name, last_name, gender, date_of_birth,
      phone, address_line1, city, state, country, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'India', NOW(), NOW())
  `;

  for (const profile of USER_PROFILES) {
    const passwordHash = await bcrypt.hash(profile.password, 10);
    const [userResult] = await connection.execute(insertUserSql, [
      schoolId,
      profile.email,
      passwordHash,
      profile.role_id
    ]);

    const [personResult] = await connection.execute(insertPersonSql, [
      userResult.insertId,
      profile.first_name,
      profile.last_name,
      profile.gender,
      profile.date_of_birth,
      profile.phone,
      'Corporate Office',
      'Bengaluru',
      'Karnataka'
    ]);

    userMap.set(profile.key, {
      id: userResult.insertId,
      person_id: personResult.insertId,
      profile
    });
  }
  console.log('- Core users created: ' + userMap.size);
}

async function createAcademicYears(context) {
  const { connection, schoolId, academicYearMap } = context;
  const insertSql = `
    INSERT INTO academic_years (
      school_id, name, start_date, end_date, is_current, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
  `;
  for (const year of ACADEMIC_YEARS) {
    const [result] = await connection.execute(insertSql, [
      schoolId,
      year.name,
      year.start_date,
      year.end_date,
      year.is_current
    ]);
    academicYearMap.set(year.name, {
      id: result.insertId,
      ...year
    });
  }
  console.log('- Academic years created: ' + academicYearMap.size);
}
async function createClassesAndSections(context, blueprints) {
  const { connection, branchMap, academicYearMap, classMap, sectionMap } = context;
  const classSql = `
    INSERT INTO classes (
      academic_year_id, branch_id, name, numeric_grade, display_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
  `;
  const sectionSql = `
    INSERT INTO sections (
      class_id, name, max_students, room_number, created_at, updated_at
    ) VALUES (?, ?, ?, ?, NOW(), NOW())
  `;

  for (const blueprint of blueprints) {
    const year = academicYearMap.get(blueprint.academic_year);
    const branch = branchMap.get(blueprint.branch_code);
    const classKey = `${blueprint.academic_year}|${blueprint.branch_code}|${blueprint.name}`;

    const [classResult] = await connection.execute(classSql, [
      year.id,
      branch.id,
      blueprint.name,
      blueprint.numeric_grade,
      blueprint.display_order
    ]);

    const classRecord = {
      id: classResult.insertId,
      academic_year: blueprint.academic_year,
      academic_year_id: year.id,
      branch_code: blueprint.branch_code,
      branch_id: branch.id,
      name: blueprint.name,
      numeric_grade: blueprint.numeric_grade,
      sections: new Map()
    };

    for (const sectionName of blueprint.sections) {
      const [sectionResult] = await connection.execute(sectionSql, [
        classRecord.id,
        sectionName,
        40,
        `${branch.code}-${blueprint.numeric_grade}${sectionName}`
      ]);
      const sectionKey = `${classKey}|${sectionName}`;
      const sectionRecord = {
        id: sectionResult.insertId,
        name: sectionName,
        class_id: classRecord.id,
        class_key: classKey
      };
      classRecord.sections.set(sectionName, sectionRecord);
      sectionMap.set(sectionKey, sectionRecord);
    }

    classMap.set(classKey, classRecord);
  }
}

async function createSubjects(context) {
  const { connection, schoolId, subjectMap } = context;
  const insertSql = `
    INSERT INTO subjects (
      school_id, code, name, description, credit_hours, is_mandatory, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, TRUE, NOW(), NOW())
  `;
  for (const subject of SUBJECT_DEFINITIONS) {
    const [result] = await connection.execute(insertSql, [
      schoolId,
      subject.code,
      subject.name,
      subject.description,
      subject.credit_hours
    ]);
    subjectMap.set(subject.code, {
      id: result.insertId,
      ...subject
    });
  }
  console.log('- Subjects created: ' + subjectMap.size);
}

async function linkSubjectsToClasses(context) {
  const { connection, classMap, subjectMap } = context;
  const insertSql = `
    INSERT INTO class_subjects (class_id, subject_id, is_mandatory, created_at)
    VALUES (?, ?, TRUE, NOW())
  `;
  for (const classRecord of classMap.values()) {
    for (const subject of SUBJECT_DEFINITIONS) {
      const subjectEntry = subjectMap.get(subject.code);
      await connection.execute(insertSql, [classRecord.id, subjectEntry.id]);
    }
  }
}

async function createTeachers(context) {
  const { connection, schoolId, branchMap, teacherMap, teacherList, subjectMap } = context;
  const personSql = `
    INSERT INTO persons (
      first_name, last_name, gender, date_of_birth, phone,
      address_line1, city, state, country, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'India', NOW(), NOW())
  `;
  const teacherSql = `
    INSERT INTO teachers (
      person_id, school_id, branch_id, employee_id, qualification,
      specialization, experience_years, joining_date, employment_status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
  `;
  const teacherSubjectSql = `
    INSERT INTO teacher_subjects (teacher_id, subject_id, proficiency_level, created_at)
    VALUES (?, ?, 'advanced', NOW())
  `;

  for (const blueprint of TEACHER_BLUEPRINTS) {
    const branch = branchMap.get(blueprint.branch_code);
    const dob = calculateDobApprox(1985, blueprint.experience_years);
    const [personResult] = await connection.execute(personSql, [
      blueprint.first_name,
      blueprint.last_name,
      blueprint.gender,
      dob,
      generatePhone(),
      `${randomChoice(LOCALITIES)} Residency`,
      'Bengaluru',
      'Karnataka'
    ]);

    const [teacherResult] = await connection.execute(teacherSql, [
      personResult.insertId,
      schoolId,
      branch.id,
      blueprint.employee_id,
      blueprint.qualification,
      blueprint.specialization,
      blueprint.experience_years,
      blueprint.joining_date
    ]);

    const teacherRecord = {
      id: teacherResult.insertId,
      branch_code: blueprint.branch_code,
      subject_codes: blueprint.subject_codes
    };
    teacherList.push(teacherRecord);

    for (const subjectCode of blueprint.subject_codes) {
      const subject = subjectMap.get(subjectCode);
      await connection.execute(teacherSubjectSql, [
        teacherResult.insertId,
        subject.id
      ]);
      teacherMap.set(`${blueprint.branch_code}-${subjectCode}`, teacherResult.insertId);
    }
  }
  console.log('- Teachers created: ' + teacherList.length);
}

async function createStaff(context) {
  const { connection, schoolId, branchMap, staffList, userMap } = context;
  const personSql = `
    INSERT INTO persons (
      user_id, first_name, last_name, gender, date_of_birth, phone,
      address_line1, city, state, country, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'India', NOW(), NOW())
  `;
  const staffSql = `
    INSERT INTO staff (
      person_id, school_id, branch_id, employee_id, department, designation,
      joining_date, employment_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
  `;

  for (const blueprint of STAFF_BLUEPRINTS) {
    const branch = branchMap.get(blueprint.branch_code);
    const user = blueprint.user_key ? userMap.get(blueprint.user_key) : null;
    let personId = user ? user.person_id : null;
    if (!personId) {
      const [personResult] = await connection.execute(personSql, [
        null,
        blueprint.first_name,
        blueprint.last_name,
        blueprint.gender,
        blueprint.date_of_birth,
        generatePhone(),
        `${randomChoice(LOCALITIES)} Corporate Suite`,
        'Bengaluru',
        'Karnataka'
      ]);
      personId = personResult.insertId;
    }

    const [staffResult] = await connection.execute(staffSql, [
      personId,
      schoolId,
      branch.id,
      blueprint.employee_id,
      blueprint.department,
      blueprint.designation,
      blueprint.joining_date || '2016-04-01'
    ]);

    staffList.push({
      id: staffResult.insertId,
      department: blueprint.department
    });
  }
  console.log('- Staff created: ' + staffList.length);
}

async function createSalaryRecords(context) {
  const { connection, teacherList, staffList } = context;
  const salarySql = `
    INSERT INTO salaries (
      employee_type, employee_id, basic_salary, allowances, deductions,
      effective_from, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, '2024-04-01', NOW(), NOW())
  `;

  for (const teacher of teacherList) {
    await connection.execute(salarySql, [
      'teacher',
      teacher.id,
      52000 + Math.round(Math.random() * 12000),
      8000,
      2000
    ]);
  }
  for (const staff of staffList) {
    await connection.execute(salarySql, [
      'staff',
      staff.id,
      staff.department === 'management' ? 65000 : 42000,
      6000,
      1500
    ]);
  }
}
async function createStudentsAndParents(context) {
  const {
    connection,
    schoolId,
    classMap,
    students,
    studentBySection,
    studentByClass
  } = context;

  const personSql = `
    INSERT INTO persons (
      first_name, last_name, gender, date_of_birth, phone, alternate_phone,
      address_line1, city, state, country, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'India', NOW(), NOW())
  `;

  const studentSql = `
    INSERT INTO students (
      person_id, school_id, branch_id, roll_number, admission_number,
      admission_date, class_id, section_id, status,
      previous_school, emergency_contact, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, NOW(), NOW())
  `;

  const parentSql = `
    INSERT INTO parents (
      person_id, occupation, annual_income, employer_name, pan_number,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
  `;

  const studentParentSql = `
    INSERT INTO student_parents (
      student_id, parent_id, relationship_type, is_primary_contact, is_emergency_contact, created_at
    ) VALUES (?, ?, ?, TRUE, TRUE, NOW())
  `;

  const currentYearName = '2024-2025';
  let studentCounter = 0;
  let parentCounter = 0;

  for (const [classKey, classRecord] of classMap.entries()) {
    if (classRecord.academic_year !== currentYearName) continue;

    for (const sectionEntry of classRecord.sections.values()) {
      const sectionKey = `${classKey}|${sectionEntry.name}`;
      const sectionStudents = [];

      for (let i = 1; i <= STUDENTS_PER_SECTION; i += 1) {
        const gender = i % 2 === 0 ? 'female' : 'male';
        const firstName = generateFirstName(studentCounter, gender);
        const lastName = LAST_NAMES[studentCounter % LAST_NAMES.length];
        const rollNumber = `${classRecord.branch_code}-${classRecord.numeric_grade}${sectionEntry.name}-${String(i).padStart(2, '0')}`;
        const admissionNumber = `ADM-${classRecord.branch_code}-${String(studentCounter + 1001).padStart(4, '0')}`;
        const admissionDate = randomDateBetween('2024-04-05', addDaysStr('2024-04-05', 45));
        const previousSchool = randomChoice(['Greenwood High', 'Orchid International', 'Heritage Public']);
        const parentPhone = generatePhone();
        const dob = buildDobForGrade(classRecord.numeric_grade);

        const [personResult] = await connection.execute(personSql, [
          firstName,
          lastName,
          gender,
          dob,
          parentPhone,
          generatePhone(),
          `${randomChoice(LOCALITIES)} Residency`,
          'Bengaluru',
          'Karnataka'
        ]);

        const [studentResult] = await connection.execute(studentSql, [
          personResult.insertId,
          schoolId,
          classRecord.branch_id,
          rollNumber,
          admissionNumber,
          admissionDate,
          classRecord.id,
          sectionEntry.id,
          previousSchool,
          parentPhone
        ]);

        const parentGender = i % 2 === 0 ? 'male' : 'female';
        const parentFirstName = generateFirstName(parentCounter, parentGender);
        const parentLastName = LAST_NAMES[parentCounter % LAST_NAMES.length];
        parentCounter += 1;

        const [parentPersonResult] = await connection.execute(personSql, [
          parentFirstName,
          parentLastName,
          parentGender,
          '1984-01-15',
          parentPhone,
          generatePhone(),
          `${randomChoice(LOCALITIES)} Enclave`,
          'Bengaluru',
          'Karnataka'
        ]);

        const panNumber = `PANCORP${String(parentCounter).padStart(5, '0')}`;
        const [parentResult] = await connection.execute(parentSql, [
          parentPersonResult.insertId,
          randomChoice(['Software Engineer', 'Product Manager', 'Consultant', 'Banker']),
          900000 + Math.round(Math.random() * 600000),
          randomChoice(['TCS', 'Infosys', 'Wipro', 'Accenture']),
          panNumber
        ]);

        await connection.execute(studentParentSql, [
          studentResult.insertId,
          parentResult.insertId,
          parentGender === 'female' ? 'mother' : 'father'
        ]);

        const studentRecord = {
          id: studentResult.insertId,
          person_id: personResult.insertId,
          branch_id: classRecord.branch_id,
          branch_code: classRecord.branch_code,
          class_id: classRecord.id,
          class_key: classKey,
          class_name: classRecord.name,
          numeric_grade: classRecord.numeric_grade,
          section_id: sectionEntry.id,
          section_key: sectionKey,
          section_name: sectionEntry.name,
          roll_number: rollNumber,
          admission_date: admissionDate
        };
        students.push(studentRecord);
        sectionStudents.push(studentRecord);

        if (!studentByClass.has(classKey)) {
          studentByClass.set(classKey, []);
        }
        studentByClass.get(classKey).push(studentRecord);
        studentCounter += 1;
      }

      studentBySection.set(sectionKey, sectionStudents);
    }
  }
  console.log('- Students and parents created: ' + students.length);
}

async function createCurrentYearEnrollments(context) {
  const { connection, students, academicYearMap, enrollmentMap } = context;
  const enrollmentSql = `
    INSERT INTO student_enrollments (
      student_id, academic_year_id, class_id, section_id,
      roll_number, enrollment_date, status, attendance_percentage,
      final_result, overall_grade, remarks, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'enrolled', ?, NULL, NULL, ?, NOW(), NOW())
  `;
  const currentYear = academicYearMap.get('2024-2025');

  for (const student of students) {
    const attendance = 85 + Math.random() * 10;
    const remarks = randomChoice(['Consistent performer', 'Shows leadership', 'Great collaborator']);

    const [result] = await connection.execute(enrollmentSql, [
      student.id,
      currentYear.id,
      student.class_id,
      student.section_id,
      student.roll_number,
      student.admission_date,
      attendance,
      remarks
    ]);

    enrollmentMap.set(`${student.id}-${currentYear.name}`, {
      id: result.insertId,
      student_id: student.id,
      academic_year_id: currentYear.id,
      class_id: student.class_id,
      section_id: student.section_id
    });
  }
}
async function createPromotionAndTransferHistory(context) {
  const {
    connection,
    students,
    classMap,
    academicYearMap,
    enrollmentMap,
    userMap,
    branchMap
  } = context;

  const enrollmentSql = `
    INSERT INTO student_enrollments (
      student_id, academic_year_id, class_id, section_id,
      roll_number, enrollment_date, completion_date, status,
      attendance_percentage, final_result, overall_grade,
      final_percentage, conduct_grade, remarks, promoted_to_enrollment_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'promoted', ?, 'pass', ?, ?, 'excellent', ?, ?, NOW(), NOW())
  `;

  const promotionSql = `
    INSERT INTO student_promotions (
      from_enrollment_id, to_enrollment_id, from_academic_year_id, to_academic_year_id,
      promotion_type, promotion_date, promoted_by, overall_percentage,
      attendance_percentage, conduct_rating, remarks, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'promoted', ?, ?, ?, ?, 'excellent', ?, NOW(), NOW())
  `;

  const transferSql = `
    INSERT INTO student_branch_transfers (
      student_id, from_branch_id, to_branch_id, from_enrollment_id, to_enrollment_id,
      transfer_date, transfer_reason, transfer_type, approved_by, approval_date, remarks, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'parent_request', ?, ?, ?, NOW())
  `;

  const previousYear = academicYearMap.get('2023-2024');
  const currentYear = academicYearMap.get('2024-2025');
  const grade5Main = classMap.get('2023-2024|MAIN|Grade 5');
  const adminUser = userMap.get('admin');
  const opsUser = userMap.get('ops');

  const mainGrade6Students = students.filter(
    (s) => s.class_key === '2024-2025|MAIN|Grade 6'
  ).slice(0, 10);
  const techGrade6Students = students.filter(
    (s) => s.class_key === '2024-2025|TECHPARK|Grade 6'
  ).slice(0, 6);

  for (const student of mainGrade6Students) {
    const section = grade5Main.sections.get('A');
    const previousRoll = `MAIN-5A-${String(Math.floor(Math.random() * 40) + 1).padStart(2, '0')}`;
    const completionDate = '2024-03-15';
    const currentEnrollment = enrollmentMap.get(`${student.id}-${currentYear.name}`);
    const attendance = 88 + Math.random() * 5;
    const percentage = 80 + Math.random() * 10;

    const [prevResult] = await connection.execute(enrollmentSql, [
      student.id,
      previousYear.id,
      grade5Main.id,
      section.id,
      previousRoll,
      '2023-04-05',
      completionDate,
      attendance,
      randomChoice(['A1', 'A2']),
      percentage,
      'Promoted to Grade 6',
      currentEnrollment.id
    ]);

    await connection.execute(promotionSql, [
      prevResult.insertId,
      currentEnrollment.id,
      previousYear.id,
      currentYear.id,
      '2024-03-25',
      adminUser.id,
      percentage,
      attendance,
      'Steady academic growth'
    ]);

    enrollmentMap.set(`${student.id}-${previousYear.name}`, {
      id: prevResult.insertId,
      student_id: student.id,
      academic_year_id: previousYear.id,
      class_id: grade5Main.id,
      section_id: section.id
    });
  }

  for (const student of techGrade6Students) {
    const fromSection = grade5Main.sections.get('A');
    const previousRoll = `MAIN-5A-${String(Math.floor(Math.random() * 40) + 10).padStart(2, '0')}`;
    const completionDate = '2024-03-15';
    const currentEnrollment = enrollmentMap.get(`${student.id}-${currentYear.name}`);
    const attendance = 87 + Math.random() * 5;
    const percentage = 78 + Math.random() * 10;

    const [prevResult] = await connection.execute(enrollmentSql, [
      student.id,
      previousYear.id,
      grade5Main.id,
      fromSection.id,
      previousRoll,
      '2023-04-05',
      completionDate,
      attendance,
      randomChoice(['A2', 'B1']),
      percentage,
      'Shifted to Tech Park campus',
      currentEnrollment.id
    ]);

    await connection.execute(promotionSql, [
      prevResult.insertId,
      currentEnrollment.id,
      previousYear.id,
      currentYear.id,
      '2024-03-25',
      adminUser.id,
      percentage,
      attendance,
      'Transferred to Tech Park campus'
    ]);

    await connection.execute(transferSql, [
      student.id,
      branchMap.get('MAIN').id,
      branchMap.get('TECHPARK').id,
      prevResult.insertId,
      currentEnrollment.id,
      '2024-04-05',
      'Parents relocated to Electronic City',
      opsUser.id,
      '2024-04-06',
      'Smooth transfer with full academic record'
    ]);

    enrollmentMap.set(`${student.id}-${previousYear.name}`, {
      id: prevResult.insertId,
      student_id: student.id,
      academic_year_id: previousYear.id,
      class_id: grade5Main.id,
      section_id: fromSection.id
    });
  }
}

async function createAttendanceSessions(context) {
  const {
    connection,
    classMap,
    studentBySection,
    subjectMap,
    teacherMap,
    userMap
  } = context;

  const sessionSql = `
    INSERT INTO attendance_sessions (
      class_id, section_id, subject_id, teacher_id,
      session_date, period_number, session_type,
      created_by, marked_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'period', ?, ?, NOW(), NOW())
  `;

  const recordSql = `
    INSERT INTO attendance_records (
      session_id, student_id, status, remarks, created_at
    ) VALUES (?, ?, ?, ?, NOW())
  `;

  const sessionDate = '2024-07-01';
  const createdBy = userMap.get('ops').id;

  for (const [sectionKey, students] of studentBySection.entries()) {
    const section = context.sectionMap.get(sectionKey);
    const classEntry = context.classMap.get(section.class_key);
    for (let period = 1; period <= PERIOD_SUBJECT_SEQUENCE.length; period += 1) {
      const subjectCode = PERIOD_SUBJECT_SEQUENCE[period - 1];
      const subject = subjectMap.get(subjectCode);
      const teacherId = teacherMap.get(`${classEntry.branch_code}-${subjectCode}`);

      const [sessionResult] = await connection.execute(sessionSql, [
        classEntry.id,
        section.id,
        subject.id,
        teacherId,
        sessionDate,
        period,
        createdBy,
        createdBy
      ]);

      for (const student of students) {
        const isAbsent = (student.id + period) % 17 === 0;
        const status = isAbsent ? 'absent' : 'present';
        const remarks = isAbsent ? 'Medical leave submitted' : null;
        await connection.execute(recordSql, [
          sessionResult.insertId,
          student.id,
          status,
          remarks
        ]);
      }
    }
  }
  console.log('- Attendance sessions and records populated');
}
async function createFeesAndPayments(context) {
  const {
    connection,
    academicYearMap,
    classMap,
    students,
    feeStructureMap,
    studentFeeMap,
    userMap
  } = context;

  const feeStructureSql = `
    INSERT INTO fee_structures (
      academic_year_id, class_id, fee_type, amount, due_term, is_mandatory,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, TRUE, NOW(), NOW())
  `;

  const studentFeeSql = `
    INSERT INTO student_fees (
      student_id, fee_structure_id, total_amount, discount_amount,
      paid_amount, due_date, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

  const paymentSql = `
    INSERT INTO fee_payments (
      student_fee_id, receipt_number, amount, payment_date,
      payment_method, transaction_reference, collected_by, remarks, created_at
    ) VALUES (?, ?, ?, ?, 'online', ?, ?, 'Auto generated seed', NOW())
  `;

  const currentYear = academicYearMap.get('2024-2025');
  let receiptCounter = 1;

  for (const [classKey, classRecord] of classMap.entries()) {
    if (classRecord.academic_year !== currentYear.name) continue;

    for (const feeDef of FEE_DEFINITIONS) {
      const amount = feeDef.amount_by_grade[classRecord.numeric_grade] || feeDef.amount_by_grade[6];
      const [structureResult] = await connection.execute(feeStructureSql, [
        currentYear.id,
        classRecord.id,
        feeDef.fee_type,
        amount,
        feeDef.due_term
      ]);

      feeStructureMap.set(`${classKey}|${feeDef.fee_type}`, {
        id: structureResult.insertId,
        amount
      });
    }
  }

  for (const student of students) {
    const classKey = student.class_key;
    const tuitionStructure = feeStructureMap.get(`${classKey}|tuition`);
    const examStructure = feeStructureMap.get(`${classKey}|exam`);
    const transportStructure = feeStructureMap.get(`${classKey}|transport`);

    const tuitionDiscount = student.section_name === 'A' ? 2000 : 0;
    const tuitionPaid = tuitionStructure.amount * 0.6;
    const tuitionStatus = tuitionPaid >= tuitionStructure.amount ? 'paid' : 'partial';

    const [tuitionFeeResult] = await connection.execute(studentFeeSql, [
      student.id,
      tuitionStructure.id,
      tuitionStructure.amount,
      tuitionDiscount,
      tuitionPaid,
      '2024-04-30',
      tuitionStatus
    ]);

    studentFeeMap.set(`${student.id}|tuition`, tuitionFeeResult.insertId);

    const [examFeeResult] = await connection.execute(studentFeeSql, [
      student.id,
      examStructure.id,
      examStructure.amount,
      0,
      0,
      '2024-10-15',
      'pending'
    ]);
    studentFeeMap.set(`${student.id}|exam`, examFeeResult.insertId);

    if (student.id % 2 === 0) {
      const [transportFeeResult] = await connection.execute(studentFeeSql, [
        student.id,
        transportStructure.id,
        transportStructure.amount,
        0,
        transportStructure.amount,
        '2024-05-05',
        'paid'
      ]);
      studentFeeMap.set(`${student.id}|transport`, transportFeeResult.insertId);
    }

    if (student.id % 5 === 0) {
      const studentFeeId = tuitionFeeResult.insertId;
      await connection.execute(paymentSql, [
        studentFeeId,
        `RCT-${String(receiptCounter).padStart(6, '0')}`,
        tuitionPaid,
        '2024-04-15',
        `TXN${String(receiptCounter).padStart(8, '0')}`,
        userMap.get('accounts').id
      ]);
      receiptCounter += 1;
    }
  }
  console.log('- Fee structures, student fees and payments created');
}

async function createExamsSchedulesAndMarks(context) {
  const {
    connection,
    academicYearMap,
    classMap,
    subjectMap,
    studentByClass,
    userMap,
    examMap,
    examScheduleMap
  } = context;

  const examSql = `
    INSERT INTO exams (
      academic_year_id, name, exam_type, start_date, end_date, result_date,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

  const scheduleSql = `
    INSERT INTO exam_schedules (
      exam_id, class_id, subject_id, exam_date,
      start_time, end_time, max_marks, passing_marks, room_number,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, '09:30:00', '12:30:00', 80, 32, ?, NOW(), NOW())
  `;

  const marksSql = `
    INSERT INTO student_marks (
      exam_schedule_id, student_id, marks_obtained, is_absent, remarks,
      entered_by, verified_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

  const currentYear = academicYearMap.get('2024-2025');

  for (const exam of EXAMS) {
    const [result] = await connection.execute(examSql, [
      currentYear.id,
      exam.name,
      exam.exam_type,
      exam.start_date,
      exam.end_date,
      exam.result_date
    ]);
    examMap.set(exam.name, {
      id: result.insertId,
      ...exam
    });
  }

  for (const [classKey, classRecord] of classMap.entries()) {
    if (classRecord.academic_year !== currentYear.name) continue;

    for (const subject of SUBJECT_DEFINITIONS) {
      const subjectEntry = subjectMap.get(subject.code);
      let dayOffset = 0;

      for (const exam of EXAMS) {
        const examEntry = examMap.get(exam.name);
        const examDate = addDaysStr(exam.start_date, dayOffset);
        dayOffset += 1;
        const [scheduleResult] = await connection.execute(scheduleSql, [
          examEntry.id,
          classRecord.id,
          subjectEntry.id,
          examDate,
          `Hall-${classRecord.branch_code}-${subject.code}`
        ]);
        examScheduleMap.set(`${exam.name}|${classKey}|${subject.code}`, {
          id: scheduleResult.insertId,
          exam_id: examEntry.id
        });
      }
    }
  }

  const midTerm = examMap.get('Mid Term Assessment');
  const enteredBy = userMap.get('exam').id;
  const verifiedBy = userMap.get('admin').id;

  for (const [classKey, classStudents] of studentByClass.entries()) {
    for (const subject of SUBJECT_DEFINITIONS) {
      const schedule = examScheduleMap.get(`Mid Term Assessment|${classKey}|${subject.code}`);
      if (!schedule) continue;
      for (const student of classStudents) {
        const absent = student.id % 17 === 0;
        const marks = absent ? null : Number((55 + Math.random() * 25).toFixed(2));
        await connection.execute(marksSql, [
          schedule.id,
          student.id,
          marks,
          absent,
          absent ? 'Medical leave' : 'Consistent performance',
          enteredBy,
          verifiedBy
        ]);
      }
    }
  }
  console.log('- Exams, schedules and marks generated');
}

async function createGradingScale(context) {
  const { connection, academicYearMap } = context;
  const currentYear = academicYearMap.get('2024-2025');
  const sql = `
    INSERT INTO grading_scales (
      academic_year_id, grade_name, min_percentage, max_percentage,
      grade_point, description, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;

  for (const grade of GRADING_SCALES) {
    await connection.execute(sql, [
      currentYear.id,
      grade.grade,
      grade.min,
      grade.max,
      grade.grade_point,
      grade.description
    ]);
  }
}
function generateFirstName(counter, gender) {
  const half = FIRST_NAMES.length / 2;
  if (gender === 'female') {
    const index = half + (counter % half);
    return FIRST_NAMES[index];
  }
  return FIRST_NAMES[counter % half];
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function buildDobForGrade(grade) {
  const baseYear = 2025 - (grade + 5);
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 27) + 1;
  return formatDate(new Date(baseYear, month, day));
}

function calculateDobApprox(referenceYear, experienceYears) {
  const age = 24 + experienceYears;
  const year = Math.floor(referenceYear - age);
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 27) + 1;
  return formatDate(new Date(year, month, day));
}

function addDaysStr(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function randomDateBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  const rand = Math.random() * diff;
  const date = new Date(startDate.getTime() + rand);
  return formatDate(date);
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function generatePhone() {
  const prefix = ['98', '99', '97'][Math.floor(Math.random() * 3)];
  const rest = String(Math.floor(Math.random() * 90000000) + 10000000);
  return `${prefix}${rest}`;
}

seedVerificationData()
  .then(() => {
    console.log('Seed script completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed script failed:', err);
    process.exit(1);
  });
