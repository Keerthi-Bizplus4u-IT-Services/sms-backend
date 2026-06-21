-- ============================================================================
-- Fix Missing Schools and Multi-Tenancy Columns
-- ============================================================================

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;

-- 1. Create Schools Table
CREATE TABLE IF NOT EXISTS `schools` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `school_type` ENUM('primary', 'secondary', 'higher_secondary', 'k12', 'college', 'university') NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create School Branches Table
CREATE TABLE IF NOT EXISTS `school_branches` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `school_id` INTEGER UNSIGNED NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `branch_type` ENUM('main', 'branch') DEFAULT 'main',
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Insert Default School and Branch
INSERT IGNORE INTO `schools` (`id`, `code`, `name`, `school_type`) VALUES
(1, 'DEF', 'Default School', 'k12');

INSERT IGNORE INTO `school_branches` (`id`, `school_id`, `code`, `name`, `branch_type`) VALUES
(1, 1, 'MAIN', 'Main Branch', 'main');

-- 4. Add school_id and branch_id to existing tables (with default 1)

-- Users
ALTER TABLE `users`
ADD COLUMN IF NOT EXISTS `school_id` INTEGER UNSIGNED DEFAULT 1 AFTER `role_id`;

-- Students
ALTER TABLE `students`
ADD COLUMN IF NOT EXISTS `school_id` INTEGER UNSIGNED NOT NULL DEFAULT 1 AFTER `person_id`,
ADD COLUMN IF NOT EXISTS `branch_id` INTEGER UNSIGNED NOT NULL DEFAULT 1 AFTER `school_id`;

-- Classes
ALTER TABLE `classes`
ADD COLUMN IF NOT EXISTS `school_id` INTEGER UNSIGNED NOT NULL DEFAULT 1 AFTER `id`,
ADD COLUMN IF NOT EXISTS `branch_id` INTEGER UNSIGNED NOT NULL DEFAULT 1 AFTER `school_id`;

-- Sections
ALTER TABLE `sections`
ADD COLUMN IF NOT EXISTS `school_id` INTEGER UNSIGNED NOT NULL DEFAULT 1 AFTER `class_id`;

-- Teachers
ALTER TABLE `teachers`
ADD COLUMN IF NOT EXISTS `school_id` INTEGER UNSIGNED NOT NULL DEFAULT 1 AFTER `person_id`,
ADD COLUMN IF NOT EXISTS `branch_id` INTEGER UNSIGNED NOT NULL DEFAULT 1 AFTER `school_id`;

-- Academic Years
ALTER TABLE `academic_years`
ADD COLUMN IF NOT EXISTS `school_id` INTEGER UNSIGNED NOT NULL DEFAULT 1 AFTER `id`;

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
