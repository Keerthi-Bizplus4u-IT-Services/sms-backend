# Sentinel Value Cleanup & Foreign Key Enhancement

**Date**: November 15, 2025  
**Migration Files**: 
- `migrations/2025-11-15_schema_v2.sql` (updated)
- `migrations/cleanup-sentinel-values.sql` (new)

## Overview

This migration addresses the use of **sentinel values** (-1, 0, '0', '-1') across the database schema and adds proper foreign key constraints to ensure referential integrity.

### What are Sentinel Values?

Sentinel values are special placeholder values (typically -1 or 0) used to represent "no value" or "invalid" instead of using SQL NULL. This is an anti-pattern that:

1. **Breaks Foreign Key Constraints**: Cannot reference non-existent records with ID -1 or 0
2. **Causes Data Integrity Issues**: Invalid relationships appear valid in queries
3. **Complicates Business Logic**: Application code must filter out sentinel values
4. **Wastes Storage**: Stores meaningless data instead of using NULL

## Changes Made

### 1. Schema Enhancements (2025-11-15_schema_v2.sql)

#### A. Timetable Table
**New Columns Added:**
- `teacher_id` (BIGINT NULL) - Properly typed teacher reference
- `class_id` (BIGINT NULL) - Properly typed class reference  
- `subject_id` (BIGINT NULL) - Properly typed subject reference
- `section_id` (INT NULL) - Properly typed section reference
- `session_hour_id` (BIGINT NULL) - Properly typed session hour reference

**Sentinel Cleanup:**
```sql
DELETE FROM `timetable` WHERE `tid` = -1 OR `cid` = -1 OR `tid` = 0 OR `cid` = 0;
```

**Foreign Keys Added:**
- `fk_timetable_teacher` → `teacher(tid)`
- `fk_timetable_class` → `class(cid)`
- `fk_timetable_subject` → `subjects(subid)`
- `fk_timetable_section` → `section(secid)`
- `fk_timetable_sessionhour` → `sessionhours(shid)`

**Example Data Before:**
```sql
INSERT INTO `timetable` VALUES (20,-1,-1,2,1,'3',3),(21,-1,-1,0,0,'Wednesday',0);
```

**After Migration:**
- Invalid records with -1/0 are deleted
- Valid records have new typed FK columns backfilled
- Future inserts must reference valid teacher/class/subject/section

#### B. SessionHours Table
**New Columns Added:**
- `class_id` (BIGINT NULL)
- `section_id` (INT NULL)

**Sentinel Cleanup:**
```sql
DELETE FROM `sessionhours` WHERE `cid` = -1 OR `secid` = -1 OR `cid` = 0 OR `secid` = 0;
```

**Foreign Keys Added:**
- `fk_sessionhours_class` → `class(cid)`
- `fk_sessionhours_section` → `section(secid)`

#### C. Marks Table
**New Columns Added:**
- `exam_id` (INT NULL)
- `class_id` (BIGINT NULL)
- `section_id` (INT NULL)
- `subject_id` (BIGINT NULL)

**Sentinel Cleanup:**
```sql
DELETE FROM `marks` WHERE `eid` = -1 OR `eid` = 0;
```

**Foreign Keys Added:**
- `fk_marks_exam` → `exam(eid)`
- `fk_marks_class` → `class(cid)`
- `fk_marks_section` → `section(secid)`
- `fk_marks_subject` → `subjects(subid)`

**Note**: The marks table stores `cid`, `secid`, `subid` as VARCHAR, so conversion is needed.

#### D. StudentMarks Table
**Foreign Keys Added:**
- `fk_studentmarks_marks` → `marks(mid)`

This ensures marks records exist before student marks can reference them.

### 2. Diagnostic & Cleanup Script (cleanup-sentinel-values.sql)

This script provides:

#### Part 1: Diagnostic Queries
Identifies sentinel values across all tables:
- `timetable_sentinels`
- `sessionhours_sentinels`
- `marks_sentinels`
- `fees_sentinels`
- `examschedule_sentinels`
- `attendence_sentinels`
- `student_orphans`

**Usage:**
```bash
mysql -u root -p sms < migrations/cleanup-sentinel-values.sql > sentinel_report.txt
```

#### Part 2: Cleanup Operations (Commented)
DELETE statements for removing sentinel records. **Uncomment with caution!**

#### Part 3: NULL Conversion (Alternative)
UPDATE statements to convert sentinels to NULL instead of deleting rows.

#### Part 4: Validation Queries
Verify cleanup was successful and check FK readiness.

#### Part 5: CHECK Constraints
Prevent future insertion of sentinel values (MySQL 8.0.16+).

## Migration Strategy

### Step 1: Backup
```bash
mysqldump -u root -p sms > backup_before_sentinel_cleanup_$(date +%Y%m%d).sql
```

### Step 2: Run Diagnostics
```bash
mysql -u root -p sms < migrations/cleanup-sentinel-values.sql > sentinel_diagnostic.txt
```

Review the output to understand how many records will be affected.

### Step 3: Apply Schema Migration
```bash
mysql -u root -p sms < migrations/2025-11-15_schema_v2.sql
```

This will:
- Add new typed FK columns
- Create indexes
- Delete sentinel records
- Backfill valid FK values
- Add foreign key constraints

