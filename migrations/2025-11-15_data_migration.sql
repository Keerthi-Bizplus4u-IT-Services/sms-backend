-- ============================================================================
-- SMS Database Data Migration Script
-- Version: 2.2
-- Date: 2025-11-15
-- Description: Migrate data from old schema to normalized schema (Fixed 1064 Error & Warnings)
-- ============================================================================

USE sms;

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';

START TRANSACTION;

-- ============================================================================
-- STEP 1: Migrate Users from old user table
-- ============================================================================

-- Migrate existing users with password hashing placeholder
INSERT INTO `users` (`id`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`)
SELECT * FROM (
  SELECT 
    `uid` AS id,
    `emailid` AS email,
    CONCAT('$2b$10$LEGACY_', MD5(`password`)) AS password_hash, 
    CASE 
      WHEN `role` = '1' THEN 1  -- admin
      WHEN `role` = '2' THEN 2  -- student
      WHEN `role` = '3' THEN 3  -- parent
      WHEN `role` = '4' THEN 4  -- teacher
      ELSE 1
    END AS role_id,
    TRUE AS is_active,
    NOW() AS created_at
  FROM `user`
  WHERE `emailid` IS NOT NULL 
    AND `emailid` != '' 
    AND `emailid` NOT LIKE '-%'
) AS new_values
ON DUPLICATE KEY UPDATE 
  `email` = new_values.email;

-- ============================================================================
-- STEP 2: Create Academic Year (if not exists)
-- ============================================================================

-- Insert current academic year
INSERT INTO `academic_years` (`name`, `start_date`, `end_date`, `is_current`)
VALUES 
  ('2024-2025', '2024-04-01', '2025-03-31', TRUE),
  ('2023-2024', '2023-04-01', '2024-03-31', FALSE),
  ('2022-2023', '2022-04-01', '2023-03-31', FALSE)
AS new_values
ON DUPLICATE KEY UPDATE 
  `name` = new_values.name;

-- Get current academic year ID
SET @current_year_id = (SELECT `id` FROM `academic_years` WHERE `is_current` = TRUE LIMIT 1);

-- ============================================================================
-- STEP 3: Migrate Classes
-- ============================================================================

INSERT INTO `classes` (`id`, `academic_year_id`, `name`, `numeric_grade`, `created_at`)
SELECT * FROM (
  SELECT 
    `cid` AS id,
    @current_year_id AS academic_year_id,
    `cn` AS name,
    CASE 
      WHEN `cn` REGEXP '^[0-9]+$' THEN CAST(`cn` AS UNSIGNED)
      ELSE NULL
    END AS numeric_grade,
    NOW() AS created_at
  FROM `class`
  WHERE `cid` > 0
) AS new_values
ON DUPLICATE KEY UPDATE 
  `name` = new_values.name;

-- ============================================================================
-- STEP 4: Migrate Sections
-- ============================================================================

INSERT INTO `sections` (`id`, `class_id`, `name`, `created_at`)
SELECT * FROM (
  SELECT 
    `secid` AS id,
    CASE 
      WHEN `cid` REGEXP '^[0-9]+$' THEN CAST(`cid` AS UNSIGNED)
      ELSE NULL
    END AS class_id,
    `sname` AS name,
    NOW() AS created_at
  FROM `section`
  WHERE `secid` > 0 
    AND `cid` REGEXP '^[0-9]+$'
    AND CAST(`cid` AS UNSIGNED) > 0
) AS new_values
ON DUPLICATE KEY UPDATE 
  `name` = new_values.name;

-- ============================================================================
-- STEP 5: Migrate Subjects
-- ============================================================================

INSERT INTO `subjects` (`id`, `code`, `name`, `created_at`)
SELECT * FROM (
  SELECT 
    `subid` AS id,
    COALESCE(NULLIF(`scode`, ''), CONCAT('SUB', `subid`)) AS code,
    COALESCE(NULLIF(`sname`, ''), CONCAT('Subject ', `subid`)) AS name,
    NOW() AS created_at
  FROM `subjects_legacy`
  WHERE `subid` > 0
) AS new_values
ON DUPLICATE KEY UPDATE 
  `code` = new_values.code,
  `name` = new_values.name;

-- Link subjects to classes
INSERT INTO `class_subjects` (`class_id`, `subject_id`, `is_mandatory`)
SELECT * FROM (
  SELECT DISTINCT
    CAST(`cid` AS UNSIGNED) AS class_id,
    `subid` AS subject_id,
    TRUE AS is_mandatory
  FROM `subjects_legacy`
  WHERE `cid` REGEXP '^[0-9]+$'
    AND CAST(`cid` AS UNSIGNED) > 0
    AND `subid` > 0
) AS new_values
ON DUPLICATE KEY UPDATE 
  `is_mandatory` = new_values.is_mandatory;

-- ============================================================================
-- STEP 6: Migrate Students
-- ============================================================================

-- 6.1 Create persons from student table
INSERT INTO `persons` (
  `user_id`, 
  `first_name`, 
  `last_name`, 
  `gender`, 
  `date_of_birth`, 
  `blood_group`, 
  `religion`, 
  `id_number`, 
  `phone`, 
  `address_line1`, 
  `photo_url`, 
  `created_at`
)
SELECT * FROM (
  SELECT 
    CASE WHEN u.uid IS NOT NULL THEN u.uid ELSE NULL END AS user_id,
    COALESCE(NULLIF(s.fname, ''), 'Unknown') AS first_name,
    COALESCE(NULLIF(s.lname, ''), '') AS last_name,
    CASE 
      WHEN s.gen = '0' OR s.gen = 'F' THEN 'female'
      WHEN s.gen = '1' OR s.gen = 'M' THEN 'male'
      ELSE 'prefer_not_to_say'
    END AS gender,
    COALESCE(STR_TO_DATE(s.dob, '%Y-%m-%d'), STR_TO_DATE(s.dob, '%d/%m/%y'), STR_TO_DATE(s.dob, '%d-%m-%Y'), NULL) AS date_of_birth,
    CASE 
      WHEN s.bg IN ('0', '1', '2', '3', '4', '5', '6', '7') THEN 
        ELT(CAST(s.bg AS UNSIGNED) + 1, 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
      ELSE NULL
    END AS blood_group,
    s.rel AS religion,
    NULLIF(s.aid, '') AS id_number,
    NULLIF(s.phone, '') AS phone,
    NULL AS address_line1,
    NULLIF(s.sphoto, '') AS photo_url,
    NOW() AS created_at
  FROM `student` s
  LEFT JOIN `user` u ON u.emailid = s.email AND u.role = '2'
  WHERE s.uid >= 0
    AND NULLIF(s.fname, '') IS NOT NULL
) AS new_values
ON DUPLICATE KEY UPDATE 
  `first_name` = new_values.first_name;

-- 6.2 Create student records
INSERT INTO `students` (
  `person_id`,
  `roll_number`,
  `admission_number`,
  `admission_date`,
  `class_id`,
  `section_id`,
  `current_status`,
  `previous_school`,
  `medical_conditions`,
  `emergency_contact`,
  `created_at`
)
SELECT * FROM (
  SELECT 
    p.id AS person_id,
    s.roll AS roll_number,
    COALESCE(NULLIF(s.sanumber, ''), CONCAT('ADM', s.uid)) AS admission_number,
    COALESCE(STR_TO_DATE(s.admissiondate, '%d/%m/%Y'), STR_TO_DATE(s.admissiondate, '%Y-%m-%d'), STR_TO_DATE(s.admissiondate, '%d-%m-%Y'), CURDATE()) AS admission_date,
    CASE 
      WHEN s.cid REGEXP '^[0-9]+$' THEN CAST(s.cid AS UNSIGNED)
      ELSE (SELECT MIN(id) FROM classes)
    END AS class_id,
    CASE 
      WHEN s.secid REGEXP '^[0-9]+$' THEN CAST(s.secid AS UNSIGNED)
      ELSE (SELECT MIN(id) FROM sections)
    END AS section_id,
    'active' AS current_status,
    NULL AS previous_school,
    NULL AS medical_conditions,
    NULLIF(s.phone, '') AS emergency_contact,
    NOW() AS created_at
  FROM `student` s
  JOIN `persons` p ON p.first_name = COALESCE(NULLIF(s.fname, ''), 'Unknown')
    AND (p.user_id IN (SELECT uid FROM user WHERE emailid = s.email) OR p.user_id IS NULL)
  WHERE s.uid >= 0
    AND s.roll IS NOT NULL
    AND s.roll != ''
) AS new_values
ON DUPLICATE KEY UPDATE 
  `roll_number` = new_values.roll_number;

-- ============================================================================
-- STEP 7: Migrate Parents
-- ============================================================================

-- 7.1 Create persons from parent table
INSERT INTO `persons` (
  `user_id`,
  `first_name`,
  `last_name`,
  `gender`,
  `date_of_birth`,
  `blood_group`,
  `religion`,
  `id_number`,
  `phone`,
  `address_line1`,
  `photo_url`,
  `created_at`
)
SELECT * FROM (
  SELECT DISTINCT
    CASE WHEN u.uid IS NOT NULL THEN u.uid ELSE NULL END AS user_id,
    COALESCE(NULLIF(p.fname, ''), 'Unknown') AS first_name,
    COALESCE(NULLIF(p.mname, ''), '') AS last_name,
    'prefer_not_to_say' AS gender,
    DATE_SUB(CURDATE(), INTERVAL 40 YEAR) AS date_of_birth,
    CASE 
      WHEN p.bgroup IN ('0', '1', '2', '3', '4', '5', '6', '7') THEN 
        ELT(CAST(p.bgroup AS UNSIGNED) + 1, 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
      ELSE NULL
    END AS blood_group,
    p.religion AS religion,
    NULLIF(p.idno, '') AS id_number,
    NULLIF(p.phone, '') AS phone,
    NULLIF(p.address, '') AS address_line1,
    NULLIF(p.sphoto, '') AS photo_url,
    NOW() AS created_at
  FROM `parent` p
  LEFT JOIN `user` u ON u.emailid = p.email AND u.role = '3'
  WHERE p.uid >= 0
    AND NULLIF(p.fname, '') IS NOT NULL
) AS new_values
ON DUPLICATE KEY UPDATE 
  `first_name` = new_values.first_name;

-- 7.2 Create parent records
INSERT INTO `parents` (
  `person_id`,
  `relationship_type`,
  `office_address`,
  `office_phone`,
  `occupation`,
  `pan_number`,
  `created_at`
)
SELECT * FROM (
  SELECT 
    per.id AS person_id,
    'guardian' AS relationship_type,
    NULLIF(p.address, '') AS office_address,
    NULLIF(p.phone, '') AS office_phone,
    NULLIF(p.occupation, '') AS occupation,
    NULLIF(p.panumber, '') AS pan_number,
    NOW() AS created_at
  FROM `parent` p
  JOIN `persons` per ON per.first_name = COALESCE(NULLIF(p.fname, ''), 'Unknown')
    AND (per.user_id IN (SELECT uid FROM user WHERE emailid = p.email) OR per.user_id IS NULL)
  WHERE p.uid >= 0
    AND NULLIF(p.fname, '') IS NOT NULL
) AS new_values
ON DUPLICATE KEY UPDATE 
  `relationship_type` = new_values.relationship_type,
  `office_address` = new_values.office_address,
  `office_phone` = new_values.office_phone,
  `occupation` = new_values.occupation,
  `pan_number` = new_values.pan_number;

-- 7.3 Link students to parents
INSERT INTO `student_parents` (
  `student_id`,
  `parent_id`,
  `relationship_type`,
  `is_primary_contact`,
  `created_at`
)
SELECT * FROM (
  SELECT DISTINCT
    st.id AS student_id,
    par.id AS parent_id,
    'father' AS relationship_type,
    TRUE AS is_primary_contact,
    NOW() AS created_at
  FROM `student` s
  JOIN `students` st ON st.roll_number = s.roll
  JOIN `parent` p ON p.sid = s.uid
  JOIN `parents` par ON par.person_id IN (
    SELECT id FROM persons WHERE first_name = COALESCE(NULLIF(p.fname, ''), 'Unknown')
  )
  WHERE s.uid >= 0 AND p.uid >= 0
) AS new_values
ON DUPLICATE KEY UPDATE 
  `is_primary_contact` = new_values.is_primary_contact;

-- ============================================================================
-- STEP 8: Migrate Teachers
-- ============================================================================

-- 8.1 Create persons from teacher table
INSERT INTO `persons` (
  `user_id`,
  `first_name`,
  `last_name`,
  `gender`,
  `date_of_birth`,
  `blood_group`,
  `religion`,
  `id_number`,
  `phone`,
  `address_line1`,
  `photo_url`,
  `created_at`
)
SELECT * FROM (
  SELECT 
    CASE WHEN u.uid IS NOT NULL THEN u.uid ELSE NULL END AS user_id,
    COALESCE(NULLIF(t.fname, ''), 'Unknown') AS first_name,
    COALESCE(NULLIF(t.lname, ''), '') AS last_name,
    CASE 
      WHEN t.gen = '0' OR t.gen = 'F' THEN 'female'
      WHEN t.gen = '1' OR t.gen = 'M' THEN 'male'
      ELSE 'prefer_not_to_say'
    END AS gender,
      COALESCE(STR_TO_DATE(t.dob, '%d-%m-%Y'), STR_TO_DATE(t.dob, '%d/%m/%Y'), STR_TO_DATE(t.dob, '%Y-%m-%d'), STR_TO_DATE(t.dob, '%d/%m/%y')) AS date_of_birth,
    CASE 
      WHEN t.bg IN ('0', '1', '2', '3', '4', '5', '6', '7', '-1') THEN 
        ELT(CAST(t.bg AS SIGNED) + 2, 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
      ELSE NULL
    END AS blood_group,
    t.rel AS religion,
    NULLIF(t.idno, '') AS id_number,
    NULLIF(t.phone, '') AS phone,
    NULLIF(t.address, '') AS address_line1,
    NULLIF(t.sphoto, '') AS photo_url,
    NOW() AS created_at
  FROM `teacher` t
  LEFT JOIN `user` u ON u.emailid = t.email AND u.role = '4'
  WHERE t.uid > 0
    AND NULLIF(t.fname, '') IS NOT NULL
) AS new_values
ON DUPLICATE KEY UPDATE 
  `first_name` = new_values.first_name;

-- 8.2 Create teacher records
INSERT INTO `teachers` (
  `person_id`,
  `employee_id`,
  `specialization`,
  `join_date`,
  `employment_status`,
  `designation`,
  `salary`,
  `created_at`
)
SELECT * FROM (
  SELECT 
    p.id AS person_id,
    CONCAT('TCH', LPAD(t.uid, 6, '0')) AS employee_id,
    NULLIF(t.skills, '') AS specialization,
    COALESCE(STR_TO_DATE(t.dob, '%d-%m-%Y'), CURDATE()) AS join_date,
    CASE 
      WHEN t.active = 1 THEN 'active'
      ELSE 'resigned'
    END AS employment_status,
    'Teacher' AS designation,
    CASE 
      WHEN t.salary REGEXP '^[0-9]+(\\.[0-9]+)?$' THEN CAST(t.salary AS DECIMAL(10,2))
      ELSE NULL
    END AS salary,
    NOW() AS created_at
  FROM `teacher` t
  JOIN `persons` p ON p.first_name = COALESCE(NULLIF(t.fname, ''), 'Unknown')
    AND (p.user_id IN (SELECT uid FROM user WHERE emailid = t.email) OR p.user_id IS NULL)
  WHERE t.uid > 0
    AND NULLIF(t.fname, '') IS NOT NULL
) AS new_values
ON DUPLICATE KEY UPDATE 
  `employee_id` = new_values.employee_id,
  `employment_status` = new_values.employment_status,
  `designation` = new_values.designation,
  `salary` = new_values.salary;

-- 8.3 Create salaries for teachers
INSERT INTO `salaries` (
  `employee_type`,
  `employee_id`,
  `basic_salary`,
  `effective_from`,
  `created_at`
)
SELECT * FROM (
  SELECT 
    'teacher' AS employee_type,
    teach.id AS employee_id,
    CASE 
      WHEN t.salary REGEXP '^[0-9]+$' THEN CAST(t.salary AS DECIMAL(12,2))
      ELSE 0.00
    END AS basic_salary,
    CURDATE() AS effective_from,
    NOW() AS created_at
  FROM `teacher` t
  JOIN `teachers` teach ON teach.employee_id = CONCAT('TCH', LPAD(t.uid, 6, '0'))
  WHERE t.uid > 0
    AND t.salary IS NOT NULL
    AND t.salary != ''
) AS new_values
ON DUPLICATE KEY UPDATE 
  `basic_salary` = new_values.basic_salary;

-- ============================================================================
-- STEP 9: Migrate Administrative Staff
-- ============================================================================

-- 9.1 Create persons from admin table
INSERT INTO `persons` (
  `user_id`,
  `first_name`,
  `last_name`,
  `gender`,
  `date_of_birth`,
  `religion`,
  `id_number`,
  `phone`,
  `address_line1`,
  `created_at`
)
SELECT * FROM (
  SELECT 
    a.uid AS user_id,
    COALESCE(NULLIF(a.fname, ''), 'Unknown') AS first_name,
    COALESCE(NULLIF(a.lname, ''), '') AS last_name,
    CASE 
      WHEN a.gender IN ('male', 'female') THEN a.gender
      WHEN LOWER(a.gender) = 'm' THEN 'male'
      WHEN LOWER(a.gender) = 'f' THEN 'female'
      ELSE 'prefer_not_to_say'
    END AS gender,
    COALESCE(STR_TO_DATE(a.dob, '%d/%m/%y'), STR_TO_DATE(a.dob, '%Y-%m-%d'), STR_TO_DATE(a.dob, '%d-%m-%Y'), DATE_SUB(CURDATE(), INTERVAL 30 YEAR)) AS date_of_birth,
    a.religion AS religion,
    NULLIF(a.idno, '') AS id_number,
    NULLIF(a.phone, '') AS phone,
    NULLIF(a.address, '') AS address_line1,
    NOW() AS created_at
  FROM `admin` a
  WHERE a.uid > 0
    AND NULLIF(a.fname, '') IS NOT NULL
) AS new_values
ON DUPLICATE KEY UPDATE 
  `first_name` = new_values.first_name;

-- 9.2 Create staff records
INSERT INTO `staff` (
  `person_id`,
  `employee_id`,
  `department`,
  `designation`,
  `joining_date`,
  `employment_status`,
  `created_at`
)
SELECT * FROM (
  SELECT 
    p.id AS person_id,
    CONCAT('STF', LPAD(a.uid, 6, '0')) AS employee_id,
    CASE 
      WHEN a.usertype = 'library' THEN 'library'
      WHEN a.usertype = 'accounts' THEN 'accounts'
      WHEN a.usertype = 'exam' THEN 'exam'
      WHEN a.usertype = 'transport' THEN 'transport'
      ELSE 'administration'
    END AS department,
    COALESCE(NULLIF(a.usertype, ''), 'Staff') AS designation,
    CURDATE() AS joining_date,
    CASE 
      WHEN a.active = 1 THEN 'active'
      ELSE 'resigned'
    END AS employment_status,
    NOW() AS created_at
  FROM `admin` a
  JOIN `persons` p ON p.user_id = a.uid
  WHERE a.uid > 0
    AND NULLIF(a.fname, '') IS NOT NULL
) AS new_values
ON DUPLICATE KEY UPDATE 
  `employee_id` = new_values.employee_id;

-- 9.3 Create salaries for staff
INSERT INTO `salaries` (
  `employee_type`,
  `employee_id`,
  `basic_salary`,
  `effective_from`,
  `created_at`
)
SELECT * FROM (
  SELECT 
    'staff' AS employee_type,
    s.id AS employee_id,
    CASE 
      WHEN a.salary REGEXP '^[0-9]+$' THEN CAST(a.salary AS DECIMAL(12,2))
      ELSE 0.00
    END AS basic_salary,
    CURDATE() AS effective_from,
    NOW() AS created_at
  FROM `admin` a
  JOIN `staff` s ON s.employee_id = CONCAT('STF', LPAD(a.uid, 6, '0'))
  WHERE a.uid > 0
    AND a.salary IS NOT NULL
    AND a.salary != ''
) AS new_values
ON DUPLICATE KEY UPDATE 
  `basic_salary` = new_values.basic_salary;

-- ============================================================================
-- STEP 10: Migrate Fees
-- ============================================================================

-- 10.1 Create fee structures from feedetails
INSERT INTO `fee_structures` (
  `academic_year_id`,
  `class_id`,
  `fee_type`,
  `amount`,
  `due_term`,
  `created_at`
)
SELECT * FROM (
  SELECT 
    @current_year_id AS academic_year_id,
    CASE 
      WHEN f.class REGEXP '^[0-9]+$' THEN CAST(f.class AS UNSIGNED)
      ELSE (SELECT MIN(id) FROM classes)
    END AS class_id,
    'tuition' AS fee_type,
    CASE 
      WHEN f.tfee REGEXP '^[0-9]+' THEN CAST(f.tfee AS DECIMAL(12,2))
      ELSE 0.00
    END AS amount,
    'annual' AS due_term,
    NOW() AS created_at
  FROM `feedetails` f
  WHERE f.class IS NOT NULL
) AS new_values
ON DUPLICATE KEY UPDATE 
  `amount` = new_values.amount;

-- 10.2 Create student fees from fees table
INSERT INTO `student_fees` (
  `student_id`,
  `fee_structure_id`,
  `total_amount`,
  `paid_amount`,
  `status`,
  `created_at`
)
SELECT * FROM (
  SELECT 
    st.id AS student_id,
    fs.id AS fee_structure_id,
    CASE 
      WHEN f.fee REGEXP '^[0-9]+' THEN CAST(f.fee AS DECIMAL(12,2))
      ELSE 0.00
    END AS total_amount,
    CASE 
      WHEN f.Paidfee REGEXP '^[0-9]+' THEN CAST(f.Paidfee AS DECIMAL(12,2))
      ELSE 0.00
    END AS paid_amount,
    CASE 
      WHEN CAST(f.Paidfee AS DECIMAL(12,2)) >= CAST(f.fee AS DECIMAL(12,2)) THEN 'paid'
      WHEN CAST(f.Paidfee AS DECIMAL(12,2)) > 0 THEN 'partial'
      ELSE 'pending'
    END AS status,
    NOW() AS created_at
  FROM `fees` f
  JOIN `students` st ON st.person_id IN (
    SELECT id FROM persons WHERE user_id = f.uid
  )
  JOIN `fee_structures` fs ON fs.class_id = st.class_id 
    AND fs.fee_type = 'tuition' 
    AND fs.academic_year_id = @current_year_id
  WHERE f.uid > 0
) AS new_values
ON DUPLICATE KEY UPDATE 
  `paid_amount` = new_values.paid_amount,
  `status` = new_values.status;

-- ============================================================================
-- STEP 11: Commit Transaction
-- ============================================================================

COMMIT;

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET SQL_MODE=@OLD_SQL_MODE;

-- ============================================================================
-- Post-Migration Validation Queries
-- ============================================================================

-- Validate user count
SELECT 'Users Migrated' AS Info, COUNT(*) AS Count FROM users;

-- Validate students count
SELECT 'Students Migrated' AS Info, COUNT(*) AS Count FROM students;

-- Validate teachers count
SELECT 'Teachers Migrated' AS Info, COUNT(*) AS Count FROM teachers;

-- Validate parents count
SELECT 'Parents Migrated' AS Info, COUNT(*) AS Count FROM parents;

-- Validate classes count
SELECT 'Classes Migrated' AS Info, COUNT(*) AS Count FROM classes;

-- Validate sections count
SELECT 'Sections Migrated' AS Info, COUNT(*) AS Count FROM sections;

-- ============================================================================
-- END OF DATA MIGRATION SCRIPT
-- ============================================================================
