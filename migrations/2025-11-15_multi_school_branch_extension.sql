-- ============================================================================
-- Multi-School & Multi-Branch Extension Migration
-- ============================================================================
-- Purpose: Add support for multiple schools, branches, and year-to-year tracking
-- Version: 1.0
-- Date: November 15, 2025
--
-- This migration extends the optimized schema to support:
-- 1. Multiple schools (organizations) in single database
-- 2. Multiple branches per school
-- 3. Student year-to-year progression tracking
-- 4. Historical data preservation
--
-- PREREQUISITES:
-- - Run 2025-11-15_optimized_schema_migration.sql first
-- - Backup database before proceeding
-- ============================================================================

USE sms;

-- Disable foreign key checks for smooth migration
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- PHASE 1: CREATE MULTI-SCHOOL TABLES
-- ============================================================================

-- Schools/Organizations table (top-level entity)
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
  
  -- Contact Information
  logo_url VARCHAR(500),
  website VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  
  -- Status and Subscription
  is_active BOOLEAN DEFAULT TRUE,
  subscription_plan ENUM('free', 'basic', 'premium', 'enterprise') DEFAULT 'basic',
  subscription_expires_at DATE,
  max_students INT UNSIGNED DEFAULT 500,
  max_staff INT UNSIGNED DEFAULT 50,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_code (code),
  INDEX idx_active (is_active),
  INDEX idx_subscription (subscription_plan, subscription_expires_at),
  INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Top-level school/organization entities for multi-tenant support';

-- ============================================================================
-- PHASE 2: CREATE MULTI-BRANCH TABLES
-- ============================================================================

