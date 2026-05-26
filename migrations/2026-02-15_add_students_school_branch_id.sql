-- =============================================================================
-- Add school_id and branch_id to students table
-- =============================================================================
-- Run this when you get: Unknown column 'student.school_id' in 'field list'
--
-- The Student model expects school_id and branch_id. The optimized schema
-- created students without these columns. This script adds them and links
-- existing rows to the default school/branch (id = 1).
--
-- HOW TO RUN:
--   USE sms;
--   SOURCE path/to/2026-02-15_add_students_school_branch_id.sql;
-- =============================================================================

-- Ensure schools and school_branches exist and have default row
CREATE TABLE IF NOT EXISTS `schools` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `school_type` VARCHAR(50) NOT NULL DEFAULT 'k12',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `school_branches` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT UNSIGNED NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `branch_type` VARCHAR(20) DEFAULT 'main',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  CONSTRAINT `fk_sb_school` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `schools` (`id`, `code`, `name`, `school_type`) VALUES
(1, 'DEF', 'Default School', 'k12');

INSERT IGNORE INTO `school_branches` (`id`, `school_id`, `code`, `name`, `branch_type`) VALUES
(1, 1, 'MAIN', 'Main Branch', 'main');

-- Add school_id and branch_id to students only if missing (safe to run multiple times)
DELIMITER //
DROP PROCEDURE IF EXISTS add_students_school_branch_columns//
CREATE PROCEDURE add_students_school_branch_columns()
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'school_id') = 0 THEN
    ALTER TABLE `students` ADD COLUMN `school_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `person_id`;
  END IF;
  IF (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'branch_id') = 0 THEN
    ALTER TABLE `students` ADD COLUMN `branch_id` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `school_id`;
  END IF;
END//
DELIMITER ;
CALL add_students_school_branch_columns();
DROP PROCEDURE IF EXISTS add_students_school_branch_columns;

-- Optional: add indexes for the new columns (skip if you get "Duplicate key name")
-- ALTER TABLE `students` ADD INDEX `idx_students_school_id` (`school_id`);
-- ALTER TABLE `students` ADD INDEX `idx_students_branch_id` (`branch_id`);
