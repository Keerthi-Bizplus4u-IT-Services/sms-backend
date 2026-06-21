# Database Optimization Execution Guide

## Overview
This guide provides step-by-step instructions for migrating the School Management System (SMS) database from the legacy schema to the optimized, normalized schema.

## Prerequisites

### 1. Database Backup
```bash
# Create full database backup
mysqldump -u admin -p sms > backup_sms_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
mysql -u admin -p -e "SELECT COUNT(*) FROM sms.user;"
```

### 2. System Requirements
- MySQL 5.7+ or MariaDB 10.2+
- Minimum 4GB RAM
- Sufficient disk space (3x current database size)
- Read/write permissions on database

### 3. Downtime Planning
- Estimated migration time: 2-4 hours (depends on data volume)
- Plan for maintenance window
- Notify all users in advance

## Migration Phases

### Phase 1: Schema Analysis (30 minutes)

#### 1.1 Review Current Schema
```sql
-- Check current table sizes
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Size (MB)",
  table_rows
FROM information_schema.TABLES
WHERE table_schema = 'sms'
ORDER BY (data_length + index_length) DESC;

-- Check for orphaned records
SELECT 'Orphaned Students' AS Issue, COUNT(*) AS Count
FROM student s
LEFT JOIN user u ON u.emailid = s.email
WHERE s.email IS NOT NULL AND s.email != '' AND u.uid IS NULL;

-- Check data quality issues
SELECT 'Invalid Dates' AS Issue, COUNT(*) AS Count
FROM student
WHERE dob NOT REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{2,4}$';
```

#### 1.2 Document Custom Modifications
- Review any custom columns added to tables
- Document any triggers, procedures, or views
- List all foreign applications/integrations

### Phase 2: Pre-Migration Cleanup (1 hour)

#### 2.1 Clean Sentinel Values
```sql
-- Remove invalid placeholder records
DELETE FROM student WHERE uid < 0 OR uid IS NULL;
DELETE FROM teacher WHERE uid < 0 OR uid IS NULL;
DELETE FROM parent WHERE uid < 0 OR uid IS NULL;
DELETE FROM class WHERE cid < 0 OR cid IS NULL;
DELETE FROM section WHERE secid < 0 OR secid IS NULL;
DELETE FROM marks WHERE eid = -1 OR eid = 0;
DELETE FROM timetable WHERE tid = -1 OR cid = -1;

-- Clean up empty/invalid records
UPDATE student SET email = NULL WHERE email = '' OR email LIKE '-%';
UPDATE teacher SET email = NULL WHERE email = '' OR email LIKE '-%';
UPDATE parent SET email = NULL WHERE email = '' OR email LIKE '-%';
```

#### 2.2 Validate Data Integrity
```sql
-- Ensure all students have valid class/section
UPDATE student s
SET cid = (SELECT MIN(cid) FROM class)
WHERE cid NOT IN (SELECT cid FROM class) OR cid IS NULL;

UPDATE student s
SET secid = (SELECT MIN(secid) FROM section WHERE cid = s.cid)
WHERE secid NOT IN (SELECT secid FROM section);

-- Fix invalid roll numbers
UPDATE student SET roll = CONCAT('STU', uid) WHERE roll IS NULL OR roll = '';
```

### Phase 3: Schema Migration (1 hour)

#### 3.1 Create New Tables
```bash
# Execute optimized schema creation
mysql -u admin -p sms < migrations/2025-11-15_optimized_schema_migration.sql

# Verify table creation
mysql -u admin -p -e "SHOW TABLES FROM sms LIKE 'users';"
mysql -u admin -p -e "SHOW TABLES FROM sms LIKE 'persons';"
```

#### 3.2 Verify Constraints
```sql
-- Check foreign key constraints
SELECT 
  TABLE_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'sms'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME;

-- Check indexes
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'sms'
  AND TABLE_NAME IN ('users', 'students', 'teachers', 'parents')
GROUP BY TABLE_NAME, INDEX_NAME;
```

### Phase 4: Data Migration (1-2 hours)

#### 4.1 Execute Data Migration
```bash
# Run data migration script
mysql -u admin -p sms < migrations/2025-11-15_data_migration.sql 2>&1 | tee migration_log.txt

# Check for errors
grep -i "error\|warning" migration_log.txt
```