-- School branches/campuses table
CREATE TABLE IF NOT EXISTS school_branches (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  school_id INT UNSIGNED NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  branch_type ENUM('main', 'branch', 'campus', 'satellite', 'annexe') DEFAULT 'branch',
  
  -- Contact Information
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  phone VARCHAR(20),
  email VARCHAR(255),
  
  -- Branch Leadership
  principal_id BIGINT UNSIGNED NULL COMMENT 'Teacher who is principal/head',
  vice_principal_id BIGINT UNSIGNED NULL,
  
  -- Branch Details
  established_date DATE,
  total_classrooms SMALLINT UNSIGNED,
  total_labs SMALLINT UNSIGNED,
  has_library BOOLEAN DEFAULT TRUE,
  has_playground BOOLEAN DEFAULT TRUE,
  has_canteen BOOLEAN DEFAULT TRUE,
  has_hostel BOOLEAN DEFAULT FALSE,
  has_transport BOOLEAN DEFAULT TRUE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit
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
  -- Note: principal_id FK will be added after teachers table is updated
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='School branches/campuses for multi-location support';

-- ============================================================================
-- PHASE 3: CREATE YEAR-TO-YEAR TRACKING TABLES
-- ============================================================================

-- Student enrollments per academic year
CREATE TABLE IF NOT EXISTS student_enrollments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  academic_year_id SMALLINT UNSIGNED NOT NULL,
  class_id BIGINT UNSIGNED NOT NULL,
  section_id INT UNSIGNED NOT NULL,
  
  -- Enrollment Details
  roll_number VARCHAR(50) NOT NULL,
  enrollment_date DATE NOT NULL,
  completion_date DATE NULL,
  status ENUM('enrolled', 'promoted', 'detained', 'transferred', 'dropped', 'graduated') DEFAULT 'enrolled',
  
  -- Link to Next Year
  promoted_to_enrollment_id BIGINT UNSIGNED NULL COMMENT 'Next year enrollment if promoted',
  
  -- Performance Metrics
  attendance_percentage DECIMAL(5,2) COMMENT 'Overall attendance for the year',
  final_result ENUM('pass', 'fail', 'pending', 'detained', 'promoted', 'graduated') NULL,
  overall_grade VARCHAR(5) COMMENT 'A+, A, B+, etc.',
  final_percentage DECIMAL(5,2),
  
  -- Additional Info
  remarks TEXT,
  conduct_grade ENUM('excellent', 'good', 'satisfactory', 'needs_improvement') NULL,
  
  -- Audit
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
  
  CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) 
    REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_enrollments_academic_year FOREIGN KEY (academic_year_id) 
    REFERENCES academic_years(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_enrollments_class FOREIGN KEY (class_id) 
    REFERENCES classes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_enrollments_section FOREIGN KEY (section_id) 
    REFERENCES sections(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_enrollments_promoted_to FOREIGN KEY (promoted_to_enrollment_id) 
    REFERENCES student_enrollments(id) ON DELETE SET NULL ON UPDATE CASCADE,
    
  CONSTRAINT chk_enrollment_dates CHECK (completion_date IS NULL OR completion_date >= enrollment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Track student enrollment history for each academic year';

-- Student promotion records
CREATE TABLE IF NOT EXISTS student_promotions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  
  -- Enrollment Links
  from_enrollment_id BIGINT UNSIGNED NOT NULL,
  to_enrollment_id BIGINT UNSIGNED NOT NULL,
  
  -- Academic Year Links
  from_academic_year_id SMALLINT UNSIGNED NOT NULL,
  to_academic_year_id SMALLINT UNSIGNED NOT NULL,
  
  -- Promotion Details
  promotion_type ENUM('promoted', 'detained', 'transferred', 'graduated', 'skipped_grade') NOT NULL,
  promotion_date DATE NOT NULL,
  promoted_by BIGINT UNSIGNED NOT NULL COMMENT 'User ID who approved promotion',
  
  -- Performance Basis
  overall_percentage DECIMAL(5,2),
  attendance_percentage DECIMAL(5,2),
  conduct_rating ENUM('excellent', 'good', 'satisfactory', 'poor') NULL,
  
  -- Additional Info
  reason TEXT COMMENT 'Reason for detention/transfer if applicable',
  conditions TEXT COMMENT 'Conditions for promotion if any',
  remarks TEXT,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_from_to_enrollment (from_enrollment_id, to_enrollment_id),
  INDEX idx_from_enrollment (from_enrollment_id),
  INDEX idx_to_enrollment (to_enrollment_id),
  INDEX idx_from_year (from_academic_year_id),
  INDEX idx_to_year (to_academic_year_id),
  INDEX idx_promotion_type (promotion_type),
  INDEX idx_promotion_date (promotion_date),
  INDEX idx_promoted_by (promoted_by),
  
  CONSTRAINT fk_promotions_from_enrollment FOREIGN KEY (from_enrollment_id) 
    REFERENCES student_enrollments(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_promotions_to_enrollment FOREIGN KEY (to_enrollment_id) 
    REFERENCES student_enrollments(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_promotions_from_year FOREIGN KEY (from_academic_year_id) 
    REFERENCES academic_years(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_promotions_to_year FOREIGN KEY (to_academic_year_id) 
    REFERENCES academic_years(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_promotions_promoted_by FOREIGN KEY (promoted_by) 
    REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Track student promotion decisions and history';

-- ============================================================================
-- PHASE 4: CREATE TRANSFER TRACKING TABLES
-- ============================================================================

-- Student branch transfers
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
  
  CONSTRAINT fk_transfers_student FOREIGN KEY (student_id) 
    REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_transfers_from_branch FOREIGN KEY (from_branch_id) 
    REFERENCES school_branches(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_transfers_to_branch FOREIGN KEY (to_branch_id) 
    REFERENCES school_branches(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_transfers_from_enrollment FOREIGN KEY (from_enrollment_id) 
    REFERENCES student_enrollments(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_transfers_to_enrollment FOREIGN KEY (to_enrollment_id) 
    REFERENCES student_enrollments(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_transfers_approved_by FOREIGN KEY (approved_by) 
    REFERENCES users(id) ON UPDATE CASCADE,
    
  CONSTRAINT chk_transfer_different_branches CHECK (from_branch_id != to_branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Track student transfers between branches';

-- ============================================================================
-- PHASE 5: ADD SCHOOL/BRANCH COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add school_id to academic_years
ALTER TABLE academic_years
  ADD COLUMN school_id INT UNSIGNED NOT NULL FIRST,
  ADD INDEX idx_school_id (school_id),
  ADD CONSTRAINT fk_academic_years_school FOREIGN KEY (school_id) 
    REFERENCES schools(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Update unique constraint on academic_years
ALTER TABLE academic_years
  DROP INDEX name,
  ADD UNIQUE KEY uk_school_year_name (school_id, name);

-- Add school_id to users
ALTER TABLE users
  ADD COLUMN school_id INT UNSIGNED NOT NULL AFTER id,
  ADD INDEX idx_school_id (school_id),
  ADD CONSTRAINT fk_users_school FOREIGN KEY (school_id) 
    REFERENCES schools(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Update unique constraint on users
ALTER TABLE users
  DROP INDEX email,
  ADD UNIQUE KEY uk_school_email (school_id, email);

-- Add branch_id to classes
ALTER TABLE classes
  ADD COLUMN branch_id INT UNSIGNED NOT NULL AFTER academic_year_id,
  ADD INDEX idx_branch_id (branch_id),
  ADD CONSTRAINT fk_classes_branch FOREIGN KEY (branch_id) 
    REFERENCES school_branches(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update unique constraint on classes
ALTER TABLE classes
  DROP INDEX uk_class_year_name,
  ADD UNIQUE KEY uk_branch_year_class (branch_id, academic_year_id, name);

-- Add school_id and branch_id to students
ALTER TABLE students
  ADD COLUMN school_id INT UNSIGNED NOT NULL AFTER person_id,
  ADD COLUMN branch_id INT UNSIGNED NOT NULL AFTER school_id,
  ADD INDEX idx_school_id (school_id),
  ADD INDEX idx_branch_id (branch_id),
  ADD CONSTRAINT fk_students_school FOREIGN KEY (school_id) 
    REFERENCES schools(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_students_branch FOREIGN KEY (branch_id) 
    REFERENCES school_branches(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add school_id and branch_id to teachers
ALTER TABLE teachers
  ADD COLUMN school_id INT UNSIGNED NOT NULL AFTER person_id,
  ADD COLUMN branch_id INT UNSIGNED NULL AFTER school_id,
  ADD INDEX idx_school_id (school_id),
  ADD INDEX idx_branch_id (branch_id),
  ADD CONSTRAINT fk_teachers_school FOREIGN KEY (school_id) 
    REFERENCES schools(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_teachers_branch FOREIGN KEY (branch_id) 
    REFERENCES school_branches(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add school_id and branch_id to staff
ALTER TABLE staff
  ADD COLUMN school_id INT UNSIGNED NOT NULL AFTER person_id,
  ADD COLUMN branch_id INT UNSIGNED NULL AFTER school_id,
  ADD INDEX idx_school_id (school_id),
  ADD INDEX idx_branch_id (branch_id),
  ADD CONSTRAINT fk_staff_school FOREIGN KEY (school_id) 
    REFERENCES schools(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_staff_branch FOREIGN KEY (branch_id) 
    REFERENCES school_branches(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add school_id to subjects
ALTER TABLE subjects
  ADD COLUMN school_id INT UNSIGNED NOT NULL AFTER id,
  ADD INDEX idx_school_id (school_id),
  ADD CONSTRAINT fk_subjects_school FOREIGN KEY (school_id) 
    REFERENCES schools(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Update unique constraint on subjects
ALTER TABLE subjects
  DROP INDEX uk_subject_code,
  ADD UNIQUE KEY uk_school_subject_code (school_id, code);

-- ============================================================================
-- PHASE 6: ADD FOREIGN KEYS TO SCHOOL_BRANCHES
-- ============================================================================

-- Now add principal foreign keys (after teachers table is updated)
ALTER TABLE school_branches
  ADD CONSTRAINT fk_branches_principal FOREIGN KEY (principal_id) 
    REFERENCES teachers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT fk_branches_vice_principal FOREIGN KEY (vice_principal_id) 
    REFERENCES teachers(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- PHASE 7: CREATE DEFAULT SCHOOL AND BRANCH
-- ============================================================================

-- Insert default school for existing data
INSERT INTO schools (
  code, name, short_name, school_type, 
  affiliation, is_active, subscription_plan
) VALUES (
  'DEFAULT',
  'Default School',
  'Default',
  'k12',
  'Not Specified',
  TRUE,
  'premium'
);

-- Get the default school ID
SET @default_school_id = LAST_INSERT_ID();

-- Insert default branch for default school
INSERT INTO school_branches (
  school_id, code, name, branch_type, is_active
) VALUES (
  @default_school_id,
  'MAIN',
  'Main Campus',
  'main',
  TRUE
);

-- Get the default branch ID
SET @default_branch_id = LAST_INSERT_ID();

-- ============================================================================
-- PHASE 8: UPDATE EXISTING DATA WITH DEFAULT VALUES
-- ============================================================================

-- Update existing academic_years
UPDATE academic_years SET school_id = @default_school_id;

-- Update existing users
UPDATE users SET school_id = @default_school_id;

-- Update existing classes
UPDATE classes SET branch_id = @default_branch_id;

-- Update existing students
UPDATE students SET 
  school_id = @default_school_id,
  branch_id = @default_branch_id;

-- Update existing teachers
UPDATE teachers SET 
  school_id = @default_school_id,
  branch_id = @default_branch_id;

-- Update existing staff
UPDATE staff SET 
  school_id = @default_school_id,
  branch_id = @default_branch_id;

-- Update existing subjects
UPDATE subjects SET school_id = @default_school_id;

-- ============================================================================
-- PHASE 9: MIGRATE EXISTING STUDENTS TO ENROLLMENTS
-- ============================================================================

-- Create enrollments for all current students
INSERT INTO student_enrollments (
  student_id,
  academic_year_id,
  class_id,
  section_id,
  roll_number,
  enrollment_date,
  status
)
SELECT 
  s.id AS student_id,
  ay.id AS academic_year_id,
  s.class_id,
  s.section_id,
  s.roll_number,
  COALESCE(s.admission_date, ay.start_date) AS enrollment_date,
  'enrolled' AS status
FROM students s
JOIN academic_years ay ON ay.is_current = TRUE
WHERE s.deleted_at IS NULL
  AND s.class_id IS NOT NULL
  AND s.section_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  enrollment_date = VALUES(enrollment_date);

-- ============================================================================
-- PHASE 10: CREATE VIEWS FOR EASY QUERYING
-- ============================================================================

-- View for current student enrollments
CREATE OR REPLACE VIEW v_current_student_enrollments AS
SELECT 
  s.id AS student_id,
  s.roll_number AS student_roll,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  sch.name AS school_name,
  sb.name AS branch_name,
  c.name AS class_name,
  sec.name AS section_name,
  se.roll_number AS enrollment_roll,
  ay.name AS academic_year,
  se.enrollment_date,
  se.status AS enrollment_status,
  se.attendance_percentage,
  se.final_result
FROM student_enrollments se
JOIN students s ON s.id = se.student_id
JOIN persons p ON p.id = s.person_id
JOIN academic_years ay ON ay.id = se.academic_year_id
JOIN classes c ON c.id = se.class_id
JOIN sections sec ON sec.id = se.section_id
JOIN schools sch ON sch.id = s.school_id
JOIN school_branches sb ON sb.id = s.branch_id
WHERE ay.is_current = TRUE
  AND s.deleted_at IS NULL;

-- View for student promotion history
CREATE OR REPLACE VIEW v_student_promotion_history AS
SELECT 
  s.id AS student_id,
  s.roll_number,
  p.first_name,
  p.last_name,
  ay_from.name AS from_year,
  ay_to.name AS to_year,
  c_from.name AS from_class,
  c_to.name AS to_class,
  sp.promotion_type,
  sp.promotion_date,
  sp.overall_percentage,
  sp.attendance_percentage,
  u.username AS promoted_by_user
FROM student_promotions sp
JOIN student_enrollments se_from ON se_from.id = sp.from_enrollment_id
JOIN student_enrollments se_to ON se_to.id = sp.to_enrollment_id
JOIN students s ON s.id = se_from.student_id
JOIN persons p ON p.id = s.person_id
JOIN academic_years ay_from ON ay_from.id = sp.from_academic_year_id
JOIN academic_years ay_to ON ay_to.id = sp.to_academic_year_id
JOIN classes c_from ON c_from.id = se_from.class_id
JOIN classes c_to ON c_to.id = se_to.class_id
JOIN users u ON u.id = sp.promoted_by
WHERE s.deleted_at IS NULL;

-- View for branch statistics
CREATE OR REPLACE VIEW v_branch_statistics AS
SELECT 
  sch.name AS school_name,
  sb.code AS branch_code,
  sb.name AS branch_name,
  sb.branch_type,
  COUNT(DISTINCT s.id) AS total_students,
  COUNT(DISTINCT t.id) AS total_teachers,
  COUNT(DISTINCT st.id) AS total_staff,
  COUNT(DISTINCT c.id) AS total_classes
FROM school_branches sb
JOIN schools sch ON sch.id = sb.school_id
LEFT JOIN students s ON s.branch_id = sb.id AND s.deleted_at IS NULL
LEFT JOIN teachers t ON t.branch_id = sb.id AND t.deleted_at IS NULL
LEFT JOIN staff st ON st.branch_id = sb.id AND st.deleted_at IS NULL
LEFT JOIN classes c ON c.branch_id = sb.id
WHERE sb.is_active = TRUE
  AND sb.deleted_at IS NULL
GROUP BY sch.id, sb.id;

-- ============================================================================
-- PHASE 11: CREATE STORED PROCEDURES
-- ============================================================================

DELIMITER $$

-- Procedure to promote students in bulk
CREATE PROCEDURE sp_promote_students_bulk(
  IN p_from_academic_year_id SMALLINT UNSIGNED,
  IN p_to_academic_year_id SMALLINT UNSIGNED,
  IN p_from_class_id BIGINT UNSIGNED,
  IN p_to_class_id BIGINT UNSIGNED,
  IN p_promoted_by_user_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_done INT DEFAULT FALSE;
  DECLARE v_student_id BIGINT UNSIGNED;
  DECLARE v_from_enrollment_id BIGINT UNSIGNED;
  DECLARE v_section_id INT UNSIGNED;
  DECLARE v_new_enrollment_id BIGINT UNSIGNED;
  DECLARE v_attendance_pct DECIMAL(5,2);
  DECLARE v_final_pct DECIMAL(5,2);
  
  DECLARE student_cursor CURSOR FOR
    SELECT 
      se.student_id, 
      se.id,
      se.section_id,
      se.attendance_percentage,
      se.final_percentage
    FROM student_enrollments se
    WHERE se.academic_year_id = p_from_academic_year_id
      AND se.class_id = p_from_class_id
      AND se.final_result = 'pass'
      AND se.status = 'enrolled';
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;
  
  START TRANSACTION;
  
  OPEN student_cursor;
  
  promotion_loop: LOOP
    FETCH student_cursor INTO 
      v_student_id, 
      v_from_enrollment_id,
      v_section_id,
      v_attendance_pct,
      v_final_pct;
    
    IF v_done THEN
      LEAVE promotion_loop;
    END IF;
    
    -- Create new enrollment for next year
    INSERT INTO student_enrollments (
      student_id,
      academic_year_id,
      class_id,
      section_id,
      roll_number,
      enrollment_date,
      status
    )
    SELECT 
      v_student_id,
      p_to_academic_year_id,
      p_to_class_id,
      v_section_id,
      CONCAT(YEAR(CURDATE()), '-', LPAD(v_student_id, 6, '0')),
      (SELECT start_date FROM academic_years WHERE id = p_to_academic_year_id),
      'enrolled';
    
    SET v_new_enrollment_id = LAST_INSERT_ID();
    
    -- Update previous enrollment
    UPDATE student_enrollments
    SET 
      status = 'promoted',
      promoted_to_enrollment_id = v_new_enrollment_id,
      completion_date = (SELECT end_date FROM academic_years WHERE id = p_from_academic_year_id)
    WHERE id = v_from_enrollment_id;
    
    -- Record promotion
    INSERT INTO student_promotions (
      from_enrollment_id,
      to_enrollment_id,
      from_academic_year_id,
      to_academic_year_id,
      promotion_type,
      promotion_date,
      promoted_by,
      overall_percentage,
      attendance_percentage
    ) VALUES (
      v_from_enrollment_id,
      v_new_enrollment_id,
      p_from_academic_year_id,
      p_to_academic_year_id,
      'promoted',
      CURDATE(),
      p_promoted_by_user_id,
      v_final_pct,
      v_attendance_pct
    );
    
  END LOOP;
  
  CLOSE student_cursor;
  COMMIT;
  
  -- Return summary
  SELECT 
    COUNT(*) AS students_promoted,
    p_from_class_id AS from_class,
    p_to_class_id AS to_class
  FROM student_promotions
  WHERE from_academic_year_id = p_from_academic_year_id
    AND to_academic_year_id = p_to_academic_year_id
    AND DATE(created_at) = CURDATE();
    
END$$

-- Procedure to transfer student between branches
CREATE PROCEDURE sp_transfer_student_branch(
  IN p_student_id BIGINT UNSIGNED,
  IN p_from_branch_id INT UNSIGNED,
  IN p_to_branch_id INT UNSIGNED,
  IN p_to_class_id BIGINT UNSIGNED,
  IN p_to_section_id INT UNSIGNED,
  IN p_transfer_reason TEXT,
  IN p_approved_by BIGINT UNSIGNED
)
BEGIN
  DECLARE v_current_enrollment_id BIGINT UNSIGNED;
  DECLARE v_academic_year_id SMALLINT UNSIGNED;
  DECLARE v_new_enrollment_id BIGINT UNSIGNED;
  
  START TRANSACTION;
  
  -- Get current enrollment
  SELECT id, academic_year_id INTO v_current_enrollment_id, v_academic_year_id
  FROM student_enrollments
  WHERE student_id = p_student_id
    AND status = 'enrolled'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Create new enrollment at destination branch
  INSERT INTO student_enrollments (
    student_id,
    academic_year_id,
    class_id,
    section_id,
    roll_number,
    enrollment_date,
    status
  ) VALUES (
    p_student_id,
    v_academic_year_id,
    p_to_class_id,
    p_to_section_id,
    CONCAT('TR-', YEAR(CURDATE()), '-', LPAD(p_student_id, 6, '0')),
    CURDATE(),
    'enrolled'
  );
  
  SET v_new_enrollment_id = LAST_INSERT_ID();
  
  -- Update old enrollment
  UPDATE student_enrollments
  SET 
    status = 'transferred',
    completion_date = CURDATE()
  WHERE id = v_current_enrollment_id;
  
  -- Update student branch
  UPDATE students
  SET branch_id = p_to_branch_id
  WHERE id = p_student_id;
  
  -- Record transfer
  INSERT INTO student_branch_transfers (
    student_id,
    from_branch_id,
    to_branch_id,
    from_enrollment_id,
    to_enrollment_id,
    transfer_date,
    transfer_reason,
    transfer_type,
    approved_by,
    approval_date
  ) VALUES (
    p_student_id,
    p_from_branch_id,
    p_to_branch_id,
    v_current_enrollment_id,
    v_new_enrollment_id,
    CURDATE(),
    p_transfer_reason,
    'administrative',
    p_approved_by,
    CURDATE()
  );
  
  COMMIT;
  
  SELECT 'Student transferred successfully' AS result;
  
END$$

DELIMITER ;

-- ============================================================================
-- PHASE 12: RE-ENABLE FOREIGN KEY CHECKS
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check schools
SELECT 'Schools Created' AS Info, COUNT(*) AS Count FROM schools;

-- Check branches
SELECT 'Branches Created' AS Info, COUNT(*) AS Count FROM school_branches;

-- Check enrollments
SELECT 'Student Enrollments' AS Info, COUNT(*) AS Count FROM student_enrollments;

-- Check tables structure
SHOW TABLES LIKE '%school%';

-- Check foreign keys on students table
SELECT 
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'sms'
  AND TABLE_NAME = 'students'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

SELECT '=== Multi-School & Branch Migration Complete ===' AS Status;
