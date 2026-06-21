/**
 * Normalize the legacy SMS schema so that the demo seed can populate
 * the multi-school / multi-branch data set defined in 2025.
 *
 * The script is idempotent: it only adds missing tables, columns,
 * and indexes when they are not already present, and backfills them
 * with a default school + branch to keep existing data valid.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_NAME = process.env.DB_NAME || 'sms';

const TABLE_DEFINITIONS = {
  schools: `
    CREATE TABLE IF NOT EXISTS schools (
      id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      short_name VARCHAR(100),
      school_type ENUM('primary','secondary','higher_secondary','k12','college','university') NOT NULL DEFAULT 'k12',
      affiliation VARCHAR(100),
      affiliation_number VARCHAR(50),
      registration_number VARCHAR(50),
      established_year YEAR,
      logo_url VARCHAR(500),
      website VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(20),
      address_line1 VARCHAR(255),
      address_line2 VARCHAR(255),
      city VARCHAR(100),
      state VARCHAR(100),
      postal_code VARCHAR(20),
      country VARCHAR(100) DEFAULT 'India',
      is_active BOOLEAN DEFAULT TRUE,
      subscription_plan ENUM('free','basic','premium','enterprise') DEFAULT 'basic',
      subscription_expires_at DATE,
      max_students INT UNSIGNED DEFAULT 500,
      max_staff INT UNSIGNED DEFAULT 50,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      INDEX idx_code (code),
      INDEX idx_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  school_branches: `
    CREATE TABLE IF NOT EXISTS school_branches (
      id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      school_id INT UNSIGNED NOT NULL,
      code VARCHAR(20) NOT NULL,
      name VARCHAR(255) NOT NULL,
      branch_type ENUM('main','branch','campus','satellite','annexe') DEFAULT 'branch',
      address_line1 VARCHAR(255),
      address_line2 VARCHAR(255),
      city VARCHAR(100),
      state VARCHAR(100),
      postal_code VARCHAR(20),
      country VARCHAR(100) DEFAULT 'India',
      phone VARCHAR(20),
      email VARCHAR(255),
      principal_id BIGINT UNSIGNED NULL,
      vice_principal_id BIGINT UNSIGNED NULL,
      established_date DATE,
      total_classrooms SMALLINT UNSIGNED,
      total_labs SMALLINT UNSIGNED,
      has_library BOOLEAN DEFAULT TRUE,
      has_playground BOOLEAN DEFAULT TRUE,
      has_canteen BOOLEAN DEFAULT TRUE,
      has_hostel BOOLEAN DEFAULT FALSE,
      has_transport BOOLEAN DEFAULT TRUE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL,
      UNIQUE KEY uk_school_branch_code (school_id, code),
      INDEX idx_school_id (school_id),
      INDEX idx_active (is_active),
      CONSTRAINT fk_branch_school FOREIGN KEY (school_id)
        REFERENCES schools(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  class_subjects: `
    CREATE TABLE IF NOT EXISTS class_subjects (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      class_id BIGINT UNSIGNED NOT NULL,
      subject_id BIGINT UNSIGNED NOT NULL,
      is_mandatory BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_class_subject (class_id, subject_id),
      INDEX idx_class_id (class_id),
      INDEX idx_subject_id (subject_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  teacher_subjects: `
    CREATE TABLE IF NOT EXISTS teacher_subjects (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      teacher_id BIGINT UNSIGNED NOT NULL,
      subject_id BIGINT UNSIGNED NOT NULL,
      proficiency_level ENUM('beginner','intermediate','advanced','expert') DEFAULT 'intermediate',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_teacher_subject (teacher_id, subject_id),
      INDEX idx_teacher_id (teacher_id),
      INDEX idx_subject_id (subject_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  student_parents: `
    CREATE TABLE IF NOT EXISTS student_parents (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      student_id BIGINT UNSIGNED NOT NULL,
      parent_id BIGINT UNSIGNED NOT NULL,
      relationship_type ENUM('father','mother','guardian','other') NOT NULL,
      is_primary_contact BOOLEAN DEFAULT FALSE,
      is_emergency_contact BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_student_parent (student_id, parent_id),
      INDEX idx_student_id (student_id),
      INDEX idx_parent_id (parent_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  student_enrollments: `
    CREATE TABLE IF NOT EXISTS student_enrollments (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      student_id BIGINT UNSIGNED NOT NULL,
      academic_year_id SMALLINT UNSIGNED NOT NULL,
      class_id BIGINT UNSIGNED NOT NULL,
      section_id BIGINT UNSIGNED NOT NULL,
      roll_number VARCHAR(50) NOT NULL,
      enrollment_date DATE NOT NULL,
      completion_date DATE NULL,
      status ENUM('enrolled','promoted','detained','transferred','dropped','graduated') DEFAULT 'enrolled',
      promoted_to_enrollment_id BIGINT UNSIGNED NULL,
      attendance_percentage DECIMAL(5,2),
      final_result ENUM('pass','fail','pending','detained','promoted','graduated') NULL,
      overall_grade VARCHAR(5),
      final_percentage DECIMAL(5,2),
      remarks TEXT,
      conduct_grade ENUM('excellent','good','satisfactory','needs_improvement') NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_student_year (student_id, academic_year_id),
      INDEX idx_class_section (class_id, section_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  student_promotions: `
    CREATE TABLE IF NOT EXISTS student_promotions (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      from_enrollment_id BIGINT UNSIGNED NOT NULL,
      to_enrollment_id BIGINT UNSIGNED NOT NULL,
      from_academic_year_id SMALLINT UNSIGNED NOT NULL,
      to_academic_year_id SMALLINT UNSIGNED NOT NULL,
      promotion_type ENUM('promoted','detained','transferred','graduated','skipped_grade') NOT NULL,
      promotion_date DATE NOT NULL,
      promoted_by BIGINT UNSIGNED NOT NULL,
      overall_percentage DECIMAL(5,2),
      attendance_percentage DECIMAL(5,2),
      conduct_rating ENUM('excellent','good','satisfactory','poor'),
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_promotion_date (promotion_date),
      INDEX idx_type (promotion_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  student_branch_transfers: `
    CREATE TABLE IF NOT EXISTS student_branch_transfers (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      student_id BIGINT UNSIGNED NOT NULL,
      from_branch_id INT UNSIGNED NOT NULL,
      to_branch_id INT UNSIGNED NOT NULL,
      from_enrollment_id BIGINT UNSIGNED NOT NULL,
      to_enrollment_id BIGINT UNSIGNED NOT NULL,
      transfer_date DATE NOT NULL,
      transfer_reason TEXT,
      transfer_type ENUM('parent_request','academic','disciplinary','administrative','medical') NOT NULL,
      approved_by BIGINT UNSIGNED NOT NULL,
      approval_date DATE NOT NULL,
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_transfer_date (transfer_date),
      INDEX idx_student (student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  attendance_sessions: `
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      class_id BIGINT UNSIGNED NOT NULL,
      section_id BIGINT UNSIGNED NOT NULL,
      subject_id BIGINT UNSIGNED NULL,
      teacher_id BIGINT UNSIGNED NULL,
      session_date DATE NOT NULL,
      period_number TINYINT UNSIGNED,
      session_type ENUM('morning','afternoon','period','full_day') DEFAULT 'full_day',
      created_by BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_class_section_date (class_id, section_id, session_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  attendance_records: `
    CREATE TABLE IF NOT EXISTS attendance_records (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      session_id BIGINT UNSIGNED NOT NULL,
      student_id BIGINT UNSIGNED NOT NULL,
      status ENUM('present','absent','late','excused') NOT NULL,
      remarks VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_session_student (session_id, student_id),
      INDEX idx_student (student_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  fee_structures: `
    CREATE TABLE IF NOT EXISTS fee_structures (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      academic_year_id SMALLINT UNSIGNED NOT NULL,
      class_id BIGINT UNSIGNED NOT NULL,
      fee_type ENUM('tuition','transport','hostel','exam','library','sports','admission','other') NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      due_term ENUM('annual','semester_1','semester_2','term_1','term_2','term_3') DEFAULT 'annual',
      is_mandatory BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_year_class_fee (academic_year_id, class_id, fee_type, due_term)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  student_fees: `
    CREATE TABLE IF NOT EXISTS student_fees (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      student_id BIGINT UNSIGNED NOT NULL,
      fee_structure_id BIGINT UNSIGNED NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL,
      discount_amount DECIMAL(12,2) DEFAULT 0,
      paid_amount DECIMAL(12,2) DEFAULT 0,
      due_date DATE,
      status ENUM('pending','partial','paid','overdue','waived') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_student_fee (student_id, fee_structure_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  fee_payments: `
    CREATE TABLE IF NOT EXISTS fee_payments (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      student_fee_id BIGINT UNSIGNED NOT NULL,
      receipt_number VARCHAR(50) NOT NULL UNIQUE,
      amount DECIMAL(12,2) NOT NULL,
      payment_date DATE NOT NULL,
      payment_method ENUM('cash','check','card','online','bank_transfer') NOT NULL,
      transaction_reference VARCHAR(100),
      collected_by BIGINT UNSIGNED,
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_payment_date (payment_date),
      INDEX idx_collected_by (collected_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  exams: `
    CREATE TABLE IF NOT EXISTS exams (
      id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      academic_year_id SMALLINT UNSIGNED NOT NULL,
      name VARCHAR(100) NOT NULL,
      exam_type ENUM('unit_test','mid_term','final','practical','project','other') NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      result_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_year (academic_year_id),
      INDEX idx_type (exam_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  exam_schedules: `
    CREATE TABLE IF NOT EXISTS exam_schedules (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      exam_id INT UNSIGNED NOT NULL,
      class_id BIGINT UNSIGNED NOT NULL,
      subject_id BIGINT UNSIGNED NOT NULL,
      exam_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      max_marks DECIMAL(6,2) NOT NULL,
      passing_marks DECIMAL(6,2) NOT NULL,
      room_number VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_exam_class_subject (exam_id, class_id, subject_id),
      INDEX idx_exam_date (exam_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  student_marks: `
    CREATE TABLE IF NOT EXISTS student_marks (
      id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      exam_schedule_id BIGINT UNSIGNED NOT NULL,
      student_id BIGINT UNSIGNED NOT NULL,
      marks_obtained DECIMAL(6,2),
      is_absent BOOLEAN DEFAULT FALSE,
      remarks VARCHAR(500),
      entered_by BIGINT UNSIGNED,
      verified_by BIGINT UNSIGNED,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_schedule_student (exam_schedule_id, student_id),
      INDEX idx_student (student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  grading_scales: `
    CREATE TABLE IF NOT EXISTS grading_scales (
      id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      academic_year_id SMALLINT UNSIGNED NOT NULL,
      grade_name VARCHAR(10) NOT NULL,
      min_percentage DECIMAL(5,2) NOT NULL,
      max_percentage DECIMAL(5,2) NOT NULL,
      grade_point DECIMAL(4,2),
      description VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_year (academic_year_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `
};

async function tableExists(connection, name) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ? LIMIT 1`,
    [DB_NAME, name]
  );
  return rows.length > 0;
}

async function columnExists(connection, table, column) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ? LIMIT 1`,
    [DB_NAME, table, column]
  );
  return rows.length > 0;
}

async function indexExists(connection, table, indexName) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ? LIMIT 1`,
    [DB_NAME, table, indexName]
  );
  return rows.length > 0;
}

async function ensureIndex(connection, table, indexName, definition) {
  if (await indexExists(connection, table, indexName)) {
    return;
  }
    console.log(`   ↳ Creating index ${table}.${indexName}`);
    await connection.execute(`ALTER TABLE \`${table}\` ADD ${definition}`);
}

async function dropIndexIfExists(connection, table, indexName) {
  if (!(await indexExists(connection, table, indexName))) return;
  console.log(`   ↳ Dropping index ${table}.${indexName}`);
  await connection.execute(`ALTER TABLE \`${table}\` DROP INDEX \`${indexName}\``);
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('\n=== Schema Upgrade: Multi-School Support ===\n');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Core tables
    for (const [table, ddl] of Object.entries(TABLE_DEFINITIONS)) {
      if (!(await tableExists(connection, table))) {
        console.log(`• Creating table ${table}`);
        await connection.query(ddl);
      } else {
        console.log(`• Table ${table} already exists`);
      }
    }

    // 2. Default school + branch
    const schoolId = await ensureDefaultSchool(connection);
    const branchId = await ensureDefaultBranch(connection, schoolId);

    // 3. Columns for existing tables
    await ensureColumnWithDefault(connection, 'academic_years', 'school_id', 'INT UNSIGNED NULL', schoolId, 'id');
    await ensureColumnWithDefault(connection, 'users', 'school_id', 'INT UNSIGNED NULL', schoolId, 'id');
    await ensureColumnWithDefault(connection, 'classes', 'branch_id', 'INT UNSIGNED NULL', branchId, 'academic_year_id');
    await ensureColumnWithDefault(connection, 'subjects', 'school_id', 'INT UNSIGNED NULL', schoolId, 'code');
    await ensureSubjectColumns(connection);
    await ensureClassSubjectsColumns(connection);
    await ensureTeacherSubjectsColumns(connection);
    await ensureStudentColumns(connection, schoolId, branchId);
    await ensureTeacherColumns(connection, schoolId, branchId);
    await ensureStaffColumns(connection, schoolId, branchId);
    await ensureAttendanceSessionsColumns(connection);
    await ensureAttendanceRecordsColumns(connection);
    await ensureExamSchedulesColumns(connection);
    await ensureExamScheduleUnique(connection);
    await ensureStudentMarksColumns(connection);

    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    await ensureClassUniqueConstraint(connection);
    console.log('\n✅ Schema upgrade completed.\n');
    console.log(`Default school id: ${schoolId}, branch id: ${branchId}`);
  } finally {
    await connection.end();
  }
}

async function ensureDefaultSchool(connection) {
  const [rows] = await connection.query(`SELECT id FROM schools WHERE code = 'DEFAULT' LIMIT 1`);
  if (rows.length > 0) {
    return rows[0].id;
  }
  const [result] = await connection.execute(
    `INSERT INTO schools (code, name, short_name, school_type, affiliation, is_active, subscription_plan)
     VALUES ('DEFAULT', 'Default School', 'Default', 'k12', 'Not Specified', TRUE, 'premium')`
  );
  return result.insertId;
}

async function ensureDefaultBranch(connection, schoolId) {
  const [rows] = await connection.query(`SELECT id FROM school_branches WHERE school_id = ? AND code = 'MAIN' LIMIT 1`, [schoolId]);
  if (rows.length > 0) {
    return rows[0].id;
  }
  const [result] = await connection.execute(
    `INSERT INTO school_branches (school_id, code, name, branch_type, is_active)
     VALUES (?, 'MAIN', 'Main Campus', 'main', TRUE)`,
    [schoolId]
  );
  return result.insertId;
}

async function ensureColumnWithDefault(connection, table, column, definition, defaultValue, afterColumn) {
  if (await columnExists(connection, table, column)) {
    return;
  }
  const afterClause = afterColumn ? ` AFTER \`${afterColumn}\`` : '';
  console.log(`• Updating table ${table}`);
  await connection.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}${afterClause}`);
  await connection.execute(`UPDATE \`${table}\` SET \`${column}\` = ? WHERE \`${column}\` IS NULL`, [defaultValue]);
  await connection.execute(`ALTER TABLE \`${table}\` MODIFY \`${column}\` ${definition.replace(' NULL', '')} NOT NULL`);
  await ensureIndex(connection, table, `idx_${column}`, `INDEX idx_${column} (\`${column}\`)`);
}

async function ensureStudentColumns(connection, schoolId, branchId) {
  const needsSchool = !(await columnExists(connection, 'students', 'school_id'));
  const needsBranch = !(await columnExists(connection, 'students', 'branch_id'));
  if (!needsSchool && !needsBranch) return;
  console.log('• Updating table students');
  if (needsSchool) {
    await connection.execute(
      'ALTER TABLE `students` ADD COLUMN `school_id` INT UNSIGNED NULL AFTER `person_id`'
    );
    await connection.execute('UPDATE `students` SET `school_id` = ? WHERE `school_id` IS NULL', [schoolId]);
    await connection.execute('ALTER TABLE `students` MODIFY `school_id` INT UNSIGNED NOT NULL');
  }
  if (needsBranch) {
    await connection.execute(
      'ALTER TABLE `students` ADD COLUMN `branch_id` INT UNSIGNED NULL AFTER `school_id`'
    );
    await connection.execute('UPDATE `students` SET `branch_id` = ? WHERE `branch_id` IS NULL', [branchId]);
    await connection.execute('ALTER TABLE `students` MODIFY `branch_id` INT UNSIGNED NOT NULL');
  }
  await ensureIndex(connection, 'students', 'idx_students_school', 'INDEX idx_students_school (`school_id`)');
  await ensureIndex(connection, 'students', 'idx_students_branch', 'INDEX idx_students_branch (`branch_id`)');
}

async function ensureTeacherColumns(connection, schoolId, branchId) {
  const needsSchool = !(await columnExists(connection, 'teachers', 'school_id'));
  const needsBranch = !(await columnExists(connection, 'teachers', 'branch_id'));
  const needsJoiningDate = !(await columnExists(connection, 'teachers', 'joining_date'));
  const needsStatus = !(await columnExists(connection, 'teachers', 'employment_status'));
  if (!needsSchool && !needsBranch && !needsJoiningDate && !needsStatus) return;
  console.log('• Updating table teachers');
  if (needsSchool) {
    await connection.execute('ALTER TABLE `teachers` ADD COLUMN `school_id` INT UNSIGNED NULL AFTER `person_id`');
    await connection.execute('UPDATE `teachers` SET `school_id` = ? WHERE `school_id` IS NULL', [schoolId]);
    await connection.execute('ALTER TABLE `teachers` MODIFY `school_id` INT UNSIGNED NOT NULL');
  }
  if (needsBranch) {
    await connection.execute('ALTER TABLE `teachers` ADD COLUMN `branch_id` INT UNSIGNED NULL AFTER `school_id`');
    await connection.execute('UPDATE `teachers` SET `branch_id` = ? WHERE `branch_id` IS NULL', [branchId]);
    await connection.execute('ALTER TABLE `teachers` MODIFY `branch_id` INT UNSIGNED NULL');
  }
  if (needsJoiningDate) {
    const hasLegacyJoin = await columnExists(connection, 'teachers', 'join_date');
    await connection.execute('ALTER TABLE `teachers` ADD COLUMN `joining_date` DATE NULL AFTER `experience_years`');
    if (hasLegacyJoin) {
      await connection.execute('UPDATE `teachers` SET `joining_date` = `join_date` WHERE `join_date` IS NOT NULL');
    }
  }
  if (needsStatus) {
    const hasLegacyStatus = await columnExists(connection, 'teachers', 'status');
    await connection.execute(
      "ALTER TABLE `teachers` ADD COLUMN `employment_status` ENUM('active','on_leave','resigned','terminated') DEFAULT 'active' AFTER `resignation_date`"
    );
    if (hasLegacyStatus) {
      await connection.execute('UPDATE `teachers` SET `employment_status` = CASE `status` WHEN 1 THEN \'active\' ELSE \'inactive\' END WHERE `status` IS NOT NULL');
    }
  }
  await ensureIndex(connection, 'teachers', 'idx_teachers_school', 'INDEX idx_teachers_school (`school_id`)');
  await ensureIndex(connection, 'teachers', 'idx_teachers_branch', 'INDEX idx_teachers_branch (`branch_id`)');
}

async function ensureStaffColumns(connection, schoolId, branchId) {
  const needsSchool = !(await columnExists(connection, 'staff', 'school_id'));
  const needsBranch = !(await columnExists(connection, 'staff', 'branch_id'));
  if (!needsSchool && !needsBranch) return;
  console.log('• Updating table staff');
  if (needsSchool) {
    await connection.execute('ALTER TABLE `staff` ADD COLUMN `school_id` INT UNSIGNED NULL AFTER `person_id`');
    await connection.execute('UPDATE `staff` SET `school_id` = ? WHERE `school_id` IS NULL', [schoolId]);
    await connection.execute('ALTER TABLE `staff` MODIFY `school_id` INT UNSIGNED NOT NULL');
  }
  if (needsBranch) {
    await connection.execute('ALTER TABLE `staff` ADD COLUMN `branch_id` INT UNSIGNED NULL AFTER `school_id`');
    await connection.execute('UPDATE `staff` SET `branch_id` = ? WHERE `branch_id` IS NULL', [branchId]);
    await connection.execute('ALTER TABLE `staff` MODIFY `branch_id` INT UNSIGNED NULL');
  }
  await ensureIndex(connection, 'staff', 'idx_staff_school', 'INDEX idx_staff_school (`school_id`)');
  await ensureIndex(connection, 'staff', 'idx_staff_branch', 'INDEX idx_staff_branch (`branch_id`)');
}

async function ensureClassUniqueConstraint(connection) {
  const hasNew = await indexExists(connection, 'classes', 'uk_branch_year_class');
  if (hasNew) return;
  await dropIndexIfExists(connection, 'classes', 'uk_class_year_name');
  console.log('   ↳ Creating unique constraint classes.uk_branch_year_class');
  await connection.execute(
    'ALTER TABLE `classes` ADD UNIQUE KEY `uk_branch_year_class` (`branch_id`, `academic_year_id`, `name`)'
  );
}

async function ensureSubjectColumns(connection) {
  const needsCreditHours = !(await columnExists(connection, 'subjects', 'credit_hours'));
  const needsMandatory = !(await columnExists(connection, 'subjects', 'is_mandatory'));
  if (!needsCreditHours && !needsMandatory) return;
  console.log('• Updating table subjects');
  if (needsCreditHours) {
    await connection.execute('ALTER TABLE `subjects` ADD COLUMN `credit_hours` DECIMAL(4,2) NULL AFTER `description`');
  }
  if (needsMandatory) {
    await connection.execute('ALTER TABLE `subjects` ADD COLUMN `is_mandatory` BOOLEAN DEFAULT TRUE AFTER `credit_hours`');
  }
}

async function ensureClassSubjectsColumns(connection) {
  const needsMandatory = !(await columnExists(connection, 'class_subjects', 'is_mandatory'));
  const needsCreated = !(await columnExists(connection, 'class_subjects', 'created_at'));
  if (!needsMandatory && !needsCreated) return;
  console.log('• Updating table class_subjects');
  if (needsMandatory) {
    await connection.execute('ALTER TABLE `class_subjects` ADD COLUMN `is_mandatory` BOOLEAN DEFAULT TRUE AFTER `subject_id`');
  }
  if (needsCreated) {
    await connection.execute('ALTER TABLE `class_subjects` ADD COLUMN `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER `is_mandatory`');
  }
}

async function ensureTeacherSubjectsColumns(connection) {
  const needsProficiency = !(await columnExists(connection, 'teacher_subjects', 'proficiency_level'));
  const needsCreated = !(await columnExists(connection, 'teacher_subjects', 'created_at'));
  if (!needsProficiency && !needsCreated) return;
  console.log('• Updating table teacher_subjects');
  if (needsProficiency) {
    await connection.execute(
      "ALTER TABLE `teacher_subjects` ADD COLUMN `proficiency_level` ENUM('beginner','intermediate','advanced','expert') DEFAULT 'intermediate' AFTER `subject_id`"
    );
  }
  if (needsCreated) {
    await connection.execute('ALTER TABLE `teacher_subjects` ADD COLUMN `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER `proficiency_level`');
  }
}

async function ensureAttendanceSessionsColumns(connection) {
  const needsPeriod = !(await columnExists(connection, 'attendance_sessions', 'period_number'));
  const needsSubject = !(await columnExists(connection, 'attendance_sessions', 'subject_id'));
  const needsTeacher = !(await columnExists(connection, 'attendance_sessions', 'teacher_id'));
  const needsSessionType = !(await columnExists(connection, 'attendance_sessions', 'session_type'));
  const needsCreatedBy = !(await columnExists(connection, 'attendance_sessions', 'created_by'));
  const needsUpdatedAt = !(await columnExists(connection, 'attendance_sessions', 'updated_at'));
  if (!needsPeriod && !needsSubject && !needsTeacher && !needsSessionType && !needsCreatedBy && !needsUpdatedAt) return;
  console.log('• Updating table attendance_sessions');
  if (needsPeriod) {
    await connection.execute('ALTER TABLE `attendance_sessions` ADD COLUMN `period_number` TINYINT UNSIGNED NULL AFTER `session_date`');
  }
  if (needsSubject) {
    await connection.execute('ALTER TABLE `attendance_sessions` ADD COLUMN `subject_id` BIGINT UNSIGNED NULL AFTER `section_id`');
  }
  if (needsTeacher) {
    await connection.execute('ALTER TABLE `attendance_sessions` ADD COLUMN `teacher_id` BIGINT UNSIGNED NULL AFTER `subject_id`');
  }
  if (needsSessionType) {
    await connection.execute(
      "ALTER TABLE `attendance_sessions` ADD COLUMN `session_type` ENUM('morning','afternoon','period','full_day') DEFAULT 'full_day' AFTER `period_number`"
    );
  }
  if (needsCreatedBy) {
    await connection.execute('ALTER TABLE `attendance_sessions` ADD COLUMN `created_by` BIGINT UNSIGNED NULL AFTER `session_type`');
  }
  if (needsUpdatedAt) {
    await connection.execute('ALTER TABLE `attendance_sessions` ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');
  }
}

async function ensureAttendanceRecordsColumns(connection) {
  const needsStatus = !(await columnExists(connection, 'attendance_records', 'status'));
  const needsRemarks = !(await columnExists(connection, 'attendance_records', 'remarks'));
  const needsUnique = !(await indexExists(connection, 'attendance_records', 'uk_session_student'));
  if (!needsStatus && !needsRemarks && !needsUnique) return;
  console.log('• Updating table attendance_records');
  if (needsStatus) {
    await connection.execute(
      "ALTER TABLE `attendance_records` ADD COLUMN `status` ENUM('present','absent','late','excused') NOT NULL DEFAULT 'present' AFTER `student_id`"
    );
  }
  if (needsRemarks) {
    await connection.execute('ALTER TABLE `attendance_records` ADD COLUMN `remarks` VARCHAR(500) NULL AFTER `status`');
  }
  if (needsUnique) {
    await ensureIndex(connection, 'attendance_records', 'uk_session_student', 'UNIQUE KEY uk_session_student (`session_id`,`student_id`)');
  }
}

async function ensureExamSchedulesColumns(connection) {
  const needsClass = !(await columnExists(connection, 'exam_schedules', 'class_id'));
  const needsPassing = !(await columnExists(connection, 'exam_schedules', 'passing_marks'));
  if (!needsClass && !needsPassing) return;
  console.log('• Updating table exam_schedules');
  if (needsClass) {
    await connection.execute('ALTER TABLE `exam_schedules` ADD COLUMN `class_id` BIGINT UNSIGNED NULL AFTER `exam_id`');
  }
  if (needsPassing) {
    if (await columnExists(connection, 'exam_schedules', 'pass_marks')) {
      await connection.execute('ALTER TABLE `exam_schedules` CHANGE COLUMN `pass_marks` `passing_marks` DECIMAL(6,2) NOT NULL');
    } else {
      await connection.execute('ALTER TABLE `exam_schedules` ADD COLUMN `passing_marks` DECIMAL(6,2) NOT NULL DEFAULT 0 AFTER `max_marks`');
    }
  }
}

async function ensureExamScheduleUnique(connection) {
  const hasNew = await indexExists(connection, 'exam_schedules', 'uk_exam_class_subject');
  if (hasNew) return;
  await dropIndexIfExists(connection, 'exam_schedules', 'uk_exam_subject');
  console.log('   ↳ Creating unique constraint exam_schedules.uk_exam_class_subject');
  await connection.execute(
    'ALTER TABLE `exam_schedules` ADD UNIQUE KEY `uk_exam_class_subject` (`exam_id`,`class_id`,`subject_id`)'
  );
}

async function ensureStudentMarksColumns(connection) {
  const needsEntered = !(await columnExists(connection, 'student_marks', 'entered_by'));
  const needsVerified = !(await columnExists(connection, 'student_marks', 'verified_by'));
  if (!needsEntered && !needsVerified) return;
  console.log('• Updating table student_marks');
  if (needsEntered) {
    await connection.execute('ALTER TABLE `student_marks` ADD COLUMN `entered_by` BIGINT UNSIGNED NULL AFTER `remarks`');
  }
  if (needsVerified) {
    await connection.execute('ALTER TABLE `student_marks` ADD COLUMN `verified_by` BIGINT UNSIGNED NULL AFTER `entered_by`');
  }
}

main().catch((err) => {
  console.error('\n❌ Schema upgrade failed:', err.message);
  process.exit(1);
});
