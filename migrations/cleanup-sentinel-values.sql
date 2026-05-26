-- Sentinel Value Cleanup Script (2025-11-15)
-- This script identifies and optionally removes sentinel values (-1, 0, '0', '-1') across the database
-- Run this BEFORE enforcing strict foreign key constraints to prevent referential integrity violations
USE sms;

-- PART 1: DIAGNOSTIC QUERIES - Review these results before running cleanup

-- Check for sentinel values in timetable
SELECT 'timetable_sentinels' AS table_name, COUNT(*) AS count
FROM `timetable`
WHERE `tid` IN (-1, 0) OR `cid` IN (-1, 0) OR `subid` IN (-1, 0) 
   OR `secid` IN (-1, 0) OR `shid` IN (-1, 0);

-- Check for sentinel values in sessionhours
SELECT 'sessionhours_sentinels' AS table_name, COUNT(*) AS count
FROM `sessionhours`
WHERE `cid` IN (-1, 0) OR `secid` IN (-1, 0);

-- Check for sentinel values in marks (including string variants)
SELECT 'marks_sentinels' AS table_name, COUNT(*) AS count
FROM `marks`
WHERE `eid` IN (-1, 0) OR `cid` IN ('-1', '0') OR `secid` IN ('-1', '0') OR `subid` IN ('-1', '0');

-- Check for sentinel values in fees
SELECT 'fees_sentinels' AS table_name, COUNT(*) AS count
FROM `fees`
WHERE `uid` IN (-1, 0) OR `class` IN (-1, 0);

-- Check for sentinel values in examschedule
SELECT 'examschedule_sentinels' AS table_name, COUNT(*) AS count
FROM `examschedule`
WHERE `eid` IN (-1, 0) OR `subid` IN (-1, 0) OR `cid` IN (-1, 0);

-- Check for sentinel values in attendence
SELECT 'attendence_sentinels' AS table_name, COUNT(*) AS count
FROM `attendence`
WHERE `cid` IN (-1, 0) OR `secid` IN (-1, 0);

-- Check for orphaned records in student (no valid class or section)
SELECT 'student_orphans' AS table_name, COUNT(*) AS count
FROM `student`
WHERE (`cid` NOT IN (SELECT `cid` FROM `class`) OR `cid` IN ('-1', '0'))
   OR (`secid` NOT IN (SELECT `secid` FROM `section`) OR `secid` IN ('-1', '0'));

-- PART 2: CLEANUP OPERATIONS (Uncomment to execute)
-- WARNING: These operations will DELETE data. Review diagnostic results first!

START TRANSACTION;

-- Remove sentinel records from timetable
-- DELETE FROM `timetable` WHERE `tid` IN (-1, 0) OR `cid` IN (-1, 0);

-- Remove sentinel records from sessionhours
-- DELETE FROM `sessionhours` WHERE `cid` IN (-1, 0) OR `secid` IN (-1, 0);

-- Remove sentinel records from marks
-- DELETE FROM `marks` WHERE `eid` IN (-1, 0) OR `cid` IN ('-1', '0');

-- Remove sentinel records from fees (be very careful - financial data!)
-- DELETE FROM `fees` WHERE `uid` IN (-1, 0) OR `class` IN (-1, 0);

-- Remove sentinel records from examschedule
-- DELETE FROM `examschedule` WHERE `eid` IN (-1, 0) OR `subid` IN (-1, 0) OR `cid` IN (-1, 0);

-- Remove sentinel records from attendence
-- DELETE FROM `attendence` WHERE `cid` IN (-1, 0) OR `secid` IN (-1, 0);

-- ROLLBACK; -- Uncomment to review changes without committing
-- COMMIT;   -- Uncomment to apply changes

-- PART 3: NULL CONVERSION (Alternative to deletion)
-- For some tables, you may prefer to set sentinel values to NULL instead of deleting

START TRANSACTION;

-- Convert sentinel values to NULL in timetable (preserves rows)
-- UPDATE `timetable` SET `tid` = NULL WHERE `tid` IN (-1, 0);
-- UPDATE `timetable` SET `cid` = NULL WHERE `cid` IN (-1, 0);
-- UPDATE `timetable` SET `subid` = NULL WHERE `subid` IN (-1, 0);
-- UPDATE `timetable` SET `secid` = NULL WHERE `secid` IN (-1, 0);
-- UPDATE `timetable` SET `shid` = NULL WHERE `shid` IN (-1, 0);

-- NOTE: This requires columns to be nullable. Adjust table schema first if needed.

-- ROLLBACK; -- Uncomment to review changes without committing
-- COMMIT;   -- Uncomment to apply changes

-- PART 4: VALIDATION QUERIES - Run after cleanup

-- Verify no sentinel values remain in critical tables
SELECT 
  'timetable' AS table_name,
  COUNT(*) AS remaining_sentinels
FROM `timetable`
WHERE `tid` IN (-1, 0) OR `cid` IN (-1, 0) OR `subid` IN (-1, 0)
UNION ALL
SELECT 
  'marks' AS table_name,
  COUNT(*) AS remaining_sentinels
FROM `marks`
WHERE `eid` IN (-1, 0) OR `cid` IN ('-1', '0')
UNION ALL
SELECT 
  'sessionhours' AS table_name,
  COUNT(*) AS remaining_sentinels
FROM `sessionhours`
WHERE `cid` IN (-1, 0) OR `secid` IN (-1, 0);

-- Check FK readiness: Verify all references point to existing records
SELECT 
  'timetable->teacher' AS fk_check,
  COUNT(*) AS invalid_references
FROM `timetable` t
LEFT JOIN `teacher` te ON t.tid = te.uid
WHERE t.tid IS NOT NULL AND te.uid IS NULL
UNION ALL
SELECT 
  'timetable->class' AS fk_check,
  COUNT(*) AS invalid_references
FROM `timetable` t
LEFT JOIN `class` c ON t.cid = c.cid
WHERE t.cid IS NOT NULL AND c.cid IS NULL
UNION ALL
SELECT 
  'marks->exam' AS fk_check,
  COUNT(*) AS invalid_references
FROM `marks` m
LEFT JOIN `exam` e ON m.eid = e.eid
WHERE m.eid IS NOT NULL AND m.eid > 0 AND e.eid IS NULL;

-- PART 5: ADD CHECK CONSTRAINTS (MySQL 8.0.16+)
-- Prevent future insertion of sentinel values

-- ALTER TABLE `timetable` ADD CONSTRAINT `chk_timetable_no_sentinels` 
--   CHECK (`tid` IS NULL OR `tid` > 0);

-- ALTER TABLE `timetable` ADD CONSTRAINT `chk_timetable_cid_positive` 
--   CHECK (`cid` IS NULL OR `cid` > 0);

-- ALTER TABLE `marks` ADD CONSTRAINT `chk_marks_eid_positive` 
--   CHECK (`eid` IS NULL OR `eid` > 0);

-- ALTER TABLE `fees` ADD CONSTRAINT `chk_fees_uid_positive` 
--   CHECK (`uid` IS NULL OR `uid` > 0);
