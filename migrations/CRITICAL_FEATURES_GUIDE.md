# Critical Features Migration Guide

## Overview

This migration adds **19 essential tables** across **6 critical categories** to complete the school management system's core functionality.

**Migration File:** `migrations/2025-11-15_critical_features_migration.sql`  
**Executor Script:** `scripts/run-critical-features-migration.js`  
**Date:** November 15, 2025

---

## 📋 Features Added

### 1. Library Management System (3 Tables)

#### `library_books`
Complete book inventory management with ISBN tracking, multiple copies, shelf locations, and condition status.

**Key Features:**
- ISBN tracking with uniqueness constraint
- Multi-copy management (total vs available)
- Shelf location and categorization
- Reference-only book flagging
- Soft delete support
- Book condition tracking (new, good, fair, damaged, lost)

**Business Rules:**
- Available copies cannot exceed total copies (CHECK constraint)
- Reference books cannot be issued (is_reference_only flag)

#### `library_transactions`
Track all book issue/return operations with fine calculation.

**Key Features:**
- Student/Teacher/Staff borrower tracking
- Due date management
- Fine calculation and payment tracking
- Renewal support (max 2 renewals)
- Status tracking (issued, returned, overdue, lost, damaged)
- Audit trail with issued_by and returned_to

**Business Rules:**
- Return date must be >= issue date
- Renewals limited by max_renewals
- Overdue books automatically flagged
- Fines linked to fine_rules

#### `library_fine_rules`
Configurable fine calculation rules per user type and academic year.

**Key Features:**
- User-type specific rules (student/teacher/staff)
- Grace period support
- Maximum fine cap
- Date-range based rules
- Academic year wise configuration

---

### 2. Assignment & Homework Management (2 Tables)

#### `assignments`
Complete assignment lifecycle management for teachers.

**Key Features:**
- Multiple assignment types (homework, project, practical, worksheet, online_quiz, presentation)
- Grade weightage configuration
- Late submission policies
- Attachment support
- Class/section/subject mapping

**Business Rules:**
- Due date must be >= assigned date
- Weightage percentage for final grade calculation
- Late submission penalty configuration

#### `assignment_submissions`
Student submission tracking with grading support.

**Key Features:**
- Multiple submission formats (URL, text, file)
- Late submission flagging
- Marks and grade tracking
- Teacher feedback
- Version control for resubmissions
- Status workflow (pending → submitted → graded → resubmit_required)

**Business Rules:**
- Unique constraint on (assignment_id, student_id, version)
- Automatic late submission detection
- Grading audit trail (graded_by, graded_at)

---

### 3. Timetable Management (3 Tables)

#### `timetable_periods`
Define period slots with timing and breaks.

**Key Features:**
- Period number and name
- Start/end time configuration
- Duration calculation
- Break identification (short_break, lunch_break, assembly)
- Academic year wise periods

**Business Rules:**
- End time must be > start time
- Unique period numbers per academic year

#### `class_timetable`
Day-wise class schedule mapping.

**Key Features:**
- Day-of-week scheduling (monday-sunday)
- Teacher-subject-period mapping
- Room allocation
- Practical session flagging
- Effective date ranges

**Business Rules:**
- Unique constraint: (class, section, day, period, is_active)
- Teacher availability check via index
- Subject-teacher validation

#### `timetable_substitutions`
Track teacher substitutions for absence management.

**Key Features:**
- Substitution date tracking
- Reason documentation
- Approval workflow
- Status tracking (pending → approved → completed → cancelled)

**Business Rules:**
- Original and substitute teachers must be different
- Approval audit trail

---

### 4. Fee Management Enhancement (3 Tables)

#### `fee_installments`
Break annual fees into installment payments.

**Key Features:**
- Multiple installments per fee
- Individual due dates
- Partial payment support
- Late fee calculation
- Payment tracking
- Reminder management

