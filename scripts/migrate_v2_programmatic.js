/*
 Programmatic migration for Schema v2 without relying on SQL 'IF NOT EXISTS'.
 Safely checks existence for columns, indexes, FKs, and applies changes idempotently.
 Usage:
   node scripts/migrate_v2_programmatic.js
*/

const mysql = require('mysql2/promise');
require('dotenv').config();

const DB = {
  host: process.env.DB_HOST || 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
  port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASS || 'Bizplus4u123',
  database: process.env.DB_NAME || 'sms',
  multipleStatements: true,
  connectTimeout: 60000,
  enableKeepAlive: true,
};

async function withConn(fn) {
  const conn = await mysql.createConnection(DB);
  try { return await fn(conn); } finally { await conn.end(); }
}

async function tableExists(conn, table) {
  const [rows] = await conn.execute(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1',
    [table]
  );
  return rows.length > 0;
}

async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
    [table, column]
  );
  return rows.length > 0;
}

async function indexExists(conn, table, index) {
  const [rows] = await conn.execute(
    'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
    [table, index]
  );
  return rows.length > 0;
}

async function fkExists(conn, table, constraint) {
  const [rows] = await conn.execute(
    'SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ? LIMIT 1',
    [constraint]
  );
  return rows.length > 0;
}

async function addColumn(conn, table, column, ddl) {
  if (!(await columnExists(conn, table, column))) {
    await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
    console.log(`Added column ${table}.${column}`);
  }
}

async function addIndex(conn, table, name, columns) {
  if (!(await indexExists(conn, table, name))) {
    await conn.execute(`CREATE INDEX \`${name}\` ON \`${table}\` (${columns})`);
    console.log(`Created index ${name} on ${table}`);
  }
}

async function addFK(conn, table, name, defSql, validateSql) {
  if (await fkExists(conn, table, name)) return;
  // Optional validation query should return a count of invalid rows
  if (validateSql) {
    const [rows] = await conn.execute(validateSql);
    const invalid = rows && rows[0] && (rows[0].invalid || rows[0]['COUNT(*)'] || Object.values(rows[0])[0]);
    if (invalid > 0) {
      console.warn(`Skipping FK ${name} on ${table}: ${invalid} invalid rows would violate constraint.`);
      return;
    }
  }
  try {
    await conn.execute(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${name}\` ${defSql}`);
    console.log(`Added FK ${name} on ${table}`);
  } catch (e) {
    console.warn(`Skipping FK ${name} on ${table} due to error: ${e.message}`);
  }
}