#### 4.2 Validate Migrated Data
```sql
-- Compare record counts
SELECT 
  'Old Users' AS Table_Type, COUNT(*) AS Count FROM user
UNION ALL
SELECT 'New Users', COUNT(*) FROM users;

SELECT 
  'Old Students' AS Table_Type, COUNT(*) AS Count FROM student
UNION ALL
SELECT 'New Students', COUNT(*) FROM students;

SELECT 
  'Old Teachers' AS Table_Type, COUNT(*) AS Count FROM teacher
UNION ALL
SELECT 'New Teachers', COUNT(*) FROM teachers;

-- Verify data integrity
SELECT 
  s.id,
  s.roll_number,
  p.first_name,
  p.last_name,
  c.name AS class_name,
  sec.name AS section_name
FROM students s
JOIN persons p ON p.id = s.person_id
JOIN classes c ON c.id = s.class_id
JOIN sections sec ON sec.id = s.section_id
LIMIT 10;
```

#### 4.3 Verify Relationships
```sql
-- Check student-parent relationships
SELECT 
  s.roll_number,
  CONCAT(sp_person.first_name, ' ', sp_person.last_name) AS student_name,
  CONCAT(pp_person.first_name, ' ', pp_person.last_name) AS parent_name,
  spar.relationship_type
FROM student_parents spar
JOIN students s ON s.id = spar.student_id
JOIN persons sp_person ON sp_person.id = s.person_id
JOIN parents p ON p.id = spar.parent_id
JOIN persons pp_person ON pp_person.id = p.person_id
LIMIT 10;

-- Check teacher-subject assignments
SELECT 
  CONCAT(per.first_name, ' ', per.last_name) AS teacher_name,
  sub.name AS subject_name,
  ts.proficiency_level
FROM teacher_subjects ts
JOIN teachers t ON t.id = ts.teacher_id
JOIN persons per ON per.id = t.person_id
JOIN subjects sub ON sub.id = ts.subject_id
LIMIT 10;
```

### Phase 5: Application Updates (Variable Time)

#### 5.1 Update Configuration
```javascript
// Update config.js with connection pooling
var db_config = {
  host: 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  password: 'Bizplus4u123',
  database: 'sms',
  connectionLimit: 20, // Increased for better concurrency
  connectTimeout: 30000,
  acquireTimeout: 30000,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

// Use connection pool instead of single connection
const pool = mysql.createPool(db_config);

module.exports = pool;
```

#### 5.2 Update Query Examples

**Old Query:**
```javascript
// Old student query
connection.query('SELECT * FROM student WHERE uid = ?', [uid], callback);
```

**New Query:**
```javascript
// New normalized query
const query = `
  SELECT 
    s.id,
    s.roll_number,
    s.admission_number,
    s.admission_date,
    s.current_status,
    p.first_name,
    p.last_name,
    p.gender,
    p.date_of_birth,
    p.blood_group,
    p.phone,
    p.email,
    p.address_line1,
    c.name AS class_name,
    sec.name AS section_name
  FROM students s
  JOIN persons p ON p.id = s.person_id
  LEFT JOIN users u ON u.id = p.user_id
  JOIN classes c ON c.id = s.class_id
  JOIN sections sec ON sec.id = s.section_id
  WHERE s.id = ?
`;
pool.query(query, [studentId], callback);
```

**Old Authentication:**
```javascript
// Old authentication (INSECURE)
const query = 'SELECT * FROM user WHERE emailid = ? AND password = ?';
connection.query(query, [email, password], callback);
```

**New Authentication:**
```javascript
// New secure authentication with bcrypt
const bcrypt = require('bcrypt');

const query = 'SELECT id, email, password_hash, role_id, is_active FROM users WHERE email = ?';
pool.query(query, [email], (err, results) => {
  if (err || results.length === 0) {
    return callback(err || new Error('User not found'));
  }
  
  const user = results[0];
  
  // Verify password
  bcrypt.compare(password, user.password_hash, (err, match) => {
    if (err || !match) {
      return callback(err || new Error('Invalid password'));
    }
    
    // Update last login
    pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );
    
    callback(null, user);
  });
});
```

#### 5.3 Common Query Patterns