**Business Rules:**
- Unique (student_fee_id, installment_number)
- Status: pending → partial → paid/overdue/waived

#### `fee_concessions`
Scholarship and discount management.

**Key Features:**
- Multiple concession types (merit, sports, sibling, staff_ward, economically_backward, need_based, government_scheme)
- Percentage or fixed amount concessions
- Certificate/document tracking
- Approval workflow
- Validity period
- Status management (active, expired, cancelled, revoked)

**Business Rules:**
- Requires approval with audit trail
- Certificate reference for documentation
- Revocation reason tracking

#### `fee_reminders`
Automated payment reminder tracking.

**Key Features:**
- Multi-channel support (SMS, email, notification, call, letter)
- Delivery status tracking
- Cost tracking per reminder
- Message content logging
- Error tracking for failed deliveries

**Business Rules:**
- Links to fee/installment
- Audit trail with sent_by

---

### 5. Security & Audit System (4 Tables)

#### `audit_logs`
Comprehensive system activity logging.

**Key Features:**
- Action types (create, update, delete, login, logout, export, import, view, download, print)
- Before/after JSON storage
- IP address and user agent tracking
- Session correlation
- Table and record tracking

**Business Rules:**
- All critical operations logged
- JSON format for old/new values
- Retention for compliance

#### `user_sessions`
Active session management with device tracking.

**Key Features:**
- Unique session tokens
- Device type detection (desktop, mobile, tablet)
- Browser identification
- Activity tracking
- Auto-logout support
- Session lifecycle management

**Business Rules:**
- One token per active session
- Auto-logout after inactivity
- Logout tracking

#### `permissions`
Granular permission definitions for RBAC.

**Key Features:**
- Permission naming (name + slug)
- Category organization
- Resource type mapping
- System permission protection
- Description for clarity

**Business Rules:**
- Unique permission slugs
- System permissions cannot be deleted

#### `role_permissions`
Map permissions to roles with CRUD controls.

**Key Features:**
- Fine-grained access (create, read, update, delete, export)
- Role-based assignment
- Audit trail

**Business Rules:**
- Unique (role_id, permission_id)
- Cascading delete on role removal

---

### 6. Transport Management (4 Tables)

#### `transport_routes`
Route master with distance and fee configuration.

**Key Features:**
- Route code and name
- Distance and duration tracking
- Start/end point definition
- Monthly fee structure
- Soft delete support

#### `transport_vehicles`
Vehicle fleet management with maintenance tracking.

**Key Features:**
- Vehicle registration and details
- Capacity management
- Document expiry tracking (insurance, fitness, pollution, road tax)
- Service scheduling
- Odometer reading
- Driver/conductor assignment
- Status management (active, maintenance, inactive, retired)

**Business Rules:**
- Unique vehicle numbers
- Expiry date alerts
- Service reminders

#### `transport_stops`
Route-wise stop management with GPS coordinates.

**Key Features:**
- Stop ordering on route
- Pickup/drop timings
- GPS coordinates (latitude/longitude)
- Landmark identification
- Distance from school
- Stop-specific fee overrides

**Business Rules:**
- Unique (route_id, stop_order)
- Time progression validation

#### `student_transport`
Student transport allocation and tracking.

**Key Features:**
- Route and stop assignment
- Vehicle allocation
- Academic year wise tracking
- Shift management (morning, evening, both)
- Fee tracking
- Date range validity
- Status management (active, inactive, suspended, cancelled)

**Business Rules:**
- Links to active routes/stops/vehicles
- Date range validation
- Academic year correlation

---

## 📊 Database Views Created

### `v_library_books_issued`
Real-time view of all issued books with borrower details and overdue calculations.

**Columns:**
- Book details (ISBN, title, authors)
- Borrower information (type, name)
- Issue/due dates
- Days overdue
- Fine amount
- Status

### `v_pending_assignments`
Teacher dashboard view showing pending assignments with submission stats.

