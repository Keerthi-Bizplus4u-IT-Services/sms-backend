-- sms Schema Optimization v2 (2025-11-15)
-- Safe, incremental migration to prepare for 10k+ concurrent users.
-- Strategy: additive changes first (new columns, indexes), keep old columns for compatibility.
-- Followed by data backfill and optionally enabling stricter FKs in a later step.

START TRANSACTION;
SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_VALUE_ON_ZERO,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- 1) Roles normalization (keeps existing user.role for backward compatibility)
CREATE TABLE IF NOT EXISTS `roles` (
  `id` TINYINT UNSIGNED NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `roles` (`id`,`name`,`description`) VALUES
  (1,'admin','Administrator'),
  (2,'student','Student user'),
  (3,'parent','Parent/guardian'),
  (4,'teacher','Teacher/faculty'),
  (5,'library','Library staff'),
  (6,'subjects','Subject coordinator'),
  (7,'accounts','Accounts/billing'),
  (8,'exam','Examinations/assessment'),
  (9,'transport','Transport manager'),
  (10,'management','Management/executive')
ON DUPLICATE KEY UPDATE name=VALUES(name);

ALTER TABLE `user`
  ADD COLUMN IF NOT EXISTS `role_id` TINYINT UNSIGNED NULL AFTER `role`,
  ADD COLUMN IF NOT EXISTS `password_hash` VARCHAR(255) NULL AFTER `password`,
  ADD COLUMN IF NOT EXISTS `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `role_id`,
  ADD COLUMN IF NOT EXISTS `last_login_at` DATETIME NULL AFTER `is_active`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `last_login_at`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- Backfill role_id from existing role (if numeric)
UPDATE `user` SET `role_id` = CAST(`role` AS UNSIGNED)
WHERE `role_id` IS NULL AND `role` REGEXP '^[0-9]+$';

-- Indexes for fast auth and lookups
ALTER TABLE `user`
  ADD INDEX IF NOT EXISTS `idx_user_role_id` (`role_id`),
  ADD INDEX IF NOT EXISTS `idx_user_is_active` (`is_active`);

-- 2) Core entities: class, section, subjects, student, teacher, admin
ALTER TABLE `class`
  ADD COLUMN IF NOT EXISTS `name` VARCHAR(50) NULL AFTER `cn`,
  ADD COLUMN IF NOT EXISTS `academic_year` SMALLINT NULL AFTER `year`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `academic_year`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`,
  ADD COLUMN IF NOT EXISTS `deleted_at` DATETIME NULL AFTER `updated_at`;

-- Unique within year if both present
CREATE INDEX IF NOT EXISTS `idx_class_year` ON `class` (`academic_year`);

ALTER TABLE `section`
  ADD COLUMN IF NOT EXISTS `class_id` BIGINT NULL AFTER `secid`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `sname`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`,
  ADD COLUMN IF NOT EXISTS `deleted_at` DATETIME NULL AFTER `updated_at`;

-- Pre-indexes for join patterns
CREATE INDEX IF NOT EXISTS `idx_section_class_id` ON `section` (`class_id`);
CREATE INDEX IF NOT EXISTS `idx_section_cid_legacy` ON `section` (`cid`);

-- subjects linked to class
ALTER TABLE `subjects`
  ADD COLUMN IF NOT EXISTS `class_id` BIGINT NULL AFTER `cid`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `class_id`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

CREATE INDEX IF NOT EXISTS `idx_subjects_class_id` ON `subjects` (`class_id`);
CREATE INDEX IF NOT EXISTS `idx_subjects_cid_legacy` ON `subjects` (`cid`);

-- admin/teacher normalization
ALTER TABLE `admin`
  ADD COLUMN IF NOT EXISTS `gender_enum` ENUM('male','female','other','unknown') NULL AFTER `gender`,
  ADD COLUMN IF NOT EXISTS `date_of_birth` DATE NULL AFTER `dob`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `Status`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

ALTER TABLE `teacher`
  ADD COLUMN IF NOT EXISTS `date_of_birth` DATE NULL AFTER `dob`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `Status`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`,
  ADD COLUMN IF NOT EXISTS `deleted_at` DATETIME NULL AFTER `updated_at`;

-- student normalization
ALTER TABLE `student`
  ADD COLUMN IF NOT EXISTS `class_id` BIGINT NULL AFTER `secid`,
  ADD COLUMN IF NOT EXISTS `section_id` INT NULL AFTER `class_id`,
  ADD COLUMN IF NOT EXISTS `dob_date` DATE NULL AFTER `dob`,
  ADD COLUMN IF NOT EXISTS `admitted_at` DATE NULL AFTER `admissiondate`,
  ADD COLUMN IF NOT EXISTS `row_version` INT NOT NULL DEFAULT 1 AFTER `Status`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `row_version`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`,
  ADD COLUMN IF NOT EXISTS `deleted_at` DATETIME NULL AFTER `updated_at`;

-- Common query indexes
CREATE INDEX IF NOT EXISTS `idx_student_roll` ON `student` (`roll`);
CREATE INDEX IF NOT EXISTS `idx_student_phone` ON `student` (`phone`);
CREATE INDEX IF NOT EXISTS `idx_student_class_section` ON `student` (`class_id`,`section_id`);

-- Best-effort backfill for numeric-compatible legacy fields
UPDATE `section` SET `class_id` = CAST(`cid` AS UNSIGNED)
WHERE `class_id` IS NULL AND `cid` REGEXP '^[0-9]+$';

UPDATE `subjects` SET `class_id` = CAST(`cid` AS UNSIGNED)
WHERE `class_id` IS NULL AND `cid` REGEXP '^[0-9]+$';

UPDATE `student` SET `class_id` = CAST(`cid` AS UNSIGNED)
WHERE `class_id` IS NULL AND `cid` REGEXP '^[0-9]+$';

UPDATE `student` SET `section_id` = CAST(`secid` AS UNSIGNED)
WHERE `section_id` IS NULL AND `secid` REGEXP '^[0-9]+$';

-- 3) Attendance tables: indexes and typed date columns
ALTER TABLE `attendence`
  ADD COLUMN IF NOT EXISTS `date_on` DATE NULL AFTER `date`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `date_on`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

CREATE INDEX IF NOT EXISTS `idx_attendence_cid_secid_date` ON `attendence` (`cid`,`secid`,`date`);

ALTER TABLE `addattendence`
  ADD COLUMN IF NOT EXISTS `present` TINYINT(1) NULL AFTER `attendence`;

-- 4) Exams and marks: fix data types and indexes
ALTER TABLE `examschedule`
  ADD COLUMN IF NOT EXISTS `exam_date` DATE NULL AFTER `time`,
  ADD COLUMN IF NOT EXISTS `start_time` TIME NULL AFTER `exam_date`,
  ADD COLUMN IF NOT EXISTS `end_time` TIME NULL AFTER `start_time`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `end_time`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

CREATE INDEX IF NOT EXISTS `idx_examschedule_keys` ON `examschedule` (`eid`,`subid`,`cid`);

ALTER TABLE `studentmarks`
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `gid`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

CREATE INDEX IF NOT EXISTS `idx_studentmarks_mid_roll` ON `studentmarks` (`mid`,`roll`);

-- 5) Fees and expenses: numeric money columns and indexes
ALTER TABLE `expense`
  ADD COLUMN IF NOT EXISTS `amount_decimal` DECIMAL(12,2) NULL AFTER `amount`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `purpose`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- Try to parse numeric amounts (keeps original text in `amount`)
UPDATE `expense` SET `amount_decimal` = NULLIF(REGEXP_REPLACE(`amount`,'[^0-9\.]',''),'') + 0
WHERE `amount_decimal` IS NULL;

ALTER TABLE `feetransactions`
  ADD COLUMN IF NOT EXISTS `amountpaid_decimal` DECIMAL(12,2) NULL AFTER `amountpaid`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `amountpaid_decimal`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

UPDATE `feetransactions` SET `amountpaid_decimal` = `amountpaid`
WHERE `amountpaid_decimal` IS NULL;

-- Helpful indexes for billing flows
CREATE INDEX IF NOT EXISTS `idx_feetrx_roll` ON `feetransactions` (`roll`);

ALTER TABLE `fees`
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `class`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

CREATE INDEX IF NOT EXISTS `idx_fees_uid_class` ON `fees` (`uid`,`class`);

-- 6) Content and messaging
ALTER TABLE `messages`
  ADD COLUMN IF NOT EXISTS `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `message`;

ALTER TABLE `notice`
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `Status`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- 7) Logistics and others
ALTER TABLE `timetable`
  ADD COLUMN IF NOT EXISTS `teacher_id` BIGINT NULL AFTER `tid`,
  ADD COLUMN IF NOT EXISTS `class_id` BIGINT NULL AFTER `cid`,
  ADD COLUMN IF NOT EXISTS `subject_id` BIGINT NULL AFTER `subid`,
  ADD COLUMN IF NOT EXISTS `section_id` INT NULL AFTER `secid`,
  ADD COLUMN IF NOT EXISTS `session_hour_id` BIGINT NULL AFTER `shid`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `session_hour_id`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