**Get Student with All Details:**
```sql
SELECT 
  s.id,
  s.roll_number,
  s.admission_number,
  p.first_name,
  p.last_name,
  p.date_of_birth,
  p.gender,
  p.phone,
  p.address_line1,
  c.name AS class_name,
  sec.name AS section_name,
  GROUP_CONCAT(
    CONCAT(pp.first_name, ' ', pp.last_name, ' (', sp.relationship_type, ')')
    SEPARATOR ', '
  ) AS parents
FROM students s
JOIN persons p ON p.id = s.person_id
JOIN classes c ON c.id = s.class_id
JOIN sections sec ON sec.id = s.section_id
LEFT JOIN student_parents sp ON sp.student_id = s.id
LEFT JOIN parents par ON par.id = sp.parent_id
LEFT JOIN persons pp ON pp.id = par.person_id
WHERE s.id = ?
GROUP BY s.id;
```

**Get Class Timetable:**
```sql
SELECT 
  tt.day_of_week,
  sh.period_number,
  sh.start_time,
  sh.end_time,
  sub.name AS subject_name,
  CONCAT(p.first_name, ' ', p.last_name) AS teacher_name,
  tt.room_number
FROM timetable_entries tt
JOIN session_hours sh ON sh.id = tt.session_hour_id
JOIN subjects sub ON sub.id = tt.subject_id
JOIN teachers t ON t.id = tt.teacher_id
JOIN persons p ON p.id = t.person_id
WHERE tt.class_id = ?
  AND tt.section_id = ?
  AND (tt.effective_to IS NULL OR tt.effective_to >= CURDATE())
ORDER BY 
  FIELD(tt.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
  sh.period_number;
```

**Get Fee Status:**
```sql
SELECT 
  s.roll_number,
  CONCAT(p.first_name, ' ', p.last_name) AS student_name,
  fs.fee_type,
  sf.total_amount,
  sf.discount_amount,
  sf.paid_amount,
  sf.balance_amount,
  sf.status,
  sf.due_date
FROM student_fees sf
JOIN students s ON s.id = sf.student_id
JOIN persons p ON p.id = s.person_id
JOIN fee_structures fs ON fs.id = sf.fee_structure_id
WHERE sf.student_id = ?
ORDER BY fs.fee_type;
```

### Phase 6: Testing (1-2 hours)

#### 6.1 Functional Testing
- [ ] User authentication works
- [ ] Student registration works
- [ ] Attendance marking works
- [ ] Fee payment processing works
- [ ] Exam marks entry works
- [ ] Report generation works
- [ ] All CRUD operations work

#### 6.2 Performance Testing
```sql
-- Test query performance
EXPLAIN SELECT 
  s.id, s.roll_number, p.first_name, p.last_name
FROM students s
JOIN persons p ON p.id = s.person_id
WHERE s.class_id = 1;

-- Check index usage
SHOW INDEX FROM students;
SHOW INDEX FROM users;
SHOW INDEX FROM attendance_records;

-- Monitor slow queries
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
```

#### 6.3 Load Testing
```bash
# Use Apache Bench for simple load testing
ab -n 1000 -c 100 http://your-app-url/api/students

# Monitor database connections
mysql -u admin -p -e "SHOW PROCESSLIST;"
mysql -u admin -p -e "SHOW STATUS LIKE 'Threads_connected';"
```

### Phase 7: Cutover (30 minutes)

#### 7.1 Final Data Sync
```sql
-- If dual-write was implemented, sync any last changes
-- Otherwise, ensure no new data during migration window
```

#### 7.2 Switch to New Schema
```bash
# Update application configuration
# Deploy updated application code
# Monitor error logs closely
tail -f /var/log/application.log
```

#### 7.3 Monitor System
```sql
-- Monitor active connections
SHOW PROCESSLIST;

-- Check for errors
SELECT * FROM mysql.general_log WHERE command_type = 'Query' AND argument LIKE '%error%';

-- Monitor performance
SHOW STATUS LIKE 'Slow_queries';
SHOW STATUS LIKE 'Questions';
```

### Phase 8: Post-Migration Cleanup (Optional)

#### 8.1 Archive Old Tables
```sql
-- Rename old tables with _old suffix
RENAME TABLE user TO user_old;
RENAME TABLE student TO student_old;
RENAME TABLE teacher TO teacher_old;
RENAME TABLE parent TO parent_old;
-- ... etc

-- After verification period (30-60 days), drop old tables
-- DROP TABLE user_old;
```

