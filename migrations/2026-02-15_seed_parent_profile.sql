-- =============================================================================
-- Seed Parent Profile for Parent Portal
-- =============================================================================
-- Run this in MySQL when a user with role "parent" gets:
--   "Parent profile not found for this user" (403)
--
-- This creates the missing `persons` and `parents` rows so the parent
-- dashboard can load.
--
-- HOW TO RUN:
--   1. Open MySQL (command line, MySQL Workbench, or any client).
--   2. Select your database:   USE sms;   (or your actual DB name)
--   3. Set the parent user id: SET @parent_user_id = 415;   (use your user id)
--   4. Run this entire file, or copy-paste the two INSERT blocks below.
-- =============================================================================

-- Set the user id of the parent user (change 415 to your parent user's id)
SET @parent_user_id = 415;

-- -----------------------------------------------------------------------------
-- 1. Insert Person for this user (if not exists)
--    Required: first_name, last_name, gender, date_of_birth
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
  @parent_user_id,
  'Parent',
  'User',
  'other',
  '1990-01-01',
  NOW(),
  NOW()
FROM DUAL
WHERE EXISTS (SELECT 1 FROM users WHERE id = @parent_user_id AND deleted_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM persons WHERE user_id = @parent_user_id AND deleted_at IS NULL);

-- -----------------------------------------------------------------------------
-- 2. Insert Parent for that person (if not exists)
-- -----------------------------------------------------------------------------
INSERT INTO parents (person_id, created_at, updated_at)
SELECT
  p.id,
  NOW(),
  NOW()
FROM persons p
WHERE p.user_id = @parent_user_id
  AND p.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM parents WHERE person_id = p.id AND deleted_at IS NULL);

-- -----------------------------------------------------------------------------
-- Optional: Fix ALL users with role "parent" who are missing Person/Parent
-- (Uncomment and run if you have multiple parent users to fix.)
-- -----------------------------------------------------------------------------
/*
INSERT INTO persons (user_id, first_name, last_name, gender, date_of_birth, created_at, updated_at)
SELECT
  u.id,
  COALESCE(u.email, 'Parent'),
  'User',
  'other',
  '1990-01-01',
  NOW(),
  NOW()
FROM users u
INNER JOIN roles r ON r.id = u.role_id AND LOWER(r.name) = 'parent'
WHERE u.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM persons p WHERE p.user_id = u.id AND p.deleted_at IS NULL);

INSERT INTO parents (person_id, created_at, updated_at)
SELECT p.id, NOW(), NOW()
FROM persons p
INNER JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
INNER JOIN roles r ON r.id = u.role_id AND LOWER(r.name) = 'parent'
WHERE p.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM parents par WHERE par.person_id = p.id AND par.deleted_at IS NULL);
*/

-- Verify (run after the inserts):
-- SELECT u.id AS user_id, u.email, p.id AS person_id, par.id AS parent_id
-- FROM users u
-- LEFT JOIN persons p ON p.user_id = u.id AND p.deleted_at IS NULL
-- LEFT JOIN parents par ON par.person_id = p.id AND par.deleted_at IS NULL
-- WHERE u.id = @parent_user_id;