### Step 4: Validate
```sql
-- Check for remaining sentinels
SELECT * FROM `timetable` WHERE `tid` IN (-1, 0);
SELECT * FROM `marks` WHERE `eid` IN (-1, 0);

-- Check FK violations
SELECT t.* FROM `timetable` t
LEFT JOIN `teacher` te ON t.teacher_id = te.tid
WHERE t.teacher_id IS NOT NULL AND te.tid IS NULL;
```

### Step 5: Update Application Code
Change queries from:
```javascript
// OLD - uses legacy columns with sentinels
db.query('SELECT * FROM timetable WHERE tid = ? AND cid = ?', [teacherId, classId])
```

To:
```javascript
// NEW - uses typed FK columns
db.query('SELECT * FROM timetable WHERE teacher_id = ? AND class_id = ?', [teacherId, classId])
```

## Tables Affected

| Table | Sentinel Columns | New FK Columns | FKs Added |
|-------|-----------------|----------------|-----------|
| timetable | tid, cid, subid, secid, shid | teacher_id, class_id, subject_id, section_id, session_hour_id | 5 |
| sessionhours | cid, secid | class_id, section_id | 2 |
| marks | eid, cid, secid, subid | exam_id, class_id, section_id, subject_id | 4 |
| studentmarks | mid | (none) | 1 |
| section | cid | class_id | 1 |
| subjects | cid | class_id | 1 |
| student | cid, secid | class_id, section_id | 2 |

**Total**: 16 new foreign key constraints

## Benefits

### 1. Data Integrity
- **Before**: `timetable` could reference teacher_id = -1 (non-existent)
- **After**: Database enforces valid teacher references via FK

### 2. Cascading Operations
```sql
-- Deleting a class now automatically handles related records
DELETE FROM class WHERE cid = 5;
-- Cascades to: timetable, sessionhours, marks, student, etc.
```

### 3. Query Optimization
```sql
-- Old query with sentinel filtering
SELECT * FROM timetable 
WHERE tid > 0 AND cid > 0 AND tid != -1 AND cid != -1;

-- New query - cleaner and faster
SELECT * FROM timetable 
WHERE teacher_id IS NOT NULL AND class_id IS NOT NULL;
```

### 4. Developer Experience
- No need to remember to filter out -1/0 values
- Database prevents invalid data at insertion
- Clear error messages for FK violations

## Risks & Mitigation

### Risk 1: Data Loss from Sentinel Deletion
**Impact**: Records with sentinel values will be deleted  
**Mitigation**: 
- Run diagnostic queries first
- Review affected record count
- Consider NULL conversion instead of deletion
- Keep backup before migration

### Risk 2: Application Breakage
**Impact**: Code using old columns may fail  
**Mitigation**:
- Keep legacy columns during transition
- Update application code incrementally
- Test thoroughly in staging environment

### Risk 3: FK Constraint Violations
**Impact**: Migration may fail if orphaned records exist  
**Mitigation**:
- Cleanup script identifies orphans
- Delete or fix orphans before FK creation
- Use ON DELETE CASCADE for appropriate tables

## Rollback Plan

If issues occur:

```sql
-- Drop new foreign keys
ALTER TABLE `timetable` DROP FOREIGN KEY `fk_timetable_teacher`;
ALTER TABLE `timetable` DROP FOREIGN KEY `fk_timetable_class`;
-- ... (repeat for all FKs)

-- Restore from backup
mysql -u root -p sms < backup_before_sentinel_cleanup_20251115.sql
```

## Future Recommendations

1. **Add CHECK Constraints** (MySQL 8.0.16+)
   ```sql
   ALTER TABLE `timetable` ADD CONSTRAINT `chk_timetable_tid_positive` 
     CHECK (`teacher_id` IS NULL OR `teacher_id` > 0);
   ```

2. **Drop Legacy Columns** (after full migration)
   ```sql
   ALTER TABLE `timetable` DROP COLUMN `tid`, DROP COLUMN `cid`;
   ```

3. **Add NOT NULL Constraints** (where applicable)
   ```sql
   ALTER TABLE `timetable` MODIFY `class_id` BIGINT NOT NULL;
   ```

4. **Review Other Tables**
   Tables not yet covered that may have sentinels:
   - `fees` (uid, class)
   - `examschedule` (eid, subid, cid)
   - `attendence` (cid, secid)
   - `feetransactions` (roll reference)

## Performance Impact

- **Indexes Added**: 3 new composite indexes for faster FK lookups
- **Storage**: Minimal increase (new BIGINT/INT columns)
- **Query Performance**: Improved due to proper indexes on FK columns
- **Write Performance**: Slight overhead from FK validation (negligible)

## Testing Checklist

- [ ] Backup database
- [ ] Run diagnostic queries
- [ ] Test migration in staging environment
- [ ] Verify sentinel records deleted
- [ ] Check FK constraints working
- [ ] Test application CRUD operations
- [ ] Monitor error logs for FK violations
- [ ] Validate cascading deletes work correctly
- [ ] Check query performance
- [ ] Update API documentation

## Support & Questions

For issues or questions:
1. Check diagnostic output in `sentinel_diagnostic.txt`
2. Review MySQL error logs: `/var/log/mysql/error.log`
3. Verify FK constraints: `SHOW CREATE TABLE timetable;`
4. Contact database team with specific error messages

## References

- MySQL Foreign Keys: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- CHECK Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- Migration Best Practices: PROJECT_DOCUMENTATION.md
