/*
 Cleanup invalid student.class_id/section_id references, then add FKs.
 Option chosen: Null out invalid references (fastest and safe).
 Usage:
   node scripts/cleanup-student-links.js
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

async function main() {
  const conn = await mysql.createConnection(DB);
  try {
    console.log('Connected:', `${DB.host}:${DB.port}/${DB.database}`);

    // Count invalid class refs
    let [rows] = await conn.execute(
      'SELECT COUNT(*) AS cnt FROM student s LEFT JOIN class c ON s.class_id=c.cid WHERE s.class_id IS NOT NULL AND c.cid IS NULL'
    );
    const invalidClass = rows[0].cnt;
    console.log('Invalid student.class_id count:', invalidClass);

    if (invalidClass > 0) {
      await conn.execute(
        'UPDATE student s LEFT JOIN class c ON s.class_id=c.cid SET s.class_id = NULL WHERE s.class_id IS NOT NULL AND c.cid IS NULL'
      );
      console.log('Nullified invalid student.class_id references');
    }

    // Count invalid section refs
    ;[rows] = await conn.execute(
      'SELECT COUNT(*) AS cnt FROM student s LEFT JOIN section sc ON s.section_id=sc.secid WHERE s.section_id IS NOT NULL AND sc.secid IS NULL'
    );
    const invalidSection = rows[0].cnt;
    console.log('Invalid student.section_id count:', invalidSection);

    if (invalidSection > 0) {
      await conn.execute(
        'UPDATE student s LEFT JOIN section sc ON s.section_id=sc.secid SET s.section_id = NULL WHERE s.section_id IS NOT NULL AND sc.secid IS NULL'
      );
      console.log('Nullified invalid student.section_id references');
    }

    // Try to add FKs now
    // Check existence of constraints
    const fkExists = async (name) => {
      const [r] = await conn.execute(
        'SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ? LIMIT 1',
        [name]
      );
      return r.length > 0;
    };

    if (!(await fkExists('fk_student_class'))) {
      try {
        await conn.execute(
          'ALTER TABLE `student` ADD CONSTRAINT `fk_student_class` FOREIGN KEY (`class_id`) REFERENCES `class`(`cid`) ON DELETE SET NULL ON UPDATE CASCADE'
        );
        console.log('Added FK fk_student_class');
      } catch (e) {
        console.warn('Could not add fk_student_class:', e.message);
      }
    } else {
      console.log('FK fk_student_class already exists');
    }

    if (!(await fkExists('fk_student_section'))) {
      try {
        await conn.execute(
          'ALTER TABLE `student` ADD CONSTRAINT `fk_student_section` FOREIGN KEY (`section_id`) REFERENCES `section`(`secid`) ON DELETE SET NULL ON UPDATE CASCADE'
        );
        console.log('Added FK fk_student_section');
      } catch (e) {
        console.warn('Could not add fk_student_section:', e.message);
      }
    } else {
      console.log('FK fk_student_section already exists');
    }

    console.log('Cleanup + FK step complete');
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