#### 8.2 Optimize New Tables
```sql
-- Analyze tables for query optimization
ANALYZE TABLE users;
ANALYZE TABLE students;
ANALYZE TABLE teachers;
ANALYZE TABLE attendance_records;

-- Optimize tables
OPTIMIZE TABLE users;
OPTIMIZE TABLE students;
OPTIMIZE TABLE teachers;
```

## Rollback Plan

### If Migration Fails

#### Option 1: Quick Rollback (If during migration)
```bash
# Stop migration immediately
# Restore from backup
mysql -u admin -p sms < backup_sms_YYYYMMDD_HHMMSS.sql

# Verify restoration
mysql -u admin -p -e "SELECT COUNT(*) FROM sms.user;"
```

#### Option 2: Rollback After Application Update
```bash
# Revert application code to previous version
git checkout previous-release-tag

# Restore database if needed
mysql -u admin -p sms < backup_sms_YYYYMMDD_HHMMSS.sql

# Restart application
systemctl restart sms-app
```

## Performance Tuning

### MySQL Configuration
```ini
# Add to my.cnf or my.ini

[mysqld]
# InnoDB Buffer Pool (set to 70% of RAM)
innodb_buffer_pool_size = 4G

# Connection settings
max_connections = 500
thread_cache_size = 100

# Query cache (MySQL 5.7 and earlier)
query_cache_type = 1
query_cache_size = 256M

# InnoDB settings
innodb_log_file_size = 512M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# Monitoring
slow_query_log = 1
long_query_time = 2
```

### Indexing Strategy
```sql
-- Add additional indexes based on query patterns
-- Example: If frequently searching by parent phone
CREATE INDEX idx_persons_phone ON persons(phone);

-- Composite index for common join patterns
CREATE INDEX idx_students_class_status ON students(class_id, current_status);

-- Covering index for frequent reports
CREATE INDEX idx_attendance_date_status ON attendance_records(session_id, status, created_at);
```

## Monitoring & Alerts

### Key Metrics to Monitor
1. **Database Connections**: Should stay below 80% of max_connections
2. **Query Response Time**: Average should be < 100ms
3. **Slow Queries**: Should be < 1% of total queries
4. **Table Growth**: Monitor disk space
5. **Replication Lag**: If using replication

### Monitoring Queries
```sql
-- Connection usage
SELECT 
  (SELECT COUNT(*) FROM information_schema.processlist) AS current_connections,
  @@max_connections AS max_connections,
  ROUND((SELECT COUNT(*) FROM information_schema.processlist) / @@max_connections * 100, 2) AS usage_percentage;

-- Table sizes
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES
WHERE table_schema = 'sms'
ORDER BY (data_length + index_length) DESC;

-- Slow queries
SELECT 
  query_time,
  lock_time,
  rows_examined,
  sql_text
FROM mysql.slow_log
ORDER BY query_time DESC
LIMIT 10;
```

## Support & Troubleshooting

### Common Issues

**Issue 1: Foreign Key Constraint Errors**
```sql
-- Temporarily disable FK checks for cleanup
SET FOREIGN_KEY_CHECKS=0;
-- Fix orphaned records
DELETE FROM student_fees WHERE student_id NOT IN (SELECT id FROM students);
SET FOREIGN_KEY_CHECKS=1;
```

**Issue 2: Duplicate Entry Errors**
```sql
-- Find duplicates
SELECT email, COUNT(*) 
FROM users 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Remove duplicates (keep the latest)
DELETE u1 FROM users u1
INNER JOIN users u2 
WHERE u1.id < u2.id 
  AND u1.email = u2.email;
```

**Issue 3: Performance Degradation**
```sql
-- Rebuild indexes
ALTER TABLE students DROP INDEX idx_roll_number, ADD INDEX idx_roll_number(roll_number);

-- Update table statistics
ANALYZE TABLE students;
```

## Success Criteria

- [ ] All data migrated successfully
- [ ] No data loss (record counts match)
- [ ] All application features working
- [ ] Query performance improved or maintained
- [ ] No critical errors in logs
- [ ] Users can login and access their data
- [ ] Reports generate correctly
- [ ] Backup and rollback plan tested

## Contact Information

For support during migration:
- Database Admin: [Contact Info]
- Application Team: [Contact Info]
- Project Manager: [Contact Info]

---

**Last Updated**: 2025-11-15  
**Document Version**: 1.0  
**Author**: Database Optimization Team
