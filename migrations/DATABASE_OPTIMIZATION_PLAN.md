# Database Schema Optimization Plan

## Executive Summary
This document outlines the optimization of the School Management System (SMS) database to follow normalization principles (3NF), ACID compliance, and best practices for scalability up to 10,000+ concurrent users.

## Current Schema Issues

### 1. **Data Type Issues**
- **VARCHAR for numeric values**: `student.uid`, `student.cid`, `student.secid`, `class.year`, dates stored as VARCHAR
- **Inconsistent date storage**: Mixed formats (DD/MM/YYYY strings instead of DATE/DATETIME)
- **Money as VARCHAR/INT**: `expense.amount`, `fees.fee`, `teacher.salary` - should be DECIMAL
- **Phone numbers as VARCHAR(10)**: Should allow international formats
- **Boolean as INT**: `active`, `status` fields should be TINYINT(1) or BOOLEAN

### 2. **Normalization Violations**

#### **First Normal Form (1NF) Violations**
- Multiple values in single columns (not atomic)
- Inconsistent data types across related tables

#### **Second Normal Form (2NF) Violations**
- `student` table has partial dependencies on composite keys
- `addattendence` stores denormalized attendance data

#### **Third Normal Form (3NF) Violations**
- `admin` and `teacher` tables duplicate person data (should have base `person` table)
- `parent` table stores duplicate address/contact info
- Subject names/codes repeated instead of normalized

### 3. **Missing Foreign Key Constraints**
- No referential integrity between:
  - `student.cid` → `class.cid`
  - `section.cid` → `class.cid`
  - `subjects.cid` → `class.cid`
  - `student.uid` → `user.uid`
  - `teacher.uid` → `user.uid`
  - `parent.uid` → `user.uid`
  - `feetransactions.roll` → `student.roll`

### 4. **Sentinel/Magic Values**
- Extensive use of `-1`, `0`, empty strings as placeholders
- Should use NULL for missing optional data

### 5. **Missing Indexes**
- No indexes on foreign key columns
- No composite indexes for common query patterns
- Missing indexes on frequently searched columns (email, phone, roll number)

### 6. **Poor Column Naming**
- Inconsistent naming: `fname`/`lname` vs `emailid` vs `uid`
- Abbreviated names reduce readability: `cid`, `secid`, `subid`, `bg`, `rel`
- Mixed conventions: `uid` vs `user_id`

### 7. **Missing Audit Columns**
- No `created_at`, `updated_at`, `deleted_at` for most tables
- No tracking of who created/modified records

### 8. **Security Issues**
- Passwords stored in plain text (VARCHAR(30))
- No password hashing mechanism
- No salt or encryption

### 9. **Schema Design Issues**
- No soft delete mechanism (deleted_at)
- No optimistic locking (version/row_version)
- No partitioning strategy for large tables
- Missing academic year management
- No proper session/term structure

## Optimized Schema Design

### Core Principles
1. **Normalization**: Achieve 3NF minimum
2. **ACID Compliance**: Ensure atomicity, consistency, isolation, durability
3. **Scalability**: Design for 10k+ concurrent users
4. **Security**: Hash passwords, proper constraints
5. **Auditability**: Track all changes with timestamps
6. **Referential Integrity**: Enforce FK constraints
7. **Performance**: Strategic indexing

### Proposed Table Structure

#### **1. User Management (Normalized)**