CREATE INDEX IF NOT EXISTS `idx_timetable_dims` ON `timetable` (`tid`,`cid`,`subid`,`secid`,`day`,`shid`);
CREATE INDEX IF NOT EXISTS `idx_timetable_new_fks` ON `timetable` (`teacher_id`,`class_id`,`subject_id`,`section_id`);

ALTER TABLE `sessionhours`
  ADD COLUMN IF NOT EXISTS `class_id` BIGINT NULL AFTER `cid`,
  ADD COLUMN IF NOT EXISTS `section_id` INT NULL AFTER `secid`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `etime`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

CREATE INDEX IF NOT EXISTS `idx_sessionhours_class_section` ON `sessionhours` (`class_id`,`section_id`);

ALTER TABLE `marks`
  ADD COLUMN IF NOT EXISTS `exam_id` INT NULL AFTER `eid`,
  ADD COLUMN IF NOT EXISTS `class_id` BIGINT NULL AFTER `cid`,
  ADD COLUMN IF NOT EXISTS `section_id` INT NULL AFTER `secid`,
  ADD COLUMN IF NOT EXISTS `subject_id` BIGINT NULL AFTER `subid`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `subject_id`,
  ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

CREATE INDEX IF NOT EXISTS `idx_marks_exam_class` ON `marks` (`exam_id`,`class_id`,`section_id`);