async function convertCharset(conn, table) {
  await conn.execute(`ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
  console.log(`Converted charset for ${table}`);
}

async function createRoles(conn) {
  if (!(await tableExists(conn, 'roles'))) {
    await conn.execute(
      'CREATE TABLE `roles` (\n' +
      '  `id` TINYINT UNSIGNED NOT NULL,\n' +
      '  `name` VARCHAR(50) NOT NULL,\n' +
      '  `description` VARCHAR(255) NULL,\n' +
      '  PRIMARY KEY (`id`),\n' +
      '  UNIQUE KEY `uq_roles_name` (`name`)\n' +
      ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    console.log('Created table roles');
  }
  await conn.execute(
    'INSERT INTO `roles` (`id`,`name`,`description`) VALUES ' +
    "(1,'admin','Administrator'),(2,'student','Student user'),(3,'parent','Parent/guardian')," +
    "(4,'teacher','Teacher/faculty'),(5,'library','Library staff'),(6,'subjects','Subject coordinator')," +
    "(7,'accounts','Accounts/billing'),(8,'exam','Examinations/assessment'),(9,'transport','Transport manager'),(10,'management','Management/executive') " +
    'AS new ON DUPLICATE KEY UPDATE name=new.name, description=new.description'
  );
}

async function migrateUser(conn) {
  await addColumn(conn, 'user', 'role_id', '`role_id` TINYINT UNSIGNED NULL AFTER `role`');
  await addColumn(conn, 'user', 'password_hash', '`password_hash` VARCHAR(255) NULL AFTER `password`');
  await addColumn(conn, 'user', 'is_active', '`is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `role_id`');
  await addColumn(conn, 'user', 'last_login_at', '`last_login_at` DATETIME NULL AFTER `is_active`');
  await addColumn(conn, 'user', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `last_login_at`');
  await addColumn(conn, 'user', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');

  await conn.execute("UPDATE `user` SET `role_id` = CAST(`role` AS UNSIGNED) WHERE `role_id` IS NULL AND `role` REGEXP '^[0-9]+$'");

  await addIndex(conn, 'user', 'idx_user_role_id', '`role_id`');
  await addIndex(conn, 'user', 'idx_user_is_active', '`is_active`');
}

async function migrateClassSectionSubjects(conn) {
  // class
  await addColumn(conn, 'class', 'name', '`name` VARCHAR(50) NULL AFTER `cn`');
  await addColumn(conn, 'class', 'academic_year', '`academic_year` SMALLINT NULL AFTER `year`');
  await addColumn(conn, 'class', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `academic_year`');
  await addColumn(conn, 'class', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');
  await addColumn(conn, 'class', 'deleted_at', '`deleted_at` DATETIME NULL AFTER `updated_at`');
  await addIndex(conn, 'class', 'idx_class_year', '`academic_year`');

  // section
  await addColumn(conn, 'section', 'class_id', '`class_id` BIGINT NULL AFTER `secid`');
  await addColumn(conn, 'section', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `sname`');
  await addColumn(conn, 'section', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');
  await addColumn(conn, 'section', 'deleted_at', '`deleted_at` DATETIME NULL AFTER `updated_at`');
  await addIndex(conn, 'section', 'idx_section_class_id', '`class_id`');
  await addIndex(conn, 'section', 'idx_section_cid_legacy', '`cid`');

  // subjects
  await addColumn(conn, 'subjects', 'class_id', '`class_id` BIGINT NULL AFTER `cid`');
  await addColumn(conn, 'subjects', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `class_id`');
  await addColumn(conn, 'subjects', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');
  await addIndex(conn, 'subjects', 'idx_subjects_class_id', '`class_id`');
  await addIndex(conn, 'subjects', 'idx_subjects_cid_legacy', '`cid`');

  // backfill numeric-compatible legacy ids
  await conn.execute("UPDATE `section` SET `class_id` = CAST(`cid` AS UNSIGNED) WHERE `class_id` IS NULL AND `cid` REGEXP '^[0-9]+$'");
  await conn.execute("UPDATE `subjects` SET `class_id` = CAST(`cid` AS UNSIGNED) WHERE `class_id` IS NULL AND `cid` REGEXP '^[0-9]+$'");
}

async function migratePeople(conn) {
  // admin
  await addColumn(conn, 'admin', 'gender_enum', "`gender_enum` ENUM('male','female','other','unknown') NULL AFTER `gender`");
  await addColumn(conn, 'admin', 'date_of_birth', '`date_of_birth` DATE NULL AFTER `dob`');
  await addColumn(conn, 'admin', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `Status`');
  await addColumn(conn, 'admin', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');

  // teacher
  await addColumn(conn, 'teacher', 'date_of_birth', '`date_of_birth` DATE NULL AFTER `dob`');
  await addColumn(conn, 'teacher', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `Status`');
  await addColumn(conn, 'teacher', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');
  await addColumn(conn, 'teacher', 'deleted_at', '`deleted_at` DATETIME NULL AFTER `updated_at`');

  // student
  await addColumn(conn, 'student', 'class_id', '`class_id` BIGINT NULL AFTER `secid`');
  await addColumn(conn, 'student', 'section_id', '`section_id` INT NULL AFTER `class_id`');
  await addColumn(conn, 'student', 'dob_date', '`dob_date` DATE NULL AFTER `dob`');
  await addColumn(conn, 'student', 'admitted_at', '`admitted_at` DATE NULL AFTER `admissiondate`');
  await addColumn(conn, 'student', 'row_version', '`row_version` INT NOT NULL DEFAULT 1 AFTER `Status`');
  await addColumn(conn, 'student', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `row_version`');
  await addColumn(conn, 'student', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');
  await addColumn(conn, 'student', 'deleted_at', '`deleted_at` DATETIME NULL AFTER `updated_at`');

  await addIndex(conn, 'student', 'idx_student_roll', '`roll`');
  await addIndex(conn, 'student', 'idx_student_phone', '`phone`');
  await addIndex(conn, 'student', 'idx_student_class_section', '`class_id`,`section_id`');

  await conn.execute("UPDATE `student` SET `class_id` = CAST(`cid` AS UNSIGNED) WHERE `class_id` IS NULL AND `cid` REGEXP '^[0-9]+$'");
  await conn.execute("UPDATE `student` SET `section_id` = CAST(`secid` AS UNSIGNED) WHERE `section_id` IS NULL AND `secid` REGEXP '^[0-9]+$'");
}

async function migrateAttendanceExams(conn) {
  await addColumn(conn, 'attendence', 'date_on', '`date_on` DATE NULL AFTER `date`');
  await addColumn(conn, 'attendence', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `date_on`');
  await addColumn(conn, 'attendence', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');
  await addIndex(conn, 'attendence', 'idx_attendence_cid_secid_date', '`cid`,`secid`,`date`');

  await addColumn(conn, 'addattendence', 'present', '`present` TINYINT(1) NULL AFTER `attendence`');

  await addColumn(conn, 'examschedule', 'exam_date', '`exam_date` DATE NULL AFTER `time`');
  await addColumn(conn, 'examschedule', 'start_time', '`start_time` TIME NULL AFTER `exam_date`');
  await addColumn(conn, 'examschedule', 'end_time', '`end_time` TIME NULL AFTER `start_time`');
  await addColumn(conn, 'examschedule', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `end_time`');
  await addColumn(conn, 'examschedule', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');
  await addIndex(conn, 'examschedule', 'idx_examschedule_keys', '`eid`,`subid`,`cid`');

  await addColumn(conn, 'studentmarks', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `gid`');
  await addColumn(conn, 'studentmarks', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');
  await addIndex(conn, 'studentmarks', 'idx_studentmarks_mid_roll', '`mid`,`roll`');
}

async function migrateFinance(conn) {
  await addColumn(conn, 'expense', 'amount_decimal', '`amount_decimal` DECIMAL(12,2) NULL AFTER `amount`');
  await addColumn(conn, 'expense', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `purpose`');
  await addColumn(conn, 'expense', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');
  // best-effort numeric parse
  await conn.execute("UPDATE `expense` SET `amount_decimal` = NULLIF(REGEXP_REPLACE(`amount`,'[^0-9\\.]',''), '') + 0 WHERE `amount_decimal` IS NULL");

  await addColumn(conn, 'feetransactions', 'amountpaid_decimal', '`amountpaid_decimal` DECIMAL(12,2) NULL AFTER `amountpaid`');
  await addColumn(conn, 'feetransactions', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `amountpaid_decimal`');
  await addColumn(conn, 'feetransactions', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');
  await conn.execute("UPDATE `feetransactions` SET `amountpaid_decimal` = `amountpaid` WHERE `amountpaid_decimal` IS NULL");
  await addIndex(conn, 'feetransactions', 'idx_feetrx_roll', '`roll`');

  await addColumn(conn, 'fees', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `class`');
  await addColumn(conn, 'fees', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');
  await addIndex(conn, 'fees', 'idx_fees_uid_class', '`uid`,`class`');
}

async function migrateContent(conn) {
  // messages: add surrogate PK
  const [cols] = await conn.execute(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME="messages" AND COLUMN_NAME="id"'
  );
  if (cols.length === 0) {
    await conn.execute('ALTER TABLE `messages` ADD COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST');
  }
  await addColumn(conn, 'messages', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `message`');

  await addColumn(conn, 'notice', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `Status`');
  await addColumn(conn, 'notice', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');
}

async function migrateLogistics(conn) {
  await addColumn(conn, 'timetable', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `shid`');
  await addColumn(conn, 'timetable', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');
  await addIndex(conn, 'timetable', 'idx_timetable_dims', '`tid`,`cid`,`subid`,`secid`,`day`,`shid`');

  await addColumn(conn, 'sessionhours', 'created_at', '`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `etime`');
  await addColumn(conn, 'sessionhours', 'updated_at', '`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`');

  // ulogins & sessions indexes
  await addIndex(conn, 'ulogins', 'idx_ulogins_uid_time', '`uid`,`logintime`');
  await addIndex(conn, 'ulogins', 'idx_ulogins_time', '`logintime`');
  await addIndex(conn, 'sessions', 'idx_sessions_expires', '`expires`');
}

async function addFKs(conn) {
  await addFK(
    conn,
    'section',
    'fk_section_class',
    'FOREIGN KEY (`class_id`) REFERENCES `class`(`cid`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT COUNT(*) AS invalid FROM `section` s LEFT JOIN `class` c ON s.class_id = c.cid WHERE s.class_id IS NOT NULL AND c.cid IS NULL'
  );
  await addFK(
    conn,
    'subjects',
    'fk_subjects_class',
    'FOREIGN KEY (`class_id`) REFERENCES `class`(`cid`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT COUNT(*) AS invalid FROM `subjects` s LEFT JOIN `class` c ON s.class_id = c.cid WHERE s.class_id IS NOT NULL AND c.cid IS NULL'
  );
  await addFK(
    conn,
    'student',
    'fk_student_class',
    'FOREIGN KEY (`class_id`) REFERENCES `class`(`cid`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT COUNT(*) AS invalid FROM `student` s LEFT JOIN `class` c ON s.class_id = c.cid WHERE s.class_id IS NOT NULL AND c.cid IS NULL'
  );
  await addFK(
    conn,
    'student',
    'fk_student_section',
    'FOREIGN KEY (`section_id`) REFERENCES `section`(`secid`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT COUNT(*) AS invalid FROM `student` s LEFT JOIN `section` sc ON s.section_id = sc.secid WHERE s.section_id IS NOT NULL AND sc.secid IS NULL'
  );
}

async function convertCharsets(conn) {
  for (const t of ['user','student','teacher','admin']) {
    await convertCharset(conn, t);
  }
}

async function run() {
  console.log('Connecting to DB', `${DB.host}:${DB.port}/${DB.database}`);
  await withConn(async (conn) => {
    await conn.execute("SET SESSION sql_mode='STRICT_TRANS_TABLES,NO_AUTO_VALUE_ON_ZERO,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");

    await createRoles(conn);
    await migrateUser(conn);
    await migrateClassSectionSubjects(conn);
    await migratePeople(conn);
    await migrateAttendanceExams(conn);
    await migrateFinance(conn);
    await migrateContent(conn);
    await migrateLogistics(conn);
    await addFKs(conn);
    await convertCharsets(conn);

    console.log('Programmatic migration v2 completed successfully.');
  });
}

run().catch((e) => {
  console.error('Migration error:', e);
  process.exit(1);
});