**Columns:**
- Assignment details
- Class/section/subject
- Teacher name
- Due dates and days remaining
- Submission counts vs total students

### `v_student_transport_details`
Complete student transport information including routes, stops, and vehicles.

**Columns:**
- Student details (name, class, roll number)
- Route information
- Stop details with timings
- Vehicle assignment
- Transport fee
- Status

---

## 🔐 Permissions Added

| Permission | Slug | Category | Description |
|------------|------|----------|-------------|
| Manage Students | manage_students | Academic | Full student management access |
| View Students | view_students | Academic | View student information |
| Manage Teachers | manage_teachers | Staff | Full teacher management access |
| Manage Fees | manage_fees | Finance | Full fee management access |
| View Fees | view_fees | Finance | View fee information |
| Manage Library | manage_library | Library | Full library management access |
| Issue Books | issue_books | Library | Issue and return books |
| Manage Transport | manage_transport | Transport | Full transport management access |
| Manage Assignments | manage_assignments | Academic | Create and manage assignments |
| Submit Assignments | submit_assignments | Academic | Submit assignments |
| Manage Timetable | manage_timetable | Academic | Create and manage timetables |
| View Timetable | view_timetable | Academic | View timetables |
| View Audit Logs | view_audit_logs | Security | View system audit logs |
| Manage Concessions | manage_concessions | Finance | Approve fee concessions |

---

## 🚀 How to Execute Migration

### Prerequisites
- Node.js installed
- mysql2 package available
- Database credentials configured
- Backup of current database

### Execution Steps

```powershell
# Navigate to project directory
cd D:\Bizplus4u_Projects\sms

# Run the migration script
node scripts/run-critical-features-migration.js
```

### Expected Output
```
================================================================================
CRITICAL FEATURES MIGRATION - EXECUTION STARTED
================================================================================

📖 Reading migration file...
   ✓ File read: migrations/2025-11-15_critical_features_migration.sql
   ✓ File size: XX.XX KB

🔌 Connecting to database...
   ✓ Connected successfully

📝 Parsing SQL statements...
   ✓ Found XXX SQL statements

⚙️  Setting up transaction...
   ✓ Transaction started

🚀 Executing migration statements...
   [1/XXX] Executing: library_books... ✓ Table created
   [2/XXX] Executing: library_transactions... ✓ Table created
   ...

💾 Committing transaction...
   ✓ Transaction committed

🔍 Verifying migration...

📊 Created Tables:
   Table Name                      | Rows  | Size (KB)
   ------------------------------------------------------------
   assignments                     |     0 |     0.02
   assignment_submissions          |     0 |     0.02
   ...

📈 Tables by Category:
   ✓ Library Management         : 3/3 tables
   ✓ Assignment Management      : 2/2 tables
   ✓ Timetable Management       : 3/3 tables
   ✓ Fee Management             : 3/3 tables
   ✓ Security & Audit           : 4/4 tables
   ✓ Transport Management       : 5/5 tables

📋 Views Created: 3
   ✓ v_library_books_issued
   ✓ v_pending_assignments
   ✓ v_student_transport_details

================================================================================
MIGRATION SUMMARY
================================================================================
✓ Successful operations: XXX
⚠️  Skipped operations: X
❌ Failed operations: 0
📊 Tables created: 19
📋 Views created: 3

================================================================================
✅ CRITICAL FEATURES MIGRATION COMPLETED SUCCESSFULLY!
================================================================================
```

---

## 📝 Post-Migration Tasks

### Immediate Actions

1. **Verify Table Creation**
   ```sql
   -- Check all tables created
   SELECT TABLE_NAME, TABLE_ROWS 
   FROM INFORMATION_SCHEMA.TABLES 
   WHERE TABLE_SCHEMA = 'sms'
   AND TABLE_NAME IN (
     'library_books', 'library_transactions', 'library_fine_rules',
     'assignments', 'assignment_submissions',
     'timetable_periods', 'class_timetable', 'timetable_substitutions',
     'fee_installments', 'fee_concessions', 'fee_reminders',
     'audit_logs', 'user_sessions', 'permissions', 'role_permissions',
     'transport_routes', 'transport_vehicles', 'transport_stops', 'student_transport'
   );
   ```

