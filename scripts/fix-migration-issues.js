const mysql = require('mysql2/promise');

const db_config = {
  host: 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  password: 'Bizplus4u123',
  database: 'sms'
};

async function fixMigrationIssues() {
  let connection;
  
  try {
    console.log('🔧 Fixing Migration Issues\n');
    console.log('='.repeat(60) + '\n');
    
    connection = await mysql.createConnection(db_config);
    console.log('✅ Connected to database\n');
    
    // Check if subjects table needs fixing
    console.log('📋 Checking subjects table structure...');
    const [subjectsCols] = await connection.query('SHOW COLUMNS FROM subjects');
    const hasIdColumn = subjectsCols.some(col => col.Field === 'id');
    
    if (!hasIdColumn) {
      console.log('⚠️  Subjects table needs fixing (has subid instead of id)');
      // Drop dependent tables first
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      await connection.query('DROP TABLE IF EXISTS class_subjects');
      await connection.query('DROP TABLE IF EXISTS teacher_subjects');
      await connection.query('DROP TABLE IF EXISTS attendance_sessions');
      await connection.query('DROP TABLE IF EXISTS attendance_records');
      await connection.query('DROP TABLE IF EXISTS exam_schedules');
      await connection.query('DROP TABLE IF EXISTS student_marks');
      await connection.query('DROP TABLE IF EXISTS subjects');
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      
      await connection.query(`
        CREATE TABLE subjects (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(20) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP NULL,
          INDEX idx_code (code),
          INDEX idx_active (is_active),
          INDEX idx_deleted (deleted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Subjects table recreated\n');
    } else {
      console.log('✅ Subjects table already has correct structure\n');
    }
    
    // Create class_subjects table
    console.log('📋 Creating class_subjects table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS class_subjects (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        class_id BIGINT UNSIGNED NOT NULL,
        subject_id BIGINT UNSIGNED NOT NULL,
        is_compulsory BOOLEAN DEFAULT TRUE,
        max_marks DECIMAL(6,2),
        pass_marks DECIMAL(6,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_class_subject (class_id, subject_id),
        INDEX idx_class_id (class_id),
        INDEX idx_subject_id (subject_id),
        CONSTRAINT fk_class_subjects_class FOREIGN KEY (class_id) 
          REFERENCES classes(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_class_subjects_subject FOREIGN KEY (subject_id) 
          REFERENCES subjects(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ class_subjects table created\n');
    
    // Create teacher_subjects table
    console.log('📋 Creating teacher_subjects table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS teacher_subjects (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        teacher_id BIGINT UNSIGNED NOT NULL,
        subject_id BIGINT UNSIGNED NOT NULL,
        class_id BIGINT UNSIGNED NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_teacher_subject_class (teacher_id, subject_id, class_id),
        INDEX idx_teacher_id (teacher_id),
        INDEX idx_subject_id (subject_id),
        INDEX idx_class_id (class_id),
        CONSTRAINT fk_teacher_subjects_teacher FOREIGN KEY (teacher_id) 
          REFERENCES teachers(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_teacher_subjects_subject FOREIGN KEY (subject_id) 
          REFERENCES subjects(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_teacher_subjects_class FOREIGN KEY (class_id) 
          REFERENCES classes(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ teacher_subjects table created\n');
    
    // Create attendance_sessions table
    console.log('📋 Creating attendance_sessions table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        class_id BIGINT UNSIGNED NOT NULL,
        section_id INT UNSIGNED NOT NULL,
        subject_id BIGINT UNSIGNED NULL,
        session_date DATE NOT NULL,
        session_time TIME NOT NULL,
        session_type ENUM('full_day', 'morning', 'afternoon', 'period') DEFAULT 'full_day',
        marked_by BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_class_section_date (class_id, section_id, session_date),
        INDEX idx_subject_id (subject_id),
        INDEX idx_marked_by (marked_by),
        INDEX idx_session_date (session_date),
        CONSTRAINT fk_attendance_sessions_class FOREIGN KEY (class_id) 
          REFERENCES classes(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_attendance_sessions_section FOREIGN KEY (section_id) 
          REFERENCES sections(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_attendance_sessions_subject FOREIGN KEY (subject_id) 
          REFERENCES subjects(id) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT fk_attendance_sessions_marked_by FOREIGN KEY (marked_by) 
          REFERENCES users(id) ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ attendance_sessions table created\n');
    
    // Create attendance_records table
    console.log('📋 Creating attendance_records table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        session_id BIGINT UNSIGNED NOT NULL,
        student_id BIGINT UNSIGNED NOT NULL,
        status ENUM('present', 'absent', 'late', 'excused', 'sick', 'leave') NOT NULL,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_session_student (session_id, student_id),
        INDEX idx_session_id (session_id),
        INDEX idx_student_id (student_id),
        INDEX idx_status (status),
        CONSTRAINT fk_attendance_records_session FOREIGN KEY (session_id) 
          REFERENCES attendance_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_attendance_records_student FOREIGN KEY (student_id) 
          REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ attendance_records table created\n');
    
    // Create exam_schedules table
    console.log('📋 Creating exam_schedules table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS exam_schedules (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        exam_id INT UNSIGNED NOT NULL,
        subject_id BIGINT UNSIGNED NOT NULL,
        exam_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        max_marks DECIMAL(6,2) NOT NULL,
        pass_marks DECIMAL(6,2) NOT NULL,
        room_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_exam_subject (exam_id, subject_id),
        INDEX idx_exam_id (exam_id),
        INDEX idx_subject_id (subject_id),
        INDEX idx_exam_date (exam_date),
        CONSTRAINT fk_exam_schedules_exam FOREIGN KEY (exam_id) 
          REFERENCES exams(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_exam_schedules_subject FOREIGN KEY (subject_id) 
          REFERENCES subjects(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ exam_schedules table created\n');
    
    // Create student_marks table
    console.log('📋 Creating student_marks table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS student_marks (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        exam_schedule_id BIGINT UNSIGNED NOT NULL,
        student_id BIGINT UNSIGNED NOT NULL,
        marks_obtained DECIMAL(6,2),
        grade VARCHAR(5),
        remarks TEXT,
        is_absent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_exam_schedule_student (exam_schedule_id, student_id),
        INDEX idx_exam_schedule_id (exam_schedule_id),
        INDEX idx_student_id (student_id),
        INDEX idx_grade (grade),
        CONSTRAINT fk_student_marks_exam_schedule FOREIGN KEY (exam_schedule_id) 
          REFERENCES exam_schedules(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_student_marks_student FOREIGN KEY (student_id) 
          REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ student_marks table created\n');
    
    // Verify all tables
    console.log('🔍 Running verification...\n');
    
    const tables = [
      'subjects', 'class_subjects', 'teacher_subjects',
      'attendance_sessions', 'attendance_records',
      'exam_schedules', 'student_marks'
    ];
    
    for (const table of tables) {
      const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ✅ ${table.padEnd(25)} ${count[0].count} records`);
    }
    
    // Check foreign keys
    const [fks] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'sms' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    console.log(`\n  ✅ Total foreign keys: ${fks[0].count}`);
    
    // Check indexes
    const [indexes] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = 'sms' 
      AND INDEX_NAME != 'PRIMARY'
    `);
    console.log(`  ✅ Total indexes: ${indexes[0].count}\n`);
    
    console.log('='.repeat(60));
    console.log('🎉 All issues fixed successfully!');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed\n');
    }
  }
}

fixMigrationIssues()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
