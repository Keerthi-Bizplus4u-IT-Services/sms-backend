-- Additional Sentinel Cleanup & FK Enhancement (Phase 2)
-- Run this after 2025-11-15_schema_v2.sql has been successfully applied
-- This covers additional tables: attendence, examschedule, fees, feetransactions

START TRANSACTION;
SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_VALUE_ON_ZERO,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ============================================================================
-- ATTENDENCE TABLE
-- ============================================================================

-- Add typed FK columns
ALTER TABLE `attendence`
  ADD COLUMN IF NOT EXISTS `class_id` BIGINT NULL AFTER `cid`,
  ADD COLUMN IF NOT EXISTS `section_id` INT NULL AFTER `secid`;

-- Clean sentinel values
DELETE FROM `attendence` WHERE `cid` IN (-1, 0) OR `secid` IN (-1, 0);

-- Backfill FK columns
UPDATE `attendence` SET `class_id` = `cid` WHERE `class_id` IS NULL AND `cid` > 0;
UPDATE `attendence` SET `section_id` = `secid` WHERE `section_id` IS NULL AND `secid` > 0;

-- Add indexes
CREATE INDEX IF NOT EXISTS `idx_attendence_class_section_date` ON `attendence` (`class_id`, `section_id`, `date`);

-- Add FK constraints
ALTER TABLE `attendence`
  ADD CONSTRAINT `fk_attendence_class` FOREIGN KEY (`class_id`) REFERENCES `class`(`cid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_attendence_section` FOREIGN KEY (`section_id`) REFERENCES `section`(`secid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- EXAMSCHEDULE TABLE
-- ============================================================================

-- Add typed FK columns
ALTER TABLE `examschedule`
  ADD COLUMN IF NOT EXISTS `exam_id` INT NULL AFTER `eid`,
  ADD COLUMN IF NOT EXISTS `subject_id` BIGINT NULL AFTER `subid`,
  ADD COLUMN IF NOT EXISTS `class_id` BIGINT NULL AFTER `cid`;

-- Clean sentinel values
DELETE FROM `examschedule` WHERE `eid` IN (-1, 0) OR `subid` IN (-1, 0) OR `cid` IN (-1, 0);

-- Backfill FK columns
UPDATE `examschedule` SET `exam_id` = `eid` WHERE `exam_id` IS NULL AND `eid` > 0;
UPDATE `examschedule` SET `subject_id` = `subid` WHERE `subject_id` IS NULL AND `subid` > 0;
UPDATE `examschedule` SET `class_id` = `cid` WHERE `class_id` IS NULL AND `cid` > 0;

-- Add indexes
CREATE INDEX IF NOT EXISTS `idx_examschedule_exam_subject_class` ON `examschedule` (`exam_id`, `subject_id`, `class_id`);

-- Add FK constraints
ALTER TABLE `examschedule`
  ADD CONSTRAINT `fk_examschedule_exam` FOREIGN KEY (`exam_id`) REFERENCES `exam`(`eid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_examschedule_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`subid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_examschedule_class` FOREIGN KEY (`class_id`) REFERENCES `class`(`cid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- FEES TABLE
-- ============================================================================

-- Add typed FK columns
ALTER TABLE `fees`
  ADD COLUMN IF NOT EXISTS `student_id` BIGINT NULL AFTER `uid`,
  ADD COLUMN IF NOT EXISTS `class_id` BIGINT NULL AFTER `class`;

-- Clean sentinel values (CAREFUL: this is financial data!)
-- Review before uncommenting:
-- DELETE FROM `fees` WHERE `uid` IN (-1, 0) OR `class` IN (-1, 0);

-- Backfill student_id by matching uid to student.uid
UPDATE `fees` f
INNER JOIN `student` s ON f.uid = s.uid
SET f.student_id = s.uid
WHERE f.student_id IS NULL;

-- Backfill class_id
UPDATE `fees` SET `class_id` = `class` WHERE `class_id` IS NULL AND `class` > 0;

-- Add indexes
CREATE INDEX IF NOT EXISTS `idx_fees_student_class` ON `fees` (`student_id`, `class_id`);

-- Add FK constraints (commented - enable after verifying data integrity)
-- ALTER TABLE `fees`
--   ADD CONSTRAINT `fk_fees_student` FOREIGN KEY (`student_id`) REFERENCES `student`(`uid`) ON DELETE CASCADE ON UPDATE CASCADE,
--   ADD CONSTRAINT `fk_fees_class` FOREIGN KEY (`class_id`) REFERENCES `class`(`cid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- FEETRANSACTIONS TABLE
-- ============================================================================

-- Add typed FK column for student reference
ALTER TABLE `feetransactions`
  ADD COLUMN IF NOT EXISTS `student_id` BIGINT NULL AFTER `roll`;

-- Backfill student_id by matching roll to student.roll
UPDATE `feetransactions` ft
INNER JOIN `student` s ON ft.roll = s.roll
SET ft.student_id = s.uid
WHERE ft.student_id IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS `idx_feetransactions_student` ON `feetransactions` (`student_id`);
CREATE INDEX IF NOT EXISTS `idx_feetransactions_date` ON `feetransactions` (`transdate`);

-- Add FK constraint (commented - enable after verifying data integrity)
-- ALTER TABLE `feetransactions`
--   ADD CONSTRAINT `fk_feetransactions_student` FOREIGN KEY (`student_id`) REFERENCES `student`(`uid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- ADDATTENDENCE TABLE (student attendance records)
-- ============================================================================

-- Add typed FK column for student reference
ALTER TABLE `addattendence`
  ADD COLUMN IF NOT EXISTS `student_id` BIGINT NULL AFTER `roll`,
  ADD COLUMN IF NOT EXISTS `attendance_id` BIGINT NULL AFTER `aid`;

-- Backfill student_id by matching roll to student.roll
UPDATE `addattendence` aa
INNER JOIN `student` s ON aa.roll = s.roll
SET aa.student_id = s.uid
WHERE aa.student_id IS NULL;

-- Backfill attendance_id
UPDATE `addattendence` SET `attendance_id` = `aid` WHERE `attendance_id` IS NULL AND `aid` > 0;

-- Add indexes
CREATE INDEX IF NOT EXISTS `idx_addattendence_student_aid` ON `addattendence` (`student_id`, `attendance_id`);

-- Add FK constraints
ALTER TABLE `addattendence`
  ADD CONSTRAINT `fk_addattendence_student` FOREIGN KEY (`student_id`) REFERENCES `student`(`uid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_addattendence_attendance` FOREIGN KEY (`attendance_id`) REFERENCES `attendence`(`aid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- LIBRARY TABLE (book borrowing)
-- ============================================================================

-- Check if library table references student or teacher
ALTER TABLE `library`
  ADD COLUMN IF NOT EXISTS `student_id` BIGINT NULL AFTER `uid`,
  ADD COLUMN IF NOT EXISTS `borrower_type` ENUM('student', 'teacher', 'admin', 'other') NULL AFTER `student_id`;

-- Backfill student_id for student borrowers
UPDATE `library` l
INNER JOIN `student` s ON l.uid = s.uid
SET l.student_id = s.uid, l.borrower_type = 'student'
WHERE l.student_id IS NULL;

-- Backfill for teacher borrowers
UPDATE `library` l
INNER JOIN `teacher` t ON l.uid = t.tid
SET l.borrower_type = 'teacher'
WHERE l.borrower_type IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS `idx_library_student` ON `library` (`student_id`);
CREATE INDEX IF NOT EXISTS `idx_library_borrower_type` ON `library` (`borrower_type`);

-- Add FK constraint for students only
-- ALTER TABLE `library`
--   ADD CONSTRAINT `fk_library_student` FOREIGN KEY (`student_id`) REFERENCES `student`(`uid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- PARENT TABLE
-- ============================================================================

-- Add FK column for student reference
ALTER TABLE `parent`
  ADD COLUMN IF NOT EXISTS `student_id` BIGINT NULL AFTER `uid`;

-- Backfill student_id by matching uid
UPDATE `parent` p
INNER JOIN `student` s ON p.uid = s.uid
SET p.student_id = s.uid
WHERE p.student_id IS NULL;

-- Add index
CREATE INDEX IF NOT EXISTS `idx_parent_student` ON `parent` (`student_id`);

-- Add FK constraint (commented - verify data first)
-- ALTER TABLE `parent`
--   ADD CONSTRAINT `fk_parent_student` FOREIGN KEY (`student_id`) REFERENCES `student`(`uid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Check for remaining sentinel values
SELECT 'attendence' AS table_name, COUNT(*) AS sentinels FROM `attendence` WHERE `cid` IN (-1, 0) OR `secid` IN (-1, 0)
UNION ALL
SELECT 'examschedule', COUNT(*) FROM `examschedule` WHERE `eid` IN (-1, 0) OR `subid` IN (-1, 0) OR `cid` IN (-1, 0)
UNION ALL
SELECT 'fees', COUNT(*) FROM `fees` WHERE `uid` IN (-1, 0) OR `class` IN (-1, 0);

-- Check FK readiness
SELECT 'attendence->class' AS fk_check, COUNT(*) AS invalid_refs
FROM `attendence` a LEFT JOIN `class` c ON a.class_id = c.cid
WHERE a.class_id IS NOT NULL AND c.cid IS NULL
UNION ALL
SELECT 'examschedule->exam', COUNT(*) 
FROM `examschedule` es LEFT JOIN `exam` e ON es.exam_id = e.eid
WHERE es.exam_id IS NOT NULL AND e.eid IS NULL
UNION ALL
SELECT 'fees->student', COUNT(*)
FROM `fees` f LEFT JOIN `student` s ON f.student_id = s.uid
WHERE f.student_id IS NOT NULL AND s.uid IS NULL;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
COMMIT;

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================

-- Tables Enhanced:
-- 1. attendence       - Added class_id, section_id FKs (2 FKs)
-- 2. examschedule     - Added exam_id, subject_id, class_id FKs (3 FKs)
-- 3. fees             - Added student_id, class_id FKs (2 FKs - commented)
-- 4. feetransactions  - Added student_id FK (1 FK - commented)
-- 5. addattendence    - Added student_id, attendance_id FKs (2 FKs)
-- 6. library          - Added student_id FK, borrower_type (1 FK - commented)
-- 7. parent           - Added student_id FK (1 FK - commented)

-- Total: 12 new FK constraints (6 active, 6 commented pending validation)

-- Next Steps:
-- 1. Review validation query results
-- 2. Clean any remaining sentinel values
-- 3. Verify FK relationships are correct
-- 4. Uncomment and enable remaining FK constraints
-- 5. Update application code to use new typed columns
-- 6. Add CHECK constraints to prevent future sentinels