2. **Test Views**
   ```sql
   SELECT * FROM v_library_books_issued;
   SELECT * FROM v_pending_assignments;
   SELECT * FROM v_student_transport_details;
   ```

3. **Verify Permissions**
   ```sql
   SELECT r.name AS role, p.permission_name, 
          rp.can_create, rp.can_read, rp.can_update, rp.can_delete
   FROM role_permissions rp
   JOIN roles r ON r.id = rp.role_id
   JOIN permissions p ON p.id = rp.permission_id
   ORDER BY r.name, p.permission_name;
   ```

### Application Integration

1. **Create API Endpoints**
   - Library: `/api/library/books`, `/api/library/transactions`, `/api/library/fines`
   - Assignments: `/api/assignments`, `/api/assignments/submit`
   - Timetable: `/api/timetable`, `/api/timetable/substitutions`
   - Fees: `/api/fees/installments`, `/api/fees/concessions`, `/api/fees/reminders`
   - Transport: `/api/transport/routes`, `/api/transport/vehicles`, `/api/transport/students`

2. **Update Controllers**
   - Create controllers in `/controllers` for each new feature
   - Implement CRUD operations
   - Add validation middleware
   - Implement permission checks

3. **Frontend Updates**
   - Add library management pages
   - Create assignment submission interface
   - Build timetable view
   - Enhance fee management UI
   - Add transport tracking dashboard

4. **Implement Audit Logging**
   ```javascript
   // Example audit log function
   async function logAudit(userId, action, tableName, recordId, oldValues, newValues, req) {
     await db.query(
       `INSERT INTO audit_logs (user_id, action_type, table_name, record_id, 
                                old_values, new_values, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
       [userId, action, tableName, recordId, 
        JSON.stringify(oldValues), JSON.stringify(newValues),
        req.ip, req.headers['user-agent']]
     );
   }
   ```

---

## 🔄 Sample Workflows

### Library Book Issue Workflow

```sql
-- 1. Check book availability
SELECT * FROM library_books 
WHERE id = 1 AND available_copies > 0 AND is_reference_only = FALSE;

-- 2. Create transaction
INSERT INTO library_transactions 
  (book_id, borrower_type, borrower_id, issue_date, due_date, issued_by)
VALUES 
  (1, 'student', 123, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 1);

-- 3. Update available copies
UPDATE library_books 
SET available_copies = available_copies - 1 
WHERE id = 1;

-- 4. Check overdue books daily
UPDATE library_transactions 
SET status = 'overdue' 
WHERE status = 'issued' 
  AND due_date < CURDATE();

-- 5. Calculate fines
UPDATE library_transactions lt
JOIN library_fine_rules lfr ON lfr.user_type = lt.borrower_type
SET lt.fine_amount = GREATEST(0, DATEDIFF(CURDATE(), lt.due_date) - lfr.grace_period_days) * lfr.fine_per_day
WHERE lt.status = 'overdue'
  AND DATEDIFF(CURDATE(), lt.due_date) > lfr.grace_period_days;
```

### Assignment Creation & Submission Workflow

```sql
-- 1. Teacher creates assignment
INSERT INTO assignments 
  (academic_year_id, class_id, section_id, subject_id, teacher_id, 
   title, description, assignment_type, max_marks, assigned_date, due_date)
VALUES 
  (1, 5, 2, 10, 15, 'Chapter 5 Homework', 'Complete all exercises', 'homework', 20, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 3 DAY));

-- 2. Student submits assignment
INSERT INTO assignment_submissions 
  (assignment_id, student_id, submission_text, status)
