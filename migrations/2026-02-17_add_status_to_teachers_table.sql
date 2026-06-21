-- Add missing status column to teachers table to match Sequelize model
-- and fix "Unknown column 'Teacher.status' in 'where clause'" errors

START TRANSACTION;

-- Ensure the teachers table has a status column used by the v1 API.
-- NOTE: Older MySQL versions don't support IF NOT EXISTS on ADD COLUMN / ADD INDEX,
-- so this script assumes the column and index do NOT exist yet.
-- If you re-run it after adding them once, you will get "Duplicate column/index" errors.

ALTER TABLE `teachers`
  ADD COLUMN `status` ENUM('active', 'inactive', 'on_leave', 'resigned')
  NOT NULL DEFAULT 'active' AFTER `employment_status`;

ALTER TABLE `teachers`
  ADD INDEX `idx_teachers_status` (`status`);

COMMIT;

