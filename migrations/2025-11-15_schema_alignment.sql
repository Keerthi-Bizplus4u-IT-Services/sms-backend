-- ============================================================================
-- Schema Alignment Migration
-- Purpose: Align live MySQL schema with Sequelize models (naming + normalization)
-- Date: 2025-11-15
-- ============================================================================

SET UNIQUE_CHECKS=0;
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_VALUE_ON_ZERO,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

START TRANSACTION;

-- ============================================================================
-- Roles table: add audit columns & consistent collation
-- ============================================================================
ALTER TABLE `roles`
  MODIFY `name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY `description` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE `roles`
  ADD COLUMN `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER `description`,
  ADD COLUMN `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- ============================================================================
-- Sections + dependent tables: rename capacity column & widen identifiers
-- ============================================================================
ALTER TABLE `students` DROP FOREIGN KEY `fk_students_section`;
ALTER TABLE `attendance_sessions` DROP FOREIGN KEY `fk_attendance_sessions_section`;
ALTER TABLE `assignments` DROP FOREIGN KEY `assignments_ibfk_3`;
ALTER TABLE `class_timetable` DROP FOREIGN KEY `class_timetable_ibfk_3`;

ALTER TABLE `sections`
  MODIFY `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  MODIFY `class_id` BIGINT UNSIGNED NOT NULL,
  CHANGE COLUMN `capacity` `max_students` SMALLINT UNSIGNED NOT NULL DEFAULT 40 COMMENT 'Maximum capacity',
  MODIFY `room_number` VARCHAR(20) NULL;

ALTER TABLE `students`
  MODIFY `section_id` BIGINT UNSIGNED NOT NULL;

ALTER TABLE `attendance_sessions`
  MODIFY `section_id` BIGINT UNSIGNED NOT NULL;

ALTER TABLE `assignments`
  MODIFY `section_id` BIGINT UNSIGNED NOT NULL;

ALTER TABLE `class_timetable`
  MODIFY `section_id` BIGINT UNSIGNED NOT NULL;

ALTER TABLE `students`
  ADD CONSTRAINT `fk_students_section`
    FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE CASCADE;

ALTER TABLE `attendance_sessions`
  ADD CONSTRAINT `fk_attendance_sessions_section`
    FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `assignments`
  ADD CONSTRAINT `assignments_ibfk_3`
    FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE CASCADE;

ALTER TABLE `class_timetable`
  ADD CONSTRAINT `class_timetable_ibfk_3`
    FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE CASCADE;

-- ============================================================================
-- Subjects table: add subject type & remove legacy active flag
-- ============================================================================
ALTER TABLE `subjects`
  DROP INDEX `idx_active`,
  DROP COLUMN `is_active`,
  MODIFY `code` VARCHAR(20) NULL,
  ADD COLUMN `type` ENUM('core','elective','optional','extra_curricular') NOT NULL DEFAULT 'core' AFTER `description`;

CREATE INDEX `idx_type` ON `subjects`(`type`);

-- ============================================================================
-- Parents table: capture relationship metadata
-- ============================================================================
ALTER TABLE `parents`
  ADD COLUMN `relationship_type` ENUM('father','mother','guardian','other') NOT NULL DEFAULT 'guardian' AFTER `person_id`,
  ADD COLUMN `office_address` TEXT NULL AFTER `relationship_type`,
  ADD COLUMN `office_phone` VARCHAR(20) NULL AFTER `office_address`;

ALTER TABLE `parents`
  ADD INDEX `idx_relationship_type` (`relationship_type`);

-- ============================================================================
-- Teachers table: align naming & add designation/salary
-- ============================================================================
ALTER TABLE `teachers`
  CHANGE COLUMN `joining_date` `join_date` DATE NOT NULL,
  CHANGE COLUMN `employment_status` `status` ENUM('active','inactive','on_leave','resigned') NOT NULL DEFAULT 'active',
  MODIFY `experience_years` DECIMAL(4,2) NULL,
  ADD COLUMN `designation` VARCHAR(100) NULL AFTER `join_date`,
  ADD COLUMN `salary` DECIMAL(10,2) NULL AFTER `status`;

-- ============================================================================
-- Students table: rename status column, add medical info, drop unused fields
-- ============================================================================
ALTER TABLE `students`
  CHANGE COLUMN `current_status` `status` ENUM('active','inactive','transferred','graduated','suspended') NOT NULL DEFAULT 'active',
  MODIFY `roll_number` VARCHAR(50) NULL,
  MODIFY `admission_number` VARCHAR(50) NOT NULL,
  ADD COLUMN `medical_conditions` VARCHAR(255) NULL AFTER `previous_school`,
  ADD COLUMN `emergency_contact` VARCHAR(20) NULL AFTER `medical_conditions`,
  DROP COLUMN `transfer_certificate_number`,
  DROP COLUMN `row_version`;

COMMIT;

SET SQL_MODE=DEFAULT;
SET FOREIGN_KEY_CHECKS=1;
SET UNIQUE_CHECKS=1;