VALUES 
  (1, 234, 'My assignment answers...', 'submitted');

-- 3. Check late submission
UPDATE assignment_submissions asub
JOIN assignments a ON a.id = asub.assignment_id
SET asub.is_late = TRUE
WHERE asub.submission_date > a.due_date;

-- 4. Teacher grades submission
UPDATE assignment_submissions 
SET marks_obtained = 18, grade = 'A', feedback = 'Excellent work!', 
    status = 'graded', graded_by = 15, graded_at = NOW()
WHERE id = 1;

-- 5. Get pending assignments for student
SELECT a.*, asub.status 
FROM assignments a
LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id AND asub.student_id = 234
WHERE a.class_id = 5 
  AND a.section_id = 2
  AND a.is_active = TRUE
  AND (asub.status IS NULL OR asub.status = 'pending');
```

### Fee Installment Workflow

```sql
-- 1. Create fee installments for a student
INSERT INTO fee_installments 
  (student_fee_id, installment_number, installment_name, amount, due_date)
VALUES 
  (100, 1, 'First Quarter', 5000.00, '2025-07-15'),
  (100, 2, 'Second Quarter', 5000.00, '2025-10-15'),
  (100, 3, 'Third Quarter', 5000.00, '2026-01-15'),
  (100, 4, 'Fourth Quarter', 5000.00, '2026-04-15');

-- 2. Record partial payment
UPDATE fee_installments 
SET paid_amount = paid_amount + 2500.00,
    payment_date = CURDATE(),
    status = CASE WHEN paid_amount + 2500.00 >= amount THEN 'paid' ELSE 'partial' END
WHERE id = 1;

-- 3. Mark overdue installments
UPDATE fee_installments 
SET status = 'overdue'
WHERE status IN ('pending', 'partial')
  AND due_date < CURDATE();

-- 4. Send payment reminders
INSERT INTO fee_reminders 
  (student_fee_id, installment_id, reminder_type, sent_date, due_amount, sent_by)
SELECT sf.id, fi.id, 'sms', CURDATE(), fi.amount - fi.paid_amount, 1
FROM fee_installments fi
JOIN student_fees sf ON sf.id = fi.student_fee_id
WHERE fi.status IN ('pending', 'partial', 'overdue')
  AND fi.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY);
```

---

## 📌 Important Notes

### Data Integrity
- All tables use InnoDB engine for ACID compliance
- Foreign keys ensure referential integrity
- CHECK constraints validate business rules
- Soft deletes preserve historical data (deleted_at)

### Performance Considerations
- Comprehensive indexes on all foreign keys
- Additional indexes on frequently queried columns
- Views optimized for common reports
- JSON columns for flexible data storage

### Security
- All sensitive operations logged in audit_logs
- Session management with token-based authentication
- Role-based access control via permissions
- IP address and user agent tracking

### Scalability
- Partition audit_logs by timestamp for large deployments
- Archive old transactions to history tables
- Implement data retention policies
- Consider read replicas for reporting

---

## 🎯 Next Steps

### High Priority
1. Implement remaining medium-priority features (see DATABASE_AUDIT_REPORT.md)
2. Create data migration scripts from legacy tables
3. Develop API endpoints for new features
4. Build frontend interfaces

### Medium Priority
1. Health records management
2. Student achievements tracking
3. Events and holidays management
4. Alumni management
5. Enhanced hostel features

### Low Priority
1. Advanced analytics dashboards
2. Custom report builder
3. Mobile app integration
4. Third-party integrations

---

## 📞 Support

For issues or questions about this migration:
1. Review the audit report: `DATABASE_AUDIT_REPORT.md`
2. Check migration logs for errors
3. Verify foreign key relationships
4. Test with sample data before production deployment

---

**Migration Created:** November 15, 2025  
**Version:** 1.0  
**Status:** Ready for execution  
**Impact:** Adds 19 critical tables + 3 views + 14 permissions
