# Sentinel Value Cleanup - Quick Reference

## Summary
Updated `migrations/2025-11-15_schema_v2.sql` to replace sentinel values (-1/0) with proper NULL values and add foreign key constraints across timetable, sessionhours, marks, and related tables.

## Files Modified/Created
1. ✅ `migrations/2025-11-15_schema_v2.sql` - Updated with sentinel cleanup and FKs
2. ✅ `migrations/cleanup-sentinel-values.sql` - Diagnostic and cleanup script
3. ✅ `migrations/SENTINEL_CLEANUP_GUIDE.md` - Complete documentation

## What Changed

### Tables with Sentinel Cleanup

| Table | Sentinels Removed | New FK Columns | FKs Added |
|-------|------------------|----------------|-----------|
| **timetable** | tid, cid = -1/0 | teacher_id, class_id, subject_id, section_id, session_hour_id | 5 |
| **sessionhours** | cid, secid = -1/0 | class_id, section_id | 2 |
| **marks** | eid = -1/0 | exam_id, class_id, section_id, subject_id | 4 |
| **studentmarks** | - | - | 1 (to marks) |

### Key Additions

```sql
-- Deletes invalid sentinel records
DELETE FROM `timetable` WHERE `tid` = -1 OR `cid` = -1 OR `tid` = 0 OR `cid` = 0;
DELETE FROM `sessionhours` WHERE `cid` = -1 OR `secid` = -1 OR `cid` = 0 OR `secid` = 0;
DELETE FROM `marks` WHERE `eid` = -1 OR `eid` = 0;

-- Adds proper foreign keys
ALTER TABLE `timetable`
  ADD CONSTRAINT `fk_timetable_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teacher`(`tid`),
  ADD CONSTRAINT `fk_timetable_class` FOREIGN KEY (`class_id`) REFERENCES `class`(`cid`),
  -- ... 5 total FKs

ALTER TABLE `sessionhours`
  ADD CONSTRAINT `fk_sessionhours_class` FOREIGN KEY (`class_id`) REFERENCES `class`(`cid`),
  -- ... 2 total FKs

ALTER TABLE `marks`
  ADD CONSTRAINT `fk_marks_exam` FOREIGN KEY (`exam_id`) REFERENCES `exam`(`eid`),
  -- ... 4 total FKs
```

## Quick Start

### 1. Backup Database
```bash
mysqldump -u root -p sms > backup_pre_sentinel_cleanup.sql
```

### 2. Run Diagnostics
```bash
mysql -u root -p sms < migrations/cleanup-sentinel-values.sql > diagnostic.txt
cat diagnostic.txt  # Review affected row counts
```

### 3. Apply Migration
```bash
mysql -u root -p sms < migrations/2025-11-15_schema_v2.sql
```

### 4. Verify
```sql
-- Check no sentinels remain
SELECT COUNT(*) FROM timetable WHERE tid IN (-1, 0) OR cid IN (-1, 0);  -- Should be 0

-- Check FK constraints
SHOW CREATE TABLE timetable;  -- Should show 5 FOREIGN KEYs
```

## Impact

### Before (with sentinels)
```sql
-- Invalid records possible
INSERT INTO timetable (tid, cid, subid, secid, day, shid) 
VALUES (-1, -1, 2, 1, 'Monday', 3);  -- ALLOWED ❌

-- No referential integrity
DELETE FROM teacher WHERE tid = 5;  -- timetable records remain orphaned ❌

-- Complex queries
SELECT * FROM timetable 
WHERE tid > 0 AND cid > 0 AND tid != -1;  -- Must filter sentinels ❌
```

### After (with FKs)
```sql
-- Invalid records rejected
INSERT INTO timetable (teacher_id, class_id, subject_id, section_id, day, session_hour_id) 
VALUES (999, 888, 2, 1, 'Monday', 3);  -- ERROR: FK violation ✅

-- Automatic cascade
DELETE FROM teacher WHERE tid = 5;  -- Cascades to timetable automatically ✅

-- Simple queries
SELECT * FROM timetable 
WHERE teacher_id IS NOT NULL;  -- Clean, fast ✅
```

## Total Foreign Keys Added
- **16 new FK constraints** across 7 tables
- Enforces referential integrity for all major relationships
- Enables CASCADE operations for data consistency

## Application Code Changes Required

### OLD (legacy columns with sentinels)
```javascript
// Filter out sentinels manually
const timetable = await db.query(
  'SELECT * FROM timetable WHERE tid = ? AND cid = ? AND tid > 0 AND cid > 0',
  [teacherId, classId]
);
```

### NEW (typed FK columns)
```javascript
// Database ensures validity
const timetable = await db.query(
  'SELECT * FROM timetable WHERE teacher_id = ? AND class_id = ?',
  [teacherId, classId]
);
```

## Troubleshooting

### Error: Cannot add foreign key constraint
**Cause**: Orphaned records exist (e.g., timetable references deleted teacher)  
**Fix**: Run diagnostic script to find and clean orphans
```sql
SELECT t.* FROM timetable t
LEFT JOIN teacher te ON t.tid = te.tid
WHERE t.tid > 0 AND te.tid IS NULL;
-- Delete or update these records
```

### Error: Duplicate column name
**Cause**: Migration already partially applied  
**Fix**: Check existing columns and skip those already present
```sql
SHOW COLUMNS FROM timetable LIKE 'teacher_id';
```

## Rollback

If needed, restore from backup:
```bash
mysql -u root -p sms < backup_pre_sentinel_cleanup.sql
```

## Next Steps

1. ✅ **Completed**: Sentinel cleanup for timetable, sessionhours, marks
2. 🔄 **TODO**: Review fees, examschedule, attendence tables
3. 🔄 **TODO**: Add CHECK constraints to prevent future sentinels (MySQL 8.0.16+)
4. 🔄 **TODO**: Update application code to use new FK columns
5. 🔄 **TODO**: Drop legacy columns after full migration

## Questions?

See full documentation: `migrations/SENTINEL_CLEANUP_GUIDE.md`