```sql
-- Base roles table
CREATE TABLE roles (
  id TINYINT UNSIGNED PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Central user authentication
CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id TINYINT UNSIGNED NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  email_verified_at TIMESTAMP NULL,
  last_login_at TIMESTAMP NULL,
  failed_login_attempts TINYINT UNSIGNED DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_email (email),
  INDEX idx_role_id (role_id),
  INDEX idx_active (is_active),
  INDEX idx_last_login (last_login_at),
  
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) 
    REFERENCES roles(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Base person table (DRY principle)
CREATE TABLE persons (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  gender ENUM('male', 'female', 'other', 'prefer_not_to_say') NOT NULL,
  date_of_birth DATE NOT NULL,
  blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NULL,
  religion VARCHAR(50),
  id_number VARCHAR(50) UNIQUE,
  phone VARCHAR(20),
  alternate_phone VARCHAR(20),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  photo_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_phone (phone),
  INDEX idx_id_number (id_number),
  INDEX idx_full_name (first_name, last_name),
  
  CONSTRAINT fk_persons_user FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **2. Academic Structure (Normalized)**

```sql
-- Academic years
CREATE TABLE academic_years (
  id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(20) NOT NULL UNIQUE, -- e.g., "2024-2025"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_current (is_current),
  INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Classes/Grades
CREATE TABLE classes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  academic_year_id SMALLINT UNSIGNED NOT NULL,
  name VARCHAR(50) NOT NULL, -- e.g., "Grade 1", "Class 10"
  numeric_grade TINYINT UNSIGNED, -- 1-12 for standard grades
  display_order SMALLINT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_academic_year (academic_year_id),
  INDEX idx_name (name),
  INDEX idx_grade (numeric_grade),
  UNIQUE KEY uk_class_year_name (academic_year_id, name),
  
  CONSTRAINT fk_classes_academic_year FOREIGN KEY (academic_year_id) 
    REFERENCES academic_years(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sections
CREATE TABLE sections (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  class_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(50) NOT NULL, -- e.g., "A", "B", "Science"
  capacity INT UNSIGNED,
  room_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_class_id (class_id),
  UNIQUE KEY uk_class_section (class_id, name),
  
  CONSTRAINT fk_sections_class FOREIGN KEY (class_id) 
    REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subjects
CREATE TABLE subjects (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  credit_hours DECIMAL(4,2),
  is_mandatory BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_code (code),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Class-Subject mapping (Many-to-Many)
CREATE TABLE class_subjects (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  class_id BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  is_mandatory BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_class_subject (class_id, subject_id),
  INDEX idx_class_id (class_id),
  INDEX idx_subject_id (subject_id),
  
  CONSTRAINT fk_class_subjects_class FOREIGN KEY (class_id) 
    REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_class_subjects_subject FOREIGN KEY (subject_id) 
    REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **3. Students (Normalized)**

```sql
-- Students
CREATE TABLE students (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  person_id BIGINT UNSIGNED NOT NULL UNIQUE,
  roll_number VARCHAR(50) NOT NULL UNIQUE,
  admission_number VARCHAR(50) UNIQUE,
  admission_date DATE NOT NULL,
  class_id BIGINT UNSIGNED NOT NULL,
  section_id INT UNSIGNED NOT NULL,
  current_status ENUM('active', 'inactive', 'graduated', 'transferred', 'expelled') DEFAULT 'active',
  previous_school VARCHAR(255),
  transfer_certificate_number VARCHAR(50),
  row_version INT UNSIGNED DEFAULT 1, -- Optimistic locking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_person_id (person_id),
  INDEX idx_roll_number (roll_number),
  INDEX idx_admission_number (admission_number),
  INDEX idx_class_section (class_id, section_id),
  INDEX idx_status (current_status),
  INDEX idx_admission_date (admission_date),
  
  CONSTRAINT fk_students_person FOREIGN KEY (person_id) 
    REFERENCES persons(id) ON DELETE RESTRICT,
  CONSTRAINT fk_students_class FOREIGN KEY (class_id) 
    REFERENCES classes(id) ON UPDATE CASCADE,
  CONSTRAINT fk_students_section FOREIGN KEY (section_id) 
    REFERENCES sections(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Parent-Student relationship
CREATE TABLE parents (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  person_id BIGINT UNSIGNED NOT NULL UNIQUE,
  occupation VARCHAR(100),
  annual_income DECIMAL(12,2),
  employer_name VARCHAR(255),
  pan_number VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_person_id (person_id),
  INDEX idx_pan_number (pan_number),
  
  CONSTRAINT fk_parents_person FOREIGN KEY (person_id) 
    REFERENCES persons(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Many-to-Many: Student-Parent relationship
CREATE TABLE student_parents (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NOT NULL,
  relationship_type ENUM('father', 'mother', 'guardian', 'other') NOT NULL,
  is_primary_contact BOOLEAN DEFAULT FALSE,
  is_emergency_contact BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_student_parent (student_id, parent_id),
  INDEX idx_student_id (student_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_primary_contact (is_primary_contact),
  
  CONSTRAINT fk_student_parents_student FOREIGN KEY (student_id) 
    REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_parents_parent FOREIGN KEY (parent_id) 
    REFERENCES parents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **4. Teachers & Staff (Normalized)**

```sql
-- Teachers
CREATE TABLE teachers (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  person_id BIGINT UNSIGNED NOT NULL UNIQUE,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  qualification VARCHAR(255),
  specialization VARCHAR(255),
  experience_years DECIMAL(4,1),
  joining_date DATE NOT NULL,
  resignation_date DATE NULL,
  employment_status ENUM('active', 'on_leave', 'resigned', 'terminated') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_person_id (person_id),
  INDEX idx_employee_id (employee_id),
  INDEX idx_status (employment_status),
  INDEX idx_joining_date (joining_date),
  
  CONSTRAINT fk_teachers_person FOREIGN KEY (person_id) 
    REFERENCES persons(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teacher-Subject specialization (Many-to-Many)
CREATE TABLE teacher_subjects (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  teacher_id BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  proficiency_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_teacher_subject (teacher_id, subject_id),
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_subject_id (subject_id),
  
  CONSTRAINT fk_teacher_subjects_teacher FOREIGN KEY (teacher_id) 
    REFERENCES teachers(id) ON DELETE CASCADE,
  CONSTRAINT fk_teacher_subjects_subject FOREIGN KEY (subject_id) 
    REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Administrative staff
CREATE TABLE staff (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  person_id BIGINT UNSIGNED NOT NULL UNIQUE,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  department ENUM('administration', 'library', 'accounts', 'transport', 'hostel', 'exam', 'other') NOT NULL,
  designation VARCHAR(100) NOT NULL,
  joining_date DATE NOT NULL,
  employment_status ENUM('active', 'on_leave', 'resigned', 'terminated') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_person_id (person_id),
  INDEX idx_employee_id (employee_id),
  INDEX idx_department (department),
  INDEX idx_status (employment_status),
  
  CONSTRAINT fk_staff_person FOREIGN KEY (person_id) 
    REFERENCES persons(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Salaries
CREATE TABLE salaries (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  employee_type ENUM('teacher', 'staff') NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL,
  allowances DECIMAL(12,2) DEFAULT 0.00,
  deductions DECIMAL(12,2) DEFAULT 0.00,
  net_salary DECIMAL(12,2) GENERATED ALWAYS AS (basic_salary + allowances - deductions) STORED,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_employee (employee_type, employee_id),
  INDEX idx_effective_dates (effective_from, effective_to),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Salary payments
CREATE TABLE salary_payments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  salary_id BIGINT UNSIGNED NOT NULL,
  payment_month TINYINT UNSIGNED NOT NULL, -- 1-12
  payment_year SMALLINT UNSIGNED NOT NULL,
  amount_paid DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('cash', 'check', 'bank_transfer', 'online') DEFAULT 'bank_transfer',
  transaction_reference VARCHAR(100),
  paid_by BIGINT UNSIGNED, -- user_id who processed payment
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_salary_month_year (salary_id, payment_month, payment_year),
  INDEX idx_salary_id (salary_id),
  INDEX idx_payment_date (payment_date),
  INDEX idx_month_year (payment_month, payment_year),
  
  CONSTRAINT fk_salary_payments_salary FOREIGN KEY (salary_id) 
    REFERENCES salaries(id) ON DELETE RESTRICT,
  CONSTRAINT fk_salary_payments_user FOREIGN KEY (paid_by) 
    REFERENCES users(id) ON UPDATE CASCADE,
  CONSTRAINT chk_month CHECK (payment_month BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **5. Attendance (Normalized)**

```sql
-- Attendance sessions
CREATE TABLE attendance_sessions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  class_id BIGINT UNSIGNED NOT NULL,
  section_id INT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NULL,
  teacher_id BIGINT UNSIGNED NULL,
  session_date DATE NOT NULL,
  period_number TINYINT UNSIGNED, -- 1, 2, 3, etc.
  session_type ENUM('morning', 'afternoon', 'period', 'full_day') DEFAULT 'full_day',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_class_section_date (class_id, section_id, session_date),
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_session_date (session_date),
  INDEX idx_created_by (created_by),
  
  CONSTRAINT fk_attendance_sessions_class FOREIGN KEY (class_id) 
    REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_sessions_section FOREIGN KEY (section_id) 
    REFERENCES sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_sessions_subject FOREIGN KEY (subject_id) 
    REFERENCES subjects(id) ON DELETE SET NULL,
  CONSTRAINT fk_attendance_sessions_teacher FOREIGN KEY (teacher_id) 
    REFERENCES teachers(id) ON DELETE SET NULL,
  CONSTRAINT fk_attendance_sessions_creator FOREIGN KEY (created_by) 
    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Individual student attendance records
CREATE TABLE attendance_records (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  session_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  status ENUM('present', 'absent', 'late', 'excused') NOT NULL,
  remarks VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_session_student (session_id, student_id),
  INDEX idx_session_id (session_id),
  INDEX idx_student_id (student_id),
  INDEX idx_status (status),
  
  CONSTRAINT fk_attendance_records_session FOREIGN KEY (session_id) 
    REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_records_student FOREIGN KEY (student_id) 
    REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **6. Fees & Payments (Normalized)**

```sql
-- Fee structures
CREATE TABLE fee_structures (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  academic_year_id SMALLINT UNSIGNED NOT NULL,
  class_id BIGINT UNSIGNED NOT NULL,
  fee_type ENUM('tuition', 'transport', 'hostel', 'exam', 'library', 'sports', 'other') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_term ENUM('annual', 'semester_1', 'semester_2', 'term_1', 'term_2', 'term_3') DEFAULT 'annual',
  is_mandatory BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_year_class_type_term (academic_year_id, class_id, fee_type, due_term),
  INDEX idx_academic_year (academic_year_id),
  INDEX idx_class_id (class_id),
  INDEX idx_fee_type (fee_type),
  
  CONSTRAINT fk_fee_structures_year FOREIGN KEY (academic_year_id) 
    REFERENCES academic_years(id) ON DELETE CASCADE,
  CONSTRAINT fk_fee_structures_class FOREIGN KEY (class_id) 
    REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT chk_amount_positive CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student fee assignments
CREATE TABLE student_fees (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  fee_structure_id BIGINT UNSIGNED NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0.00,
  final_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - discount_amount) STORED,
  paid_amount DECIMAL(12,2) DEFAULT 0.00,
  balance_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - discount_amount - paid_amount) STORED,
  due_date DATE,
  status ENUM('pending', 'partial', 'paid', 'overdue', 'waived') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_student_fee_structure (student_id, fee_structure_id),
  INDEX idx_student_id (student_id),
  INDEX idx_fee_structure_id (fee_structure_id),
  INDEX idx_status (status),
  INDEX idx_due_date (due_date),
  
  CONSTRAINT fk_student_fees_student FOREIGN KEY (student_id) 
    REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_fees_structure FOREIGN KEY (fee_structure_id) 
    REFERENCES fee_structures(id) ON DELETE RESTRICT,
  CONSTRAINT chk_amounts_positive CHECK (
    total_amount >= 0 AND 
    discount_amount >= 0 AND 
    paid_amount >= 0 AND
    discount_amount <= total_amount AND
    paid_amount <= (total_amount - discount_amount)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment transactions
CREATE TABLE fee_payments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_fee_id BIGINT UNSIGNED NOT NULL,
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('cash', 'check', 'card', 'online', 'bank_transfer') NOT NULL,
  transaction_reference VARCHAR(100),
  collected_by BIGINT UNSIGNED,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_student_fee_id (student_fee_id),
  INDEX idx_receipt_number (receipt_number),
  INDEX idx_payment_date (payment_date),
  INDEX idx_collected_by (collected_by),
  
  CONSTRAINT fk_fee_payments_student_fee FOREIGN KEY (student_fee_id) 
    REFERENCES student_fees(id) ON DELETE RESTRICT,
  CONSTRAINT fk_fee_payments_collector FOREIGN KEY (collected_by) 
    REFERENCES users(id) ON UPDATE CASCADE,
  CONSTRAINT chk_payment_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **7. Exams & Marks (Normalized)**

```sql
-- Exam types and schedules
CREATE TABLE exams (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  academic_year_id SMALLINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  exam_type ENUM('unit_test', 'mid_term', 'final', 'practical', 'project', 'other') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  result_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_academic_year (academic_year_id),
  INDEX idx_exam_type (exam_type),
  INDEX idx_dates (start_date, end_date),
  
  CONSTRAINT fk_exams_academic_year FOREIGN KEY (academic_year_id) 
    REFERENCES academic_years(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exam schedule per class/subject
CREATE TABLE exam_schedules (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  exam_id INT UNSIGNED NOT NULL,
  class_id BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_marks DECIMAL(6,2) NOT NULL,
  passing_marks DECIMAL(6,2) NOT NULL,
  room_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_exam_class_subject (exam_id, class_id, subject_id),
  INDEX idx_exam_id (exam_id),
  INDEX idx_class_id (class_id),
  INDEX idx_subject_id (subject_id),
  INDEX idx_exam_date (exam_date),
  
  CONSTRAINT fk_exam_schedules_exam FOREIGN KEY (exam_id) 
    REFERENCES exams(id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_schedules_class FOREIGN KEY (class_id) 
    REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_schedules_subject FOREIGN KEY (subject_id) 
    REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT chk_marks CHECK (max_marks > 0 AND passing_marks > 0 AND passing_marks <= max_marks),
  CONSTRAINT chk_time CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student marks
CREATE TABLE student_marks (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  exam_schedule_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  marks_obtained DECIMAL(6,2),
  is_absent BOOLEAN DEFAULT FALSE,
  remarks VARCHAR(500),
  entered_by BIGINT UNSIGNED,
  verified_by BIGINT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_schedule_student (exam_schedule_id, student_id),
  INDEX idx_exam_schedule_id (exam_schedule_id),
  INDEX idx_student_id (student_id),
  INDEX idx_entered_by (entered_by),
  
  CONSTRAINT fk_student_marks_schedule FOREIGN KEY (exam_schedule_id) 
    REFERENCES exam_schedules(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_marks_student FOREIGN KEY (student_id) 
    REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_marks_entered_by FOREIGN KEY (entered_by) 
    REFERENCES users(id) ON UPDATE CASCADE,
  CONSTRAINT fk_student_marks_verified_by FOREIGN KEY (verified_by) 
    REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Grading system
CREATE TABLE grading_scales (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  academic_year_id SMALLINT UNSIGNED NOT NULL,
  grade_name VARCHAR(10) NOT NULL,
  min_percentage DECIMAL(5,2) NOT NULL,
  max_percentage DECIMAL(5,2) NOT NULL,
  grade_point DECIMAL(4,2),
  description VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_academic_year (academic_year_id),
  INDEX idx_percentage_range (min_percentage, max_percentage),
  
  CONSTRAINT fk_grading_scales_year FOREIGN KEY (academic_year_id) 
    REFERENCES academic_years(id) ON DELETE CASCADE,
  CONSTRAINT chk_percentage_range CHECK (
    min_percentage >= 0 AND 
    max_percentage <= 100 AND 
    min_percentage < max_percentage
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **8. Timetable (Normalized)**

```sql
-- Session hours definition
CREATE TABLE session_hours (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  academic_year_id SMALLINT UNSIGNED NOT NULL,
  period_number TINYINT UNSIGNED NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  session_type ENUM('academic', 'break', 'lunch', 'assembly') DEFAULT 'academic',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_year_period (academic_year_id, period_number),
  INDEX idx_academic_year (academic_year_id),
  INDEX idx_time_range (start_time, end_time),
  
  CONSTRAINT fk_session_hours_year FOREIGN KEY (academic_year_id) 
    REFERENCES academic_years(id) ON DELETE CASCADE,
  CONSTRAINT chk_session_time CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Timetable entries
CREATE TABLE timetable_entries (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  class_id BIGINT UNSIGNED NOT NULL,
  section_id INT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  session_hour_id BIGINT UNSIGNED NOT NULL,
  day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  room_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_class_section_day_hour (class_id, section_id, day_of_week, session_hour_id, effective_from),
  INDEX idx_class_section (class_id, section_id),
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_subject_id (subject_id),
  INDEX idx_day_hour (day_of_week, session_hour_id),
  INDEX idx_effective_dates (effective_from, effective_to),
  
  CONSTRAINT fk_timetable_class FOREIGN KEY (class_id) 
    REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_timetable_section FOREIGN KEY (section_id) 
    REFERENCES sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_timetable_subject FOREIGN KEY (subject_id) 
    REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_timetable_teacher FOREIGN KEY (teacher_id) 
    REFERENCES teachers(id) ON DELETE CASCADE,
  CONSTRAINT fk_timetable_session_hour FOREIGN KEY (session_hour_id) 
    REFERENCES session_hours(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### **9. Additional Modules**

```sql
-- Library books
CREATE TABLE library_books (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  isbn VARCHAR(20) UNIQUE,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  publisher VARCHAR(255),
  publication_year YEAR,
  subject VARCHAR(100),
  category VARCHAR(100),
  total_copies INT UNSIGNED NOT NULL DEFAULT 1,
  available_copies INT UNSIGNED NOT NULL DEFAULT 1,
  price DECIMAL(10,2),
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_isbn (isbn),
  INDEX idx_title (title),
  INDEX idx_author (author),
  INDEX idx_subject (subject),
  
  CONSTRAINT chk_copies CHECK (available_copies <= total_copies)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Library transactions
CREATE TABLE library_transactions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  book_id BIGINT UNSIGNED NOT NULL,
  borrower_type ENUM('student', 'teacher', 'staff') NOT NULL,
  borrower_id BIGINT UNSIGNED NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE NULL,
  fine_amount DECIMAL(8,2) DEFAULT 0.00,
  fine_paid BOOLEAN DEFAULT FALSE,
  issued_by BIGINT UNSIGNED NOT NULL,
  returned_to BIGINT UNSIGNED NULL,
  status ENUM('issued', 'returned', 'overdue', 'lost') DEFAULT 'issued',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_book_id (book_id),
  INDEX idx_borrower (borrower_type, borrower_id),
  INDEX idx_issue_date (issue_date),
  INDEX idx_due_date (due_date),
  INDEX idx_status (status),
  
  CONSTRAINT fk_library_trans_book FOREIGN KEY (book_id) 
    REFERENCES library_books(id) ON DELETE RESTRICT,
  CONSTRAINT fk_library_trans_issued_by FOREIGN KEY (issued_by) 
    REFERENCES users(id),
  CONSTRAINT fk_library_trans_returned_to FOREIGN KEY (returned_to) 
    REFERENCES users(id),
  CONSTRAINT chk_dates CHECK (due_date >= issue_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Leaves
CREATE TABLE leave_requests (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  employee_type ENUM('teacher', 'staff') NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  leave_type ENUM('casual', 'sick', 'special', 'maternity', 'paternity', 'other') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(4,1) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
  approved_by BIGINT UNSIGNED NULL,
  approval_date DATE NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_employee (employee_type, employee_id),
  INDEX idx_dates (start_date, end_date),
  INDEX idx_status (status),
  INDEX idx_leave_type (leave_type),
  
  CONSTRAINT fk_leave_requests_approver FOREIGN KEY (approved_by) 
    REFERENCES users(id) ON UPDATE CASCADE,
  CONSTRAINT chk_leave_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_total_days CHECK (total_days > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expenses
CREATE TABLE expenses (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  category ENUM('salary', 'utilities', 'maintenance', 'supplies', 'transport', 'event', 'other') NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  payment_method ENUM('cash', 'check', 'card', 'bank_transfer') NOT NULL,
  vendor_name VARCHAR(255),
  receipt_number VARCHAR(100),
  approved_by BIGINT UNSIGNED,
  recorded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (category),
  INDEX idx_expense_date (expense_date),
  INDEX idx_recorded_by (recorded_by),
  
  CONSTRAINT fk_expenses_approver FOREIGN KEY (approved_by) 
    REFERENCES users(id) ON UPDATE CASCADE,
  CONSTRAINT fk_expenses_recorder FOREIGN KEY (recorded_by) 
    REFERENCES users(id) ON UPDATE CASCADE,
  CONSTRAINT chk_expense_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notices
CREATE TABLE notices (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  notice_type ENUM('general', 'urgent', 'event', 'exam', 'holiday', 'other') DEFAULT 'general',
  target_audience ENUM('all', 'students', 'parents', 'teachers', 'staff') DEFAULT 'all',
  publish_date DATE NOT NULL,
  expiry_date DATE NULL,
  is_published BOOLEAN DEFAULT FALSE,
  posted_by BIGINT UNSIGNED NOT NULL,
  attachment_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_notice_type (notice_type),
  INDEX idx_target_audience (target_audience),
  INDEX idx_publish_date (publish_date),
  INDEX idx_is_published (is_published),
  
  CONSTRAINT fk_notices_poster FOREIGN KEY (posted_by) 
    REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Events
CREATE TABLE events (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_type ENUM('academic', 'sports', 'cultural', 'competition', 'meeting', 'other') NOT NULL,
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  venue VARCHAR(255),
  organizer_id BIGINT UNSIGNED,
  capacity INT UNSIGNED,
  registration_required BOOLEAN DEFAULT FALSE,
  registration_deadline DATETIME NULL,
  status ENUM('planned', 'ongoing', 'completed', 'cancelled') DEFAULT 'planned',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_event_type (event_type),
  INDEX idx_start_datetime (start_datetime),
  INDEX idx_status (status),
  
  CONSTRAINT fk_events_organizer FOREIGN KEY (organizer_id) 
    REFERENCES users(id) ON UPDATE CASCADE,
  CONSTRAINT chk_event_time CHECK (end_datetime > start_datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transport
CREATE TABLE transport_routes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  route_name VARCHAR(100) NOT NULL UNIQUE,
  vehicle_number VARCHAR(50) NOT NULL,
  driver_name VARCHAR(100) NOT NULL,
  driver_phone VARCHAR(20) NOT NULL,
  driver_license VARCHAR(50),
  capacity INT UNSIGNED NOT NULL,
  monthly_fee DECIMAL(10,2),
  status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_vehicle_number (vehicle_number),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transport route stops
CREATE TABLE transport_stops (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  route_id BIGINT UNSIGNED NOT NULL,
  stop_name VARCHAR(255) NOT NULL,
  stop_order SMALLINT UNSIGNED NOT NULL,
  pickup_time TIME NOT NULL,
  drop_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_route_stop (route_id, stop_name),
  INDEX idx_route_id (route_id),
  INDEX idx_stop_order (stop_order),
  
  CONSTRAINT fk_transport_stops_route FOREIGN KEY (route_id) 
    REFERENCES transport_routes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student transport assignment
CREATE TABLE student_transport (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  route_id BIGINT UNSIGNED NOT NULL,
  stop_id BIGINT UNSIGNED NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_student_id (student_id),
  INDEX idx_route_id (route_id),
  INDEX idx_stop_id (stop_id),
  INDEX idx_effective_dates (effective_from, effective_to),
  
  CONSTRAINT fk_student_transport_student FOREIGN KEY (student_id) 
    REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_transport_route FOREIGN KEY (route_id) 
    REFERENCES transport_routes(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_transport_stop FOREIGN KEY (stop_id) 
    REFERENCES transport_stops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hostel
CREATE TABLE hostels (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  hostel_type ENUM('boys', 'girls', 'mixed') NOT NULL,
  warden_id BIGINT UNSIGNED,
  address TEXT,
  total_rooms INT UNSIGNED NOT NULL,
  capacity INT UNSIGNED NOT NULL,
  monthly_fee DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_warden_id (warden_id),
  
  CONSTRAINT fk_hostels_warden FOREIGN KEY (warden_id) 
    REFERENCES teachers(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hostel rooms
CREATE TABLE hostel_rooms (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  hostel_id BIGINT UNSIGNED NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  floor_number TINYINT UNSIGNED,
  capacity INT UNSIGNED NOT NULL,
  occupied_beds INT UNSIGNED DEFAULT 0,
  room_type ENUM('single', 'double', 'triple', 'dormitory') NOT NULL,
  monthly_fee DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_hostel_room (hostel_id, room_number),
  INDEX idx_hostel_id (hostel_id),
  
  CONSTRAINT fk_hostel_rooms_hostel FOREIGN KEY (hostel_id) 
    REFERENCES hostels(id) ON DELETE CASCADE,
  CONSTRAINT chk_occupied_beds CHECK (occupied_beds <= capacity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student hostel assignment
CREATE TABLE student_hostel (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NOT NULL,
  bed_number TINYINT UNSIGNED NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_room_bed_active (room_id, bed_number, check_out_date),
  INDEX idx_student_id (student_id),
  INDEX idx_room_id (room_id),
  INDEX idx_dates (check_in_date, check_out_date),
  
  CONSTRAINT fk_student_hostel_student FOREIGN KEY (student_id) 
    REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_hostel_room FOREIGN KEY (room_id) 
    REFERENCES hostel_rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Migration Strategy

### Phase 1: Add New Normalized Tables
1. Create all new tables with proper constraints
2. Keep existing tables for backward compatibility
3. Dual-write to both old and new schemas

### Phase 2: Data Migration
1. Migrate users and roles
2. Migrate persons (from student, teacher, admin, parent)
3. Migrate academic structure (years, classes, sections, subjects)
4. Migrate students and parents with relationships
5. Migrate teachers and staff
6. Migrate attendance, fees, exams, marks
7. Validate data integrity

### Phase 3: Application Updates
1. Update application code to use new schema
2. Test thoroughly with both schemas
3. Monitor performance

### Phase 4: Cleanup
1. Remove old tables
2. Optimize indexes based on query patterns
3. Set up backup and monitoring

## Performance Optimizations

### 1. Indexing Strategy
- Primary keys on all tables
- Foreign key indexes for joins
- Composite indexes for common query patterns
- Covering indexes for frequently accessed columns

### 2. Partitioning
- Partition large tables by date (attendance, payments, marks)
- Range partitioning by academic year

### 3. Caching
- Implement Redis/Memcached for frequently accessed data
- Cache class lists, timetables, fee structures

### 4. Query Optimization
- Use prepared statements
- Avoid SELECT *
- Use JOINs efficiently
- Implement pagination

### 5. Connection Pooling
- Increase connection pool size for high concurrency
- Configure timeout settings appropriately

## ACID Compliance

### Atomicity
- Use transactions for multi-table operations
- Implement rollback mechanisms

### Consistency
- Foreign key constraints enforce referential integrity
- CHECK constraints validate data ranges
- Triggers for complex business rules

### Isolation
- Use appropriate transaction isolation levels
- InnoDB supports MVCC for concurrent reads

### Durability
- InnoDB engine with transaction logs
- Regular backups
- Point-in-time recovery capability

## Security Enhancements

1. **Password Security**
   - Store bcrypt hashed passwords
   - Minimum 60 character storage for hashes
   - Implement password policies

2. **Access Control**
   - Role-based access control (RBAC)
   - Audit trails for sensitive operations

3. **Data Protection**
   - Encrypt sensitive data at rest
   - SSL/TLS for data in transit
   - PII data handling compliance

## Monitoring & Maintenance

1. **Performance Monitoring**
   - Slow query log analysis
   - Index usage statistics
   - Table size and growth tracking

2. **Regular Maintenance**
   - Index optimization
   - Table statistics updates
   - Disk space monitoring

3. **Backup Strategy**
   - Daily full backups
   - Hourly incremental backups
   - Offsite backup storage
   - Regular restore testing
