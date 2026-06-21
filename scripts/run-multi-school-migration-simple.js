const mysql = require('mysql2/promise');

// Database configuration
const db_config = {
  host: 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  password: 'Bizplus4u123',
  database: 'sms',
  connectTimeout: 60000
};

async function runMigration() {
  let connection;
  
  try {
    console.log('🚀 Multi-School & Branch Migration\n');
    console.log('📦 Connecting to database...');
    connection = await mysql.createConnection(db_config);
    console.log('✅ Connected!\n');
    
    console.log('⚙️  Executing migration steps...\n');
    
    // PHASE 1: CREATE SCHOOLS TABLE
    console.log('📋 Phase 1: Creating schools table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        short_name VARCHAR(100),
        school_type ENUM('primary', 'secondary', 'higher_secondary', 'k12', 'college', 'university') NOT NULL,
        affiliation VARCHAR(100) COMMENT 'CBSE, ICSE, State Board, Cambridge, IB, etc.',
        affiliation_number VARCHAR(50),
        registration_number VARCHAR(50) UNIQUE,
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
        subscription_plan ENUM('free', 'basic', 'premium', 'enterprise') DEFAULT 'basic',
        subscription_expires_at DATE,
        max_students INT UNSIGNED DEFAULT 500,
        max_staff INT UNSIGNED DEFAULT 50,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_code (code),
        INDEX idx_active (is_active),
        INDEX idx_subscription (subscription_plan, subscription_expires_at),
        INDEX idx_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Schools table created\n');
    
    // PHASE 2: CREATE SCHOOL_BRANCHES TABLE
    console.log('📋 Phase 2: Creating school_branches table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS school_branches (
        id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        school_id INT UNSIGNED NOT NULL,
        code VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        branch_type ENUM('main', 'branch', 'campus', 'satellite', 'annexe') DEFAULT 'branch',
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
        INDEX idx_principal_id (principal_id),
        INDEX idx_deleted (deleted_at),
        CONSTRAINT fk_branches_school FOREIGN KEY (school_id) 
          REFERENCES schools(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ School branches table created\n');
    
    // PHASE 3: CREATE STUDENT_ENROLLMENTS TABLE
    console.log('📋 Phase 3: Creating student_enrollments table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS student_enrollments (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        student_id BIGINT UNSIGNED NOT NULL,
        academic_year_id SMALLINT UNSIGNED NOT NULL,
        class_id BIGINT UNSIGNED NOT NULL,
        section_id INT UNSIGNED NOT NULL,
        roll_number VARCHAR(50) NOT NULL,
        enrollment_date DATE NOT NULL,
        completion_date DATE NULL,
        status ENUM('enrolled', 'promoted', 'detained', 'transferred', 'dropped', 'graduated') DEFAULT 'enrolled',
        promoted_to_enrollment_id BIGINT UNSIGNED NULL,
        attendance_percentage DECIMAL(5,2),
        final_result ENUM('pass', 'fail', 'pending', 'detained', 'promoted', 'graduated') NULL,
        overall_grade VARCHAR(5),
        final_percentage DECIMAL(5,2),
        remarks TEXT,
        conduct_grade ENUM('excellent', 'good', 'satisfactory', 'needs_improvement') NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_student_year_class (student_id, academic_year_id),
        INDEX idx_student_id (student_id),
        INDEX idx_academic_year (academic_year_id),
        INDEX idx_class_section (class_id, section_id),
        INDEX idx_status (status),
        INDEX idx_roll_number (roll_number),
        INDEX idx_promoted_to (promoted_to_enrollment_id),
        INDEX idx_enrollment_date (enrollment_date),
        CONSTRAINT chk_enrollment_dates CHECK (completion_date IS NULL OR completion_date >= enrollment_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Student enrollments table created\n');
    
    // Add foreign keys after table creation
    console.log('🔗 Adding foreign keys to student_enrollments...');
    try {
      await connection.query(`ALTER TABLE student_enrollments ADD CONSTRAINT fk_enrollments_promoted_to FOREIGN KEY (promoted_to_enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL ON UPDATE CASCADE`);
    } catch (e) { if (!e.message.includes('Duplicate')) console.log('  ⚠️  ', e.message.substring(0, 80)); }
    console.log('✅ Foreign keys added\n');
    
    // PHASE 4: CREATE STUDENT_PROMOTIONS TABLE
    console.log('📋 Phase 4: Creating student_promotions table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS student_promotions (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        from_enrollment_id BIGINT UNSIGNED NOT NULL,
        to_enrollment_id BIGINT UNSIGNED NOT NULL,
        from_academic_year_id SMALLINT UNSIGNED NOT NULL,
        to_academic_year_id SMALLINT UNSIGNED NOT NULL,
        promotion_type ENUM('promoted', 'detained', 'transferred', 'graduated', 'skipped_grade') NOT NULL,
        promotion_date DATE NOT NULL,
        promoted_by BIGINT UNSIGNED NOT NULL,
        overall_percentage DECIMAL(5,2),
        attendance_percentage DECIMAL(5,2),
        conduct_rating ENUM('excellent', 'good', 'satisfactory', 'poor') NULL,
        reason TEXT,
        conditions TEXT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_from_to_enrollment (from_enrollment_id, to_enrollment_id),
        INDEX idx_from_enrollment (from_enrollment_id),
        INDEX idx_to_enrollment (to_enrollment_id),
        INDEX idx_from_year (from_academic_year_id),
        INDEX idx_to_year (to_academic_year_id),
        INDEX idx_promotion_type (promotion_type),
        INDEX idx_promotion_date (promotion_date),
        INDEX idx_promoted_by (promoted_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Student promotions table created\n');
    
    // PHASE 5: CREATE STUDENT_BRANCH_TRANSFERS TABLE
    console.log('📋 Phase 5: Creating student_branch_transfers table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS student_branch_transfers (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        student_id BIGINT UNSIGNED NOT NULL,
        from_branch_id INT UNSIGNED NOT NULL,
        to_branch_id INT UNSIGNED NOT NULL,
        from_enrollment_id BIGINT UNSIGNED NOT NULL,
        to_enrollment_id BIGINT UNSIGNED NOT NULL,
        transfer_date DATE NOT NULL,
        transfer_reason TEXT,
        transfer_type ENUM('parent_request', 'academic', 'disciplinary', 'administrative', 'medical') NOT NULL,
        approved_by BIGINT UNSIGNED NOT NULL,
        approval_date DATE NOT NULL,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_student_id (student_id),
        INDEX idx_from_branch (from_branch_id),
        INDEX idx_to_branch (to_branch_id),
        INDEX idx_transfer_date (transfer_date),
        INDEX idx_approved_by (approved_by),
        CONSTRAINT chk_transfer_different_branches CHECK (from_branch_id != to_branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Student branch transfers table created\n');
    
    // PHASE 6: INSERT DEFAULT SCHOOL
    console.log('📋 Phase 6: Creating default school...');
    await connection.query(`
      INSERT IGNORE INTO schools (code, name, short_name, school_type, affiliation, is_active, subscription_plan)
      VALUES ('DEFAULT', 'Default School', 'Default', 'k12', 'Not Specified', TRUE, 'premium')
    `);
    const [schools] = await connection.query('SELECT id FROM schools WHERE code = "DEFAULT"');
    const defaultSchoolId = schools[0].id;
    console.log(`✅ Default school created (ID: ${defaultSchoolId})\n`);
    
    // PHASE 7: INSERT DEFAULT BRANCH
    console.log('📋 Phase 7: Creating default branch...');
    await connection.query(`
      INSERT IGNORE INTO school_branches (school_id, code, name, branch_type, is_active)
      VALUES (?, 'MAIN', 'Main Campus', 'main', TRUE)
    `, [defaultSchoolId]);
    const [branches] = await connection.query('SELECT id FROM school_branches WHERE school_id = ? AND code = "MAIN"', [defaultSchoolId]);
    const defaultBranchId = branches[0].id;
    console.log(`✅ Default branch created (ID: ${defaultBranchId})\n`);
    
    console.log('🎉 Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`  - Default School ID: ${defaultSchoolId}`);
    console.log(`  - Default Branch ID: ${defaultBranchId}`);
    console.log(`  - Tables created: 5`);
    console.log('\n⚠️  Note: To complete the migration, you need to:');
    console.log('  1. Add school_id/branch_id columns to existing tables');
    console.log('  2. Migrate existing student data to enrollments');
    console.log('  3. Create views and stored procedures');
    console.log('\n  Run the full migration SQL file manually or contact admin.\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed\n');
    }
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
