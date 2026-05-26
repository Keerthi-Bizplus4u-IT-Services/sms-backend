-- =============================================================================
-- Seed Student Profile for Student Portal
-- =============================================================================
-- Run this in MySQL when a user with role "student" gets:
--   "Student profile not found for this user" (403)
--
-- This creates the missing `persons` and `students` rows and links the user
-- to an existing class/section (or creates minimal ones if none exist).
--
-- HOW TO RUN:
--   1. Open MySQL and select your database:   USE sms;
--   2. Set the student user id below (default 414).
--   3. Run this entire file.
-- =============================================================================

SET @student_user_id = 414;

-- -----------------------------------------------------------------------------
-- 1. Ensure we have at least one academic_year, class, and section
--    (skip if you already have data)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `academic_years` (`id`, `name`, `start_date`, `end_date`, `is_current`)
SELECT 1, '2024-2025', '2024-04-01', '2025-03-31', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM academic_years LIMIT 1);

INSERT IGNORE INTO `classes` (`id`, `academic_year_id`, `name`, `numeric_grade`, `created_at`, `updated_at`)
SELECT 1, 1, 'Class One', 1, NOW(), NOW()
FROM DUAL
WHERE EXISTS (SELECT 1 FROM academic_years WHERE id = 1)
  AND NOT EXISTS (SELECT 1 FROM classes LIMIT 1);

-- Sections table: section may have class_id and name. Get first class id.
INSERT IGNORE INTO `sections` (`id`, `class_id`, `name`, `created_at`, `updated_at`)
SELECT 1, (SELECT id FROM classes ORDER BY id ASC LIMIT 1), 'A', NOW(), NOW()
FROM DUAL
WHERE EXISTS (SELECT 1 FROM classes LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM sections LIMIT 1);

-- -----------------------------------------------------------------------------
-- 2. Insert Person for this user (if not exists)
-- -----------------------------------------------------------------------------
INSERT INTO persons (
  user_id,
  first_name,
  last_name,
  gender,
  date_of_birth,
  created_at,
  updated_at
)
SELECT
  @student_user_id,
  'Student',
  'User',
  'other',
  '2010-01-01',
  NOW(),
  NOW()
FROM DUAL
WHERE EXISTS (SELECT 1 FROM users WHERE id = @student_user_id AND deleted_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM persons WHERE user_id = @student_user_id AND deleted_at IS NULL);

-- -----------------------------------------------------------------------------
-- 3. Insert Student for that person (if not exists)
--    Uses first available class_id and section_id; unique roll and admission numbers.
-- -----------------------------------------------------------------------------
INSERT INTO students (
  person_id,
  roll_number,
  admission_number,
  admission_date,
  class_id,
  section_id,
  current_status,
  created_at,
  updated_at
)
SELECT
  p.id,
  CONCAT('STU-', @student_user_id),
  CONCAT('ADM-', @student_user_id),
  CURDATE(),
  (SELECT id FROM classes WHERE deleted_at IS NULL ORDER BY id ASC LIMIT 1),
  (SELECT id FROM sections WHERE deleted_at IS NULL ORDER BY id ASC LIMIT 1),
  'active',
  NOW(),
  NOW()
FROM persons p
WHERE p.user_id = @student_user_id
  AND p.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM students WHERE person_id = p.id AND deleted_at IS NULL)
LIMIT 1;

-- If your students table has school_id/branch_id, they get DEFAULT 1 from the add_students_school_branch_id migration.

-- Verify (run after the inserts):
-- SELECT u.id AS user_id, u.email, p.id AS person_id, s.id AS student_id, s.roll_number, s.admission_number
-- FROM users u
-- LEFT JOIN persons p ON p.user_id = u.id AND p.deleted_at IS NULL
-- LEFT JOIN students s ON s.person_id = p.id AND s.deleted_at IS NULL
-- WHERE u.id = @student_user_id;
