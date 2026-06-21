# Multi-Year, Multi-Branch, Multi-School Data Management Strategy

## Table of Contents
1. [Student Year-to-Year Progression](#1-student-year-to-year-progression)
2. [Historical Data Retention](#2-historical-data-retention)
3. [Multi-Branch School Management](#3-multi-branch-school-management)
4. [Multi-School Management](#4-multi-school-management)
5. [Implementation Guide](#5-implementation-guide)

---

## 1. Student Year-to-Year Progression

### Current State (Problem)
The existing schema has a basic `promotion` table but lacks proper academic year tracking:
```sql
-- Current inadequate structure
CREATE TABLE `promotion` (
  `cursession` varchar(20),
  `prosession` varchar(20),
  `profromclass` varchar(20),
  `protoclass` varchar(20)
);
```

**Issues:**
- ❌ No link to actual student records
- ❌ No historical tracking of promotions
- ❌ No academic year management
- ❌ Student data gets overwritten each year

### Optimized Solution

#### A. Academic Year Management
```sql
-- Track academic years centrally
CREATE TABLE academic_years (
  id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(20) NOT NULL UNIQUE, -- e.g., "2024-2025"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_current (is_current),
  INDEX idx_active (is_active),
  INDEX idx_dates (start_date, end_date),
  
  CONSTRAINT chk_year_dates CHECK (end_date > start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Example data
INSERT INTO academic_years (name, start_date, end_date, is_current) VALUES
  ('2024-2025', '2024-04-01', '2025-03-31', TRUE),
  ('2025-2026', '2025-04-01', '2026-03-31', FALSE);
```

#### B. Student Enrollment History (Year-to-Year Tracking)
```sql
-- Track student enrollment for each academic year
CREATE TABLE student_enrollments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  academic_year_id SMALLINT UNSIGNED NOT NULL,
  class_id BIGINT UNSIGNED NOT NULL,
  section_id INT UNSIGNED NOT NULL,
  roll_number VARCHAR(50) NOT NULL,
  enrollment_date DATE NOT NULL,
  completion_date DATE NULL,
  status ENUM('enrolled', 'promoted', 'detained', 'transferred', 'dropped') DEFAULT 'enrolled',
  promoted_to_enrollment_id BIGINT UNSIGNED NULL COMMENT 'Link to next year enrollment',
  attendance_percentage DECIMAL(5,2),
  final_result ENUM('pass', 'fail', 'pending', 'detained') NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_student_year_class (student_id, academic_year_id),
  INDEX idx_student_id (student_id),
  INDEX idx_academic_year (academic_year_id),
  INDEX idx_class_section (class_id, section_id),
  INDEX idx_status (status),
  INDEX idx_roll_number (roll_number),
  
  CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) 
    REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_academic_year FOREIGN KEY (academic_year_id) 
    REFERENCES academic_years(id) ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_class FOREIGN KEY (class_id) 
    REFERENCES classes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_section FOREIGN KEY (section_id) 
    REFERENCES sections(id) ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_promoted_to FOREIGN KEY (promoted_to_enrollment_id) 
    REFERENCES student_enrollments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### C. Promotion Records
```sql
-- Track promotion decisions and bulk promotions
CREATE TABLE student_promotions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  from_enrollment_id BIGINT UNSIGNED NOT NULL,
  to_enrollment_id BIGINT UNSIGNED NOT NULL,
  from_academic_year_id SMALLINT UNSIGNED NOT NULL,
  to_academic_year_id SMALLINT UNSIGNED NOT NULL,
  promotion_type ENUM('promoted', 'detained', 'transferred', 'graduated') NOT NULL,
  promotion_date DATE NOT NULL,
  promoted_by BIGINT UNSIGNED NOT NULL COMMENT 'user_id who approved',
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_from_to_enrollment (from_enrollment_id, to_enrollment_id),
  INDEX idx_from_enrollment (from_enrollment_id),
  INDEX idx_to_enrollment (to_enrollment_id),
  INDEX idx_promotion_type (promotion_type),
  INDEX idx_promotion_date (promotion_date),
  
  CONSTRAINT fk_promotions_from_enrollment FOREIGN KEY (from_enrollment_id) 
    REFERENCES student_enrollments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_promotions_to_enrollment FOREIGN KEY (to_enrollment_id) 
    REFERENCES student_enrollments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_promotions_promoted_by FOREIGN KEY (promoted_by) 
    REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### D. Promotion Workflow

**Step 1: End of Academic Year**
```sql
-- Mark all students with final results
UPDATE student_enrollments 
SET 
  completion_date = '2025-03-31',
  status = 'promoted',
  final_result = 'pass',
  attendance_percentage = 95.5
WHERE academic_year_id = (SELECT id FROM academic_years WHERE name = '2024-2025')
  AND student_id = 123;
```

**Step 2: Bulk Promotion Process**
```sql
-- Stored procedure for bulk promotion
DELIMITER $$

CREATE PROCEDURE promote_students_bulk(
  IN p_from_year_id SMALLINT UNSIGNED,
  IN p_to_year_id SMALLINT UNSIGNED,
  IN p_from_class_id BIGINT UNSIGNED,
  IN p_to_class_id BIGINT UNSIGNED,
  IN p_promoted_by BIGINT UNSIGNED
)
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_student_id BIGINT UNSIGNED;
  DECLARE v_from_enrollment_id BIGINT UNSIGNED;
  DECLARE v_new_enrollment_id BIGINT UNSIGNED;
  
  -- Cursor for eligible students
  DECLARE student_cursor CURSOR FOR
    SELECT se.student_id, se.id
    FROM student_enrollments se
    WHERE se.academic_year_id = p_from_year_id
      AND se.class_id = p_from_class_id
      AND se.final_result = 'pass'
      AND se.status = 'enrolled';
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  START TRANSACTION;
  
  OPEN student_cursor;
  
  promotion_loop: LOOP
    FETCH student_cursor INTO v_student_id, v_from_enrollment_id;
    
    IF done THEN
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
      p_to_year_id,
      p_to_class_id,
      section_id, -- Keep same section or change as needed
      CONCAT(YEAR(CURDATE()), '-', v_student_id),
      (SELECT start_date FROM academic_years WHERE id = p_to_year_id),
      'enrolled'
    FROM student_enrollments
    WHERE id = v_from_enrollment_id;
    
    SET v_new_enrollment_id = LAST_INSERT_ID();
    
    -- Update previous enrollment
    UPDATE student_enrollments
    SET 
      status = 'promoted',
      promoted_to_enrollment_id = v_new_enrollment_id
    WHERE id = v_from_enrollment_id;
    
    -- Record promotion
    INSERT INTO student_promotions (
      from_enrollment_id,
      to_enrollment_id,
      from_academic_year_id,
      to_academic_year_id,
      promotion_type,
      promotion_date,
      promoted_by
    ) VALUES (
      v_from_enrollment_id,
      v_new_enrollment_id,
      p_from_year_id,
      p_to_year_id,
      'promoted',
      CURDATE(),
      p_promoted_by
    );
    
  END LOOP;
  
  CLOSE student_cursor;
  COMMIT;
END$$

DELIMITER ;

-- Usage
CALL promote_students_bulk(
  1,  -- From 2024-2025
  2,  -- To 2025-2026
  5,  -- From Class 5
  6,  -- To Class 6
  1   -- Promoted by user_id 1
);
```

**Step 3: Query Student's Complete Academic History**
```sql
-- Get complete academic journey of a student
SELECT 
  s.roll_number AS current_roll,
  p.first_name,
  p.last_name,
  ay.name AS academic_year,
  c.name AS class_name,
  sec.name AS section,
  se.roll_number AS year_roll_number,
  se.enrollment_date,
  se.completion_date,
  se.status,
  se.final_result,
  se.attendance_percentage,
  sp.promotion_type,
  sp.promotion_date
FROM students s
JOIN persons p ON p.id = s.person_id
LEFT JOIN student_enrollments se ON se.student_id = s.id
LEFT JOIN academic_years ay ON ay.id = se.academic_year_id
LEFT JOIN classes c ON c.id = se.class_id
LEFT JOIN sections sec ON sec.id = se.section_id
LEFT JOIN student_promotions sp ON sp.from_enrollment_id = se.id
WHERE s.id = 123
ORDER BY se.enrollment_date;
```

---

## 2. Historical Data Retention

### Strategy: Never Delete, Always Archive

#### A. Soft Delete Implementation
All tables have `deleted_at` column for soft deletes:
```sql
-- Students table with soft delete
CREATE TABLE students (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  -- ... other columns ...
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_deleted (deleted_at)
);

-- Soft delete a student
UPDATE students SET deleted_at = NOW() WHERE id = 123;

-- Query only active students
SELECT * FROM students WHERE deleted_at IS NULL;

-- Query all including deleted
SELECT * FROM students;
```

#### B. Historical Tables for Audit Trail

**1. Attendance History** - Already partitioned by academic year:
```sql
-- Attendance linked to academic year via session
SELECT 
  ay.name AS academic_year,
  COUNT(*) AS total_sessions,
  SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS present_count,
  SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) AS absent_count
FROM attendance_records ar
JOIN attendance_sessions ats ON ats.id = ar.session_id
JOIN classes c ON c.id = ats.class_id
JOIN academic_years ay ON ay.id = c.academic_year_id
WHERE ar.student_id = 123
GROUP BY ay.id, ay.name
ORDER BY ay.start_date;
```

**2. Exam/Marks History** - Retained permanently:
```sql
-- All exam records are kept forever
SELECT 
  ay.name AS academic_year,
  ex.name AS exam_name,
  sub.name AS subject,
  sm.marks_obtained,
  es.max_marks,
  CONCAT(ROUND((sm.marks_obtained / es.max_marks) * 100, 2), '%') AS percentage
FROM student_marks sm
JOIN exam_schedules es ON es.id = sm.exam_schedule_id
JOIN exams ex ON ex.id = es.exam_id
JOIN academic_years ay ON ay.id = ex.academic_year_id
JOIN subjects sub ON sub.id = es.subject_id
WHERE sm.student_id = 123
ORDER BY ay.start_date, ex.start_date;
```

**3. Fee Payment History** - Never deleted:
```sql
-- Complete fee payment history
SELECT 
  ay.name AS academic_year,
  c.name AS class_name,
  fs.fee_type,
  sf.total_amount,
  sf.paid_amount,
  sf.balance_amount,
  fp.receipt_number,
  fp.payment_date,
  fp.amount AS payment_amount
FROM fee_payments fp
JOIN student_fees sf ON sf.id = fp.student_fee_id
JOIN fee_structures fs ON fs.id = sf.fee_structure_id
JOIN academic_years ay ON ay.id = fs.academic_year_id
JOIN students s ON s.id = sf.student_id
JOIN student_enrollments se ON se.student_id = s.id AND se.academic_year_id = ay.id
JOIN classes c ON c.id = se.class_id
WHERE s.id = 123
ORDER BY fp.payment_date;
```

#### C. Data Archival Strategy

**Archive Old Data to Separate Tables** (after 5+ years):
```sql
-- Archive table for very old enrollments
CREATE TABLE student_enrollments_archive (
  -- Same structure as student_enrollments
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Archive data older than 5 years
INSERT INTO student_enrollments_archive
SELECT *, NOW() AS archived_at
FROM student_enrollments se
JOIN academic_years ay ON ay.id = se.academic_year_id
WHERE ay.end_date < DATE_SUB(CURDATE(), INTERVAL 5 YEAR);

-- Delete from main table after archival
DELETE se FROM student_enrollments se
JOIN academic_years ay ON ay.id = se.academic_year_id
WHERE ay.end_date < DATE_SUB(CURDATE(), INTERVAL 5 YEAR);
```

#### D. Data Retention Policy

| Data Type | Retention Period | Location |
|-----------|------------------|----------|
| Active Students | Current + 1 year | Main tables |
| Graduated Students | 10 years | Main tables |
| Academic Records | Permanent | Main tables |
| Attendance | 5 years active, then archive | Main → Archive |
| Fee Payments | Permanent (tax/audit) | Main tables |
| Exam Results | Permanent | Main tables |
| User Login Logs | 2 years | Main tables |
| System Audit Logs | 3 years | Main tables |

---

## 3. Multi-Branch School Management

### Solution: Branch/Campus as Organization Level

#### A. School Branches Table
```sql
-- Define school branches/campuses
CREATE TABLE school_branches (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  branch_type ENUM('main', 'branch', 'campus', 'satellite') DEFAULT 'branch',
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  phone VARCHAR(20),
  email VARCHAR(255),
  principal_id BIGINT UNSIGNED NULL,
  established_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_code (code),
  INDEX idx_active (is_active),
  INDEX idx_principal_id (principal_id),
  
  CONSTRAINT fk_branches_principal FOREIGN KEY (principal_id) 
    REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample data
INSERT INTO school_branches (code, name, branch_type, city, state) VALUES
  ('MAIN', 'ABC School - Main Campus', 'main', 'Hyderabad', 'Telangana'),
  ('EAST', 'ABC School - East Branch', 'branch', 'Secunderabad', 'Telangana'),
  ('WEST', 'ABC School - West Branch', 'branch', 'KPHB', 'Telangana');
```

#### B. Link All Entities to Branch

**Update Classes to Include Branch:**
```sql
ALTER TABLE classes
  ADD COLUMN branch_id INT UNSIGNED NOT NULL AFTER academic_year_id,
  ADD INDEX idx_branch_id (branch_id),
  ADD CONSTRAINT fk_classes_branch FOREIGN KEY (branch_id) 
    REFERENCES school_branches(id) ON DELETE RESTRICT;

-- Now classes are unique per branch and year
ALTER TABLE classes
  DROP INDEX uk_class_year_name,
  ADD UNIQUE KEY uk_branch_year_class (branch_id, academic_year_id, name);
```

**Update Students to Include Branch:**
```sql
ALTER TABLE students
  ADD COLUMN branch_id INT UNSIGNED NOT NULL AFTER person_id,
  ADD INDEX idx_branch_id (branch_id),
  ADD CONSTRAINT fk_students_branch FOREIGN KEY (branch_id) 
    REFERENCES school_branches(id) ON DELETE RESTRICT;
```

**Update Teachers/Staff to Include Branch:**
```sql
ALTER TABLE teachers
  ADD COLUMN branch_id INT UNSIGNED NULL AFTER person_id,
  ADD INDEX idx_branch_id (branch_id),
  ADD CONSTRAINT fk_teachers_branch FOREIGN KEY (branch_id) 
    REFERENCES school_branches(id) ON DELETE SET NULL;

ALTER TABLE staff
  ADD COLUMN branch_id INT UNSIGNED NULL AFTER person_id,
  ADD INDEX idx_branch_id (branch_id),
  ADD CONSTRAINT fk_staff_branch FOREIGN KEY (branch_id) 
    REFERENCES school_branches(id) ON DELETE SET NULL;
```

#### C. Branch-Level Queries

**Get all students in a branch:**
```sql
SELECT 
  b.name AS branch_name,
  c.name AS class_name,
  sec.name AS section,
  COUNT(s.id) AS student_count
FROM school_branches b
JOIN classes c ON c.branch_id = b.id
JOIN sections sec ON sec.class_id = c.id
JOIN student_enrollments se ON se.class_id = c.id AND se.section_id = sec.id
JOIN students s ON s.id = se.student_id
WHERE b.id = 1
  AND se.status = 'enrolled'
GROUP BY b.id, c.id, sec.id
ORDER BY c.numeric_grade, sec.name;
```

**Get branch-wise summary:**
```sql
SELECT 
  b.code,
  b.name,
  COUNT(DISTINCT s.id) AS total_students,
  COUNT(DISTINCT t.id) AS total_teachers,
  COUNT(DISTINCT st.id) AS total_staff
FROM school_branches b
LEFT JOIN students s ON s.branch_id = b.id AND s.deleted_at IS NULL
LEFT JOIN teachers t ON t.branch_id = b.id AND t.deleted_at IS NULL
LEFT JOIN staff st ON st.branch_id = b.id AND st.deleted_at IS NULL
WHERE b.is_active = TRUE
GROUP BY b.id
ORDER BY b.code;
```

#### D. Inter-Branch Transfer

```sql
-- Student transfer between branches
CREATE TABLE student_branch_transfers (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  from_branch_id INT UNSIGNED NOT NULL,
  to_branch_id INT UNSIGNED NOT NULL,
  from_enrollment_id BIGINT UNSIGNED NOT NULL,
  to_enrollment_id BIGINT UNSIGNED NOT NULL,
  transfer_date DATE NOT NULL,
  transfer_reason TEXT,
  approved_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_student_id (student_id),
  INDEX idx_from_branch (from_branch_id),
  INDEX idx_to_branch (to_branch_id),
  INDEX idx_transfer_date (transfer_date),
  
  CONSTRAINT fk_transfers_student FOREIGN KEY (student_id) 
    REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_transfers_from_branch FOREIGN KEY (from_branch_id) 
    REFERENCES school_branches(id) ON DELETE RESTRICT,
  CONSTRAINT fk_transfers_to_branch FOREIGN KEY (to_branch_id) 
    REFERENCES school_branches(id) ON DELETE RESTRICT,
  CONSTRAINT fk_transfers_approved_by FOREIGN KEY (approved_by) 
    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 4. Multi-School Management

### Solution: School/Organization as Top-Level Entity

#### A. Schools/Organizations Table
```sql
-- Top-level organization/school
CREATE TABLE schools (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  school_type ENUM('primary', 'secondary', 'higher_secondary', 'k12', 'college') NOT NULL,
  affiliation VARCHAR(100) COMMENT 'CBSE, ICSE, State Board, etc.',
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_code (code),
  INDEX idx_active (is_active),
  INDEX idx_subscription (subscription_plan, subscription_expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample data
INSERT INTO schools (code, name, short_name, school_type, affiliation) VALUES
  ('ABC', 'ABC International School', 'ABC School', 'k12', 'CBSE'),
  ('XYZ', 'XYZ Public School', 'XYZ School', 'higher_secondary', 'State Board');
```

#### B. Link Branches to Schools
```sql
ALTER TABLE school_branches
  ADD COLUMN school_id INT UNSIGNED NOT NULL FIRST,
  ADD INDEX idx_school_id (school_id),
  ADD CONSTRAINT fk_branches_school FOREIGN KEY (school_id) 
    REFERENCES schools(id) ON DELETE CASCADE;

-- Update unique constraints
ALTER TABLE school_branches
  DROP INDEX code,
  ADD UNIQUE KEY uk_school_branch_code (school_id, code);
```

#### C. Multi-Tenant Architecture

**Option 1: Single Database with School ID (Recommended)**
- All tables include `school_id` column
- Data segregated by school_id in queries
- Shared infrastructure, isolated data
- Cost-effective for SaaS model

```sql
-- Add school_id to all major tables
ALTER TABLE academic_years
  ADD COLUMN school_id INT UNSIGNED NOT NULL FIRST,
  ADD INDEX idx_school_id (school_id),
  ADD CONSTRAINT fk_academic_years_school FOREIGN KEY (school_id) 
    REFERENCES schools(id) ON DELETE CASCADE,
  DROP INDEX name,
  ADD UNIQUE KEY uk_school_year (school_id, name);

ALTER TABLE users
  ADD COLUMN school_id INT UNSIGNED NOT NULL AFTER id,
  ADD INDEX idx_school_id (school_id),
  ADD CONSTRAINT fk_users_school FOREIGN KEY (school_id) 
    REFERENCES schools(id) ON DELETE CASCADE;

-- All queries must include school_id
SELECT * FROM students 
WHERE school_id = 1  -- ABC School
  AND deleted_at IS NULL;
```

**Option 2: Separate Database per School**
- Each school gets its own database
- Complete isolation
- Higher resource usage
- Better for very large schools

```sql
-- Database naming convention
CREATE DATABASE sms_school_abc;
CREATE DATABASE sms_school_xyz;

-- Application handles routing based on school
```

#### D. School-Level Data Isolation

**Row-Level Security via Views:**
```sql
-- Create view for each school
CREATE VIEW school_1_students AS
SELECT * FROM students WHERE school_id = 1;

CREATE VIEW school_2_students AS
SELECT * FROM students WHERE school_id = 2;

-- Grant access only to specific views
GRANT SELECT, INSERT, UPDATE ON sms.school_1_students TO 'school1_user'@'%';
```

**Application-Level Security:**
```javascript
// Middleware to enforce school context
function enforceSchoolContext(req, res, next) {
  // Get school_id from user session
  const schoolId = req.user.school_id;
  
  // Add to all queries
  req.schoolId = schoolId;
  next();
}

// All database queries include school filter
const students = await pool.query(
  'SELECT * FROM students WHERE school_id = ? AND class_id = ?',
  [req.schoolId, classId]
);
```

#### E. Cross-School Queries (Admin/Platform Level)

```sql
-- Platform admin can see all schools
SELECT 
  s.code,
  s.name,
  COUNT(DISTINCT sb.id) AS branches,
  COUNT(DISTINCT st.id) AS students,
  COUNT(DISTINCT t.id) AS teachers
FROM schools s
LEFT JOIN school_branches sb ON sb.school_id = s.id
LEFT JOIN students st ON st.school_id = s.id AND st.deleted_at IS NULL
LEFT JOIN teachers t ON t.school_id = s.id AND t.deleted_at IS NULL
WHERE s.is_active = TRUE
GROUP BY s.id
ORDER BY s.name;
```

---

## 5. Implementation Guide

### Phase 1: Add Multi-School Support

```sql
-- 1. Create schools table
CREATE TABLE schools (...); -- as defined above

-- 2. Create default school for existing data
INSERT INTO schools (code, name, short_name, school_type, is_active) 
VALUES ('DEFAULT', 'Default School', 'Default', 'k12', TRUE);

-- 3. Add school_id to all tables
ALTER TABLE academic_years ADD COLUMN school_id INT UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN school_id INT UNSIGNED NOT NULL DEFAULT 1;
-- ... repeat for all major tables

-- 4. Add foreign keys
ALTER TABLE academic_years 
  ADD CONSTRAINT fk_academic_years_school 
  FOREIGN KEY (school_id) REFERENCES schools(id);
-- ... repeat for all tables

-- 5. Update unique constraints to include school_id
-- ... as shown in examples above
```

### Phase 2: Add Multi-Branch Support

```sql
-- 1. Create school_branches table
CREATE TABLE school_branches (...); -- as defined above

-- 2. Create default branch for existing school
INSERT INTO school_branches (school_id, code, name, branch_type, is_active)
VALUES (1, 'MAIN', 'Main Campus', 'main', TRUE);

-- 3. Add branch_id to relevant tables
ALTER TABLE classes ADD COLUMN branch_id INT UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE students ADD COLUMN branch_id INT UNSIGNED NOT NULL DEFAULT 1;
-- ... repeat for other tables

-- 4. Add foreign keys and indexes
-- ... as shown in examples above
```

### Phase 3: Implement Year-to-Year Tracking

```sql
-- 1. Create student_enrollments table
CREATE TABLE student_enrollments (...); -- as defined above

-- 2. Create student_promotions table
CREATE TABLE student_promotions (...); -- as defined above

-- 3. Migrate existing student data to enrollments
INSERT INTO student_enrollments (
  student_id, academic_year_id, class_id, section_id, 
  roll_number, enrollment_date, status
)
SELECT 
  s.id,
  (SELECT id FROM academic_years WHERE is_current = TRUE),
  s.class_id,
  s.section_id,
  s.roll_number,
  s.admission_date,
  'enrolled'
FROM students s
WHERE s.deleted_at IS NULL;
```

### Phase 4: Application Updates

```javascript
// config.js - Add school context
const getCurrentSchool = () => {
  // Get from session, subdomain, or configuration
  return process.env.SCHOOL_ID || 1;
};

// All queries include school_id
const getStudents = async (classId) => {
  const schoolId = getCurrentSchool();
  
  const query = `
    SELECT 
      s.id,
      s.roll_number,
      p.first_name,
      p.last_name,
      c.name AS class_name
    FROM students s
    JOIN persons p ON p.id = s.person_id
    JOIN student_enrollments se ON se.student_id = s.id
    JOIN classes c ON c.id = se.class_id
    JOIN academic_years ay ON ay.id = c.academic_year_id
    WHERE s.school_id = ?
      AND se.class_id = ?
      AND ay.is_current = TRUE
      AND s.deleted_at IS NULL
  `;
  
  return await pool.query(query, [schoolId, classId]);
};

// Promotion workflow
const promoteStudents = async (fromClassId, toClassId, studentIds) => {
  const schoolId = getCurrentSchool();
  const currentYear = await getCurrentAcademicYear(schoolId);
  const nextYear = await getNextAcademicYear(schoolId);
  
  for (const studentId of studentIds) {
    // Create new enrollment
    const newEnrollment = await createEnrollment({
      student_id: studentId,
      academic_year_id: nextYear.id,
      class_id: toClassId,
      enrollment_date: nextYear.start_date
    });
    
    // Update old enrollment
    await updateEnrollment(oldEnrollmentId, {
      status: 'promoted',
      promoted_to_enrollment_id: newEnrollment.id
    });
    
    // Record promotion
    await recordPromotion({
      from_enrollment_id: oldEnrollmentId,
      to_enrollment_id: newEnrollment.id,
      promotion_type: 'promoted'
    });
  }
};
```

### Data Migration Scripts

```sql
-- Complete migration script combining all phases
-- See: migrations/2025-11-15_multi_school_migration.sql
```

---

## Summary

### ✅ Key Features Implemented

1. **Year-to-Year Management**
   - Academic years tracked centrally
   - Student enrollments per year preserved
   - Complete promotion history
   - Never overwrite student data

2. **Historical Data**
   - All academic records permanent
   - Soft deletes for reversibility
   - Archive strategy for old data
   - Complete audit trail

3. **Multi-Branch**
   - Each school can have multiple branches
   - Students/staff assigned to branches
   - Branch-level reporting
   - Inter-branch transfers supported

4. **Multi-School**
   - Single platform, multiple schools
   - Complete data isolation
   - School-level configuration
   - Platform-level administration

### 📊 Database Impact

| Feature | Tables Added | Columns Added | Indexes Added |
|---------|--------------|---------------|---------------|
| Multi-School | 1 | 15+ | 20+ |
| Multi-Branch | 2 | 10+ | 15+ |
| Year Tracking | 2 | 5+ | 10+ |
| **Total** | **5** | **30+** | **45+** |

### 🚀 Next Steps

1. Review the additional tables and schema changes
2. Test in staging environment
3. Create migration scripts for your specific data
4. Update application code to support multi-school/branch
5. Execute migration during maintenance window

---

**Document Version**: 1.0  
**Last Updated**: November 15, 2025  
**Status**: Ready for Implementation