ALTER TABLE `ulogins`
  ADD INDEX IF NOT EXISTS `idx_ulogins_uid_time` (`uid`,`logintime`),
  ADD INDEX IF NOT EXISTS `idx_ulogins_time` (`logintime`);

ALTER TABLE `sessions`
  ADD INDEX IF NOT EXISTS `idx_sessions_expires` (`expires`);

-- 8) Optional: add safe FKs where non-null rows will already match (can be enabled now)
-- NOTE: Many tables contain legacy placeholder values (-1/0) or strings; avoid FKs there until cleaned.
ALTER TABLE `section`
  ADD CONSTRAINT `fk_section_class` FOREIGN KEY (`class_id`) REFERENCES `class`(`cid`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `subjects`
  ADD CONSTRAINT `fk_subjects_class` FOREIGN KEY (`class_id`) REFERENCES `class`(`cid`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `student`
  ADD CONSTRAINT `fk_student_class` FOREIGN KEY (`class_id`) REFERENCES `class`(`cid`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_student_section` FOREIGN KEY (`section_id`) REFERENCES `section`(`secid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 9) Sentinel value cleanup: Remove invalid placeholder data (-1, 0) from critical tables
-- This prepares for foreign key enforcement by ensuring only valid references exist

-- Clean up timetable sentinel values
DELETE FROM `timetable` WHERE `tid` = -1 OR `cid` = -1 OR `tid` = 0 OR `cid` = 0;

-- Clean up sessionhours sentinel values
DELETE FROM `sessionhours` WHERE `cid` = -1 OR `secid` = -1 OR `cid` = 0 OR `secid` = 0;

-- Clean up marks sentinel values
DELETE FROM `marks` WHERE `eid` = -1 OR `eid` = 0;

-- Backfill typed FK columns in timetable (only for valid positive integers)
UPDATE `timetable` SET `teacher_id` = `tid` WHERE `teacher_id` IS NULL AND `tid` > 0;
UPDATE `timetable` SET `class_id` = `cid` WHERE `class_id` IS NULL AND `cid` > 0;
UPDATE `timetable` SET `subject_id` = `subid` WHERE `subject_id` IS NULL AND `subid` > 0;
UPDATE `timetable` SET `section_id` = `secid` WHERE `section_id` IS NULL AND `secid` > 0;
UPDATE `timetable` SET `session_hour_id` = `shid` WHERE `session_hour_id` IS NULL AND `shid` > 0;

-- Backfill typed FK columns in sessionhours
UPDATE `sessionhours` SET `class_id` = `cid` WHERE `class_id` IS NULL AND `cid` > 0;
UPDATE `sessionhours` SET `section_id` = `secid` WHERE `section_id` IS NULL AND `secid` > 0;

-- Backfill typed FK columns in marks (where cid/secid/subid are numeric strings)
UPDATE `marks` SET `exam_id` = `eid` WHERE `exam_id` IS NULL AND `eid` > 0;
UPDATE `marks` SET `class_id` = CAST(`cid` AS UNSIGNED) 
WHERE `class_id` IS NULL AND `cid` REGEXP '^[0-9]+$' AND CAST(`cid` AS UNSIGNED) > 0;
UPDATE `marks` SET `section_id` = CAST(`secid` AS UNSIGNED) 
WHERE `section_id` IS NULL AND `secid` REGEXP '^[0-9]+$' AND CAST(`secid` AS UNSIGNED) > 0;
UPDATE `marks` SET `subject_id` = CAST(`subid` AS UNSIGNED) 
WHERE `subject_id` IS NULL AND `subid` REGEXP '^[0-9]+$' AND CAST(`subid` AS UNSIGNED) > 0;

-- 10) Add foreign key constraints for cleaned tables
-- These FKs use the new typed columns and will enforce referential integrity going forward

ALTER TABLE `timetable`
  ADD CONSTRAINT `fk_timetable_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teacher`(`tid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_timetable_class` FOREIGN KEY (`class_id`) REFERENCES `class`(`cid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_timetable_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`subid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_timetable_section` FOREIGN KEY (`section_id`) REFERENCES `section`(`secid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_timetable_sessionhour` FOREIGN KEY (`session_hour_id`) REFERENCES `sessionhours`(`shid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `sessionhours`
  ADD CONSTRAINT `fk_sessionhours_class` FOREIGN KEY (`class_id`) REFERENCES `class`(`cid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sessionhours_section` FOREIGN KEY (`section_id`) REFERENCES `section`(`secid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `marks`
  ADD CONSTRAINT `fk_marks_exam` FOREIGN KEY (`exam_id`) REFERENCES `exam`(`eid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_marks_class` FOREIGN KEY (`class_id`) REFERENCES `class`(`cid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_marks_section` FOREIGN KEY (`section_id`) REFERENCES `section`(`secid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_marks_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`subid`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `studentmarks`
  ADD CONSTRAINT `fk_studentmarks_marks` FOREIGN KEY (`mid`) REFERENCES `marks`(`mid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: fees table links to student via uid and class via class column
-- These will be added after confirming uid maps to student.uid consistently
-- ALTER TABLE `fees`
--   ADD CONSTRAINT `fk_fees_student` FOREIGN KEY (`uid`) REFERENCES `student`(`uid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 11) Housekeeping: standardize collations (non-destructive for text)
ALTER TABLE `user` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `student` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `teacher` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `admin` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
COMMIT;

-- Post-migration checklist (manual):
-- 1) Backfill `class_id`/`section_id` across tables where possible.
-- 2) Convert legacy date strings into DATE/DATETIME columns (dob_date, admitted_at, date_on, exam_date, etc.).
-- 3) Update application code to read/write new typed columns and `user.password_hash`.
-- 4) Verify all FK relationships are valid before enabling additional constraints on fees/feetransactions.
-- 5) Consider dropping deprecated varchar columns (tid, cid, secid, etc.) after full migration to typed FK columns.
-- 6) Monitor query performance and add additional indexes as needed based on slow query logs.

-- Additional cleanup recommendations:
-- 1) Review and remove any remaining sentinel values (0, -1) in other tables not covered here
-- 2) Add CHECK constraints to prevent future insertion of sentinel values
-- 3) Implement application-level validation to reject -1/0 before database insert
-- 4) Add NOT NULL constraints on FK columns once backfill is 100% complete
