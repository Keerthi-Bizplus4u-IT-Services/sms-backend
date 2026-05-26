-- ============================================================================
-- SMS Database Optimization Migration Script
-- Version: 2.0
-- Date: 2025-11-15
-- Description: Complete schema normalization following 3NF and ACID principles
-- Performance Target: 10,000+ concurrent users
-- ============================================================================

USE sms;

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_VALUE_ON_ZERO,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, AUTOCOMMIT=0;

START TRANSACTION;

-- ============================================================================
-- PHASE 1: CREATE CORE NORMALIZED TABLES
-- ============================================================================

-- 1.1 Roles Table
CREATE TABLE IF NOT EXISTS `roles` (
  `id` TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User roles for RBAC';

INSERT INTO `roles` (`id`, `name`, `description`) VALUES
  (1, 'admin', 'System Administrator'),
  (2, 'student', 'Student User'),
  (3, 'parent', 'Parent/Guardian'),
  (4, 'teacher', 'Teacher/Faculty'),
  (5, 'library', 'Library Staff'),
  (6, 'accounts', 'Accounts/Finance Staff'),
  (7, 'exam', 'Examination Staff'),
  (8, 'transport', 'Transport Manager'),
  (9, 'hostel', 'Hostel Warden'),
  (10, 'management', 'Management/Executive')
ON DUPLICATE KEY UPDATE 
  `name` = VALUES(`name`),
  `description` = VALUES(`description`);

-- 1.2 Users Table (Central Authentication)
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
  `role_id` TINYINT UNSIGNED NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `email_verified_at` TIMESTAMP NULL,
  `last_login_at` TIMESTAMP NULL,
  `failed_login_attempts` TINYINT UNSIGNED DEFAULT 0,
  `locked_until` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX `idx_email` (`email`),
  INDEX `idx_role_id` (`role_id`),
  INDEX `idx_active` (`is_active`),
  INDEX `idx_last_login` (`last_login_at`),
  INDEX `idx_deleted` (`deleted_at`),
  
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) 
    REFERENCES `roles`(`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Central user authentication table';

-- 1.3 Persons Table (Base for all people)
CREATE TABLE IF NOT EXISTS `persons` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED UNIQUE,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `middle_name` VARCHAR(100),
  `gender` ENUM('male', 'female', 'other', 'prefer_not_to_say') NOT NULL,
  `date_of_birth` DATE NOT NULL,
  `blood_group` ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NULL,
  `religion` VARCHAR(50),
  `id_number` VARCHAR(50) UNIQUE COMMENT 'Aadhar/ID card number',
  `phone` VARCHAR(20),
  `alternate_phone` VARCHAR(20),
  `address_line1` VARCHAR(255),
  `address_line2` VARCHAR(255),
  `city` VARCHAR(100),
  `state` VARCHAR(100),
  `postal_code` VARCHAR(20),
  `country` VARCHAR(100) DEFAULT 'India',
  `photo_url` VARCHAR(500),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_phone` (`phone`),
  INDEX `idx_id_number` (`id_number`),
  INDEX `idx_full_name` (`first_name`, `last_name`),
  INDEX `idx_dob` (`date_of_birth`),
  
  CONSTRAINT `fk_persons_user` FOREIGN KEY (`user_id`) 
    REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Base person information for students, teachers, parents, staff';

-- ============================================================================
-- PHASE 2: ACADEMIC STRUCTURE
-- ============================================================================

-- 2.1 Academic Years
CREATE TABLE IF NOT EXISTS `academic_years` (
  `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(20) NOT NULL UNIQUE COMMENT 'e.g., 2024-2025',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `is_current` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_current` (`is_current`),
  INDEX `idx_dates` (`start_date`, `end_date`),
  
  CONSTRAINT `chk_year_dates` CHECK (`end_date` > `start_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.2 Classes (Normalized)
CREATE TABLE IF NOT EXISTS `classes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `academic_year_id` SMALLINT UNSIGNED NOT NULL,
  `name` VARCHAR(50) NOT NULL COMMENT 'e.g., Grade 1, Class 10',
  `numeric_grade` TINYINT UNSIGNED COMMENT '1-12 for grades',
  `display_order` SMALLINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX `idx_academic_year` (`academic_year_id`),
  INDEX `idx_name` (`name`),
  INDEX `idx_grade` (`numeric_grade`),
  UNIQUE KEY `uk_class_year_name` (`academic_year_id`, `name`),
  
  CONSTRAINT `fk_classes_academic_year` FOREIGN KEY (`academic_year_id`) 
    REFERENCES `academic_years`(`id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_grade_range` CHECK (`numeric_grade` BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.3 Sections (Normalized)
CREATE TABLE IF NOT EXISTS `sections` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `class_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(50) NOT NULL COMMENT 'e.g., A, B, Science',
  `capacity` INT UNSIGNED,
  `room_number` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX `idx_class_id` (`class_id`),
  UNIQUE KEY `uk_class_section` (`class_id`, `name`),
  
  CONSTRAINT `fk_sections_class` FOREIGN KEY (`class_id`) 
    REFERENCES `classes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.4 Subjects (Normalized)
CREATE TABLE IF NOT EXISTS `subjects` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `credit_hours` DECIMAL(4,2),
  `is_mandatory` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX `idx_code` (`code`),
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.5 Class-Subject Mapping
CREATE TABLE IF NOT EXISTS `class_subjects` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `class_id` BIGINT UNSIGNED NOT NULL,
  `subject_id` BIGINT UNSIGNED NOT NULL,
  `is_mandatory` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_class_subject` (`class_id`, `subject_id`),
  INDEX `idx_class_id` (`class_id`),
  INDEX `idx_subject_id` (`subject_id`),
  
  CONSTRAINT `fk_class_subjects_class` FOREIGN KEY (`class_id`) 
    REFERENCES `classes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_class_subjects_subject` FOREIGN KEY (`subject_id`) 
    REFERENCES `subjects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PHASE 3: STUDENTS & PARENTS
-- ============================================================================

-- 3.1 Students (Normalized)
CREATE TABLE IF NOT EXISTS `students` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `person_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `roll_number` VARCHAR(50) NOT NULL UNIQUE,
  `admission_number` VARCHAR(50) UNIQUE,
  `admission_date` DATE NOT NULL,
  `class_id` BIGINT UNSIGNED NOT NULL,
  `section_id` INT UNSIGNED NOT NULL,
  `current_status` ENUM('active', 'inactive', 'graduated', 'transferred', 'expelled') DEFAULT 'active',
  `previous_school` VARCHAR(255),
  `transfer_certificate_number` VARCHAR(50),
  `row_version` INT UNSIGNED DEFAULT 1 COMMENT 'Optimistic locking',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX `idx_person_id` (`person_id`),
  INDEX `idx_roll_number` (`roll_number`),
  INDEX `idx_admission_number` (`admission_number`),
  INDEX `idx_class_section` (`class_id`, `section_id`),
  INDEX `idx_status` (`current_status`),
  INDEX `idx_admission_date` (`admission_date`),
  
  CONSTRAINT `fk_students_person` FOREIGN KEY (`person_id`) 
    REFERENCES `persons`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_students_class` FOREIGN KEY (`class_id`) 
    REFERENCES `classes`(`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_students_section` FOREIGN KEY (`section_id`) 
    REFERENCES `sections`(`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.2 Parents (Normalized)
CREATE TABLE IF NOT EXISTS `parents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `person_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `occupation` VARCHAR(100),
  `annual_income` DECIMAL(12,2),
  `employer_name` VARCHAR(255),
  `pan_number` VARCHAR(20) UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX `idx_person_id` (`person_id`),
  INDEX `idx_pan_number` (`pan_number`),
  
  CONSTRAINT `fk_parents_person` FOREIGN KEY (`person_id`) 
    REFERENCES `persons`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.3 Student-Parent Relationship
CREATE TABLE IF NOT EXISTS `student_parents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `student_id` BIGINT UNSIGNED NOT NULL,
  `parent_id` BIGINT UNSIGNED NOT NULL,
  `relationship_type` ENUM('father', 'mother', 'guardian', 'other') NOT NULL,
  `is_primary_contact` BOOLEAN DEFAULT FALSE,
  `is_emergency_contact` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_student_parent` (`student_id`, `parent_id`),
  INDEX `idx_student_id` (`student_id`),
  INDEX `idx_parent_id` (`parent_id`),
  INDEX `idx_primary_contact` (`is_primary_contact`),
  
  CONSTRAINT `fk_student_parents_student` FOREIGN KEY (`student_id`) 
    REFERENCES `students`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_student_parents_parent` FOREIGN KEY (`parent_id`) 
    REFERENCES `parents`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PHASE 4: TEACHERS & STAFF
-- ============================================================================

-- 4.1 Teachers (Normalized)
CREATE TABLE IF NOT EXISTS `teachers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `person_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `employee_id` VARCHAR(50) NOT NULL UNIQUE,
  `qualification` VARCHAR(255),
  `specialization` VARCHAR(255),
  `experience_years` DECIMAL(4,1),
  `joining_date` DATE NOT NULL,
  `resignation_date` DATE NULL,
  `employment_status` ENUM('active', 'on_leave', 'resigned', 'terminated') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX `idx_person_id` (`person_id`),
  INDEX `idx_employee_id` (`employee_id`),
  INDEX `idx_status` (`employment_status`),
  INDEX `idx_joining_date` (`joining_date`),
  
  CONSTRAINT `fk_teachers_person` FOREIGN KEY (`person_id`) 
    REFERENCES `persons`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.2 Teacher-Subject Specialization
CREATE TABLE IF NOT EXISTS `teacher_subjects` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `teacher_id` BIGINT UNSIGNED NOT NULL,
  `subject_id` BIGINT UNSIGNED NOT NULL,
  `proficiency_level` ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_teacher_subject` (`teacher_id`, `subject_id`),
  INDEX `idx_teacher_id` (`teacher_id`),
  INDEX `idx_subject_id` (`subject_id`),
  
  CONSTRAINT `fk_teacher_subjects_teacher` FOREIGN KEY (`teacher_id`) 
    REFERENCES `teachers`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_teacher_subjects_subject` FOREIGN KEY (`subject_id`) 
    REFERENCES `subjects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.3 Staff (Normalized)
CREATE TABLE IF NOT EXISTS `staff` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `person_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `employee_id` VARCHAR(50) NOT NULL UNIQUE,
  `department` ENUM('administration', 'library', 'accounts', 'transport', 'hostel', 'exam', 'other') NOT NULL,
  `designation` VARCHAR(100) NOT NULL,
  `joining_date` DATE NOT NULL,
  `employment_status` ENUM('active', 'on_leave', 'resigned', 'terminated') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX `idx_person_id` (`person_id`),
  INDEX `idx_employee_id` (`employee_id`),
  INDEX `idx_department` (`department`),
  INDEX `idx_status` (`employment_status`),
  
  CONSTRAINT `fk_staff_person` FOREIGN KEY (`person_id`) 
    REFERENCES `persons`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.4 Salaries
CREATE TABLE IF NOT EXISTS `salaries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `employee_type` ENUM('teacher', 'staff') NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `basic_salary` DECIMAL(12,2) NOT NULL,
  `allowances` DECIMAL(12,2) DEFAULT 0.00,
  `deductions` DECIMAL(12,2) DEFAULT 0.00,
  `net_salary` DECIMAL(12,2) GENERATED ALWAYS AS (`basic_salary` + `allowances` - `deductions`) STORED,
  `effective_from` DATE NOT NULL,
  `effective_to` DATE NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_employee` (`employee_type`, `employee_id`),
  INDEX `idx_effective_dates` (`effective_from`, `effective_to`),
  
  CONSTRAINT `chk_salary_amounts` CHECK (`basic_salary` >= 0 AND `allowances` >= 0 AND `deductions` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PHASE 5: ATTENDANCE
-- ============================================================================

-- 5.1 Attendance Sessions
CREATE TABLE IF NOT EXISTS `attendance_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `class_id` BIGINT UNSIGNED NOT NULL,
  `section_id` INT UNSIGNED NOT NULL,
  `subject_id` BIGINT UNSIGNED NULL,
  `teacher_id` BIGINT UNSIGNED NULL,
  `session_date` DATE NOT NULL,
  `period_number` TINYINT UNSIGNED,
  `session_type` ENUM('morning', 'afternoon', 'period', 'full_day') DEFAULT 'full_day',
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_class_section_date` (`class_id`, `section_id`, `session_date`),
  INDEX `idx_teacher_id` (`teacher_id`),
  INDEX `idx_session_date` (`session_date`),
  
  CONSTRAINT `fk_attendance_sessions_class` FOREIGN KEY (`class_id`) 
    REFERENCES `classes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_sessions_section` FOREIGN KEY (`section_id`) 
    REFERENCES `sections`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_sessions_subject` FOREIGN KEY (`subject_id`) 
    REFERENCES `subjects`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_sessions_teacher` FOREIGN KEY (`teacher_id`) 
    REFERENCES `teachers`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_sessions_creator` FOREIGN KEY (`created_by`) 
    REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5.2 Attendance Records
CREATE TABLE IF NOT EXISTS `attendance_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `session_id` BIGINT UNSIGNED NOT NULL,
  `student_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('present', 'absent', 'late', 'excused') NOT NULL,
  `remarks` VARCHAR(500),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_session_student` (`session_id`, `student_id`),
  INDEX `idx_session_id` (`session_id`),
  INDEX `idx_student_id` (`student_id`),
  INDEX `idx_status` (`status`),
  
  CONSTRAINT `fk_attendance_records_session` FOREIGN KEY (`session_id`) 
    REFERENCES `attendance_sessions`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_records_student` FOREIGN KEY (`student_id`) 
    REFERENCES `students`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PHASE 6: FEES & PAYMENTS
-- ============================================================================

-- 6.1 Fee Structures
CREATE TABLE IF NOT EXISTS `fee_structures` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `academic_year_id` SMALLINT UNSIGNED NOT NULL,
  `class_id` BIGINT UNSIGNED NOT NULL,
  `fee_type` ENUM('tuition', 'transport', 'hostel', 'exam', 'library', 'sports', 'admission', 'other') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `due_term` ENUM('annual', 'semester_1', 'semester_2', 'term_1', 'term_2', 'term_3') DEFAULT 'annual',
  `is_mandatory` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_year_class_type_term` (`academic_year_id`, `class_id`, `fee_type`, `due_term`),
  INDEX `idx_academic_year` (`academic_year_id`),
  INDEX `idx_class_id` (`class_id`),
  INDEX `idx_fee_type` (`fee_type`),
  
  CONSTRAINT `fk_fee_structures_year` FOREIGN KEY (`academic_year_id`) 
    REFERENCES `academic_years`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fee_structures_class` FOREIGN KEY (`class_id`) 
    REFERENCES `classes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_fee_amount_positive` CHECK (`amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6.2 Student Fees
CREATE TABLE IF NOT EXISTS `student_fees` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `student_id` BIGINT UNSIGNED NOT NULL,
  `fee_structure_id` BIGINT UNSIGNED NOT NULL,
  `total_amount` DECIMAL(12,2) NOT NULL,
  `discount_amount` DECIMAL(12,2) DEFAULT 0.00,
  `final_amount` DECIMAL(12,2) GENERATED ALWAYS AS (`total_amount` - `discount_amount`) STORED,
  `paid_amount` DECIMAL(12,2) DEFAULT 0.00,
  `balance_amount` DECIMAL(12,2) GENERATED ALWAYS AS (`total_amount` - `discount_amount` - `paid_amount`) STORED,
  `due_date` DATE,
  `status` ENUM('pending', 'partial', 'paid', 'overdue', 'waived') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_student_fee_structure` (`student_id`, `fee_structure_id`),
  INDEX `idx_student_id` (`student_id`),
  INDEX `idx_fee_structure_id` (`fee_structure_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_due_date` (`due_date`),
  
  CONSTRAINT `fk_student_fees_student` FOREIGN KEY (`student_id`) 
    REFERENCES `students`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_student_fees_structure` FOREIGN KEY (`fee_structure_id`) 
    REFERENCES `fee_structures`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_fee_amounts` CHECK (
    `total_amount` >= 0 AND 
    `discount_amount` >= 0 AND 
    `paid_amount` >= 0 AND
    `discount_amount` <= `total_amount` AND
    `paid_amount` <= (`total_amount` - `discount_amount`)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6.3 Fee Payments
CREATE TABLE IF NOT EXISTS `fee_payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `student_fee_id` BIGINT UNSIGNED NOT NULL,
  `receipt_number` VARCHAR(50) NOT NULL UNIQUE,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_date` DATE NOT NULL,
  `payment_method` ENUM('cash', 'check', 'card', 'online', 'bank_transfer') NOT NULL,
  `transaction_reference` VARCHAR(100),
  `collected_by` BIGINT UNSIGNED,
  `remarks` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX `idx_student_fee_id` (`student_fee_id`),
  INDEX `idx_receipt_number` (`receipt_number`),
  INDEX `idx_payment_date` (`payment_date`),
  INDEX `idx_collected_by` (`collected_by`),
  
  CONSTRAINT `fk_fee_payments_student_fee` FOREIGN KEY (`student_fee_id`) 
    REFERENCES `student_fees`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_fee_payments_collector` FOREIGN KEY (`collected_by`) 
    REFERENCES `users`(`id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_payment_amount` CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PHASE 7: EXAMS & MARKS
-- ============================================================================

-- 7.1 Exams
CREATE TABLE IF NOT EXISTS `exams` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `academic_year_id` SMALLINT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `exam_type` ENUM('unit_test', 'mid_term', 'final', 'practical', 'project', 'other') NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `result_date` DATE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_academic_year` (`academic_year_id`),
  INDEX `idx_exam_type` (`exam_type`),
  INDEX `idx_dates` (`start_date`, `end_date`),
  
  CONSTRAINT `fk_exams_academic_year` FOREIGN KEY (`academic_year_id`) 
    REFERENCES `academic_years`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_exam_dates` CHECK (`end_date` >= `start_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7.2 Exam Schedules
CREATE TABLE IF NOT EXISTS `exam_schedules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `exam_id` INT UNSIGNED NOT NULL,
  `class_id` BIGINT UNSIGNED NOT NULL,
  `subject_id` BIGINT UNSIGNED NOT NULL,
  `exam_date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `max_marks` DECIMAL(6,2) NOT NULL,
  `passing_marks` DECIMAL(6,2) NOT NULL,
  `room_number` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_exam_class_subject` (`exam_id`, `class_id`, `subject_id`),
  INDEX `idx_exam_id` (`exam_id`),
  INDEX `idx_class_id` (`class_id`),
  INDEX `idx_subject_id` (`subject_id`),
  INDEX `idx_exam_date` (`exam_date`),
  
  CONSTRAINT `fk_exam_schedules_exam` FOREIGN KEY (`exam_id`) 
    REFERENCES `exams`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exam_schedules_class` FOREIGN KEY (`class_id`) 
    REFERENCES `classes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exam_schedules_subject` FOREIGN KEY (`subject_id`) 
    REFERENCES `subjects`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_exam_marks` CHECK (`max_marks` > 0 AND `passing_marks` > 0 AND `passing_marks` <= `max_marks`),
  CONSTRAINT `chk_exam_time` CHECK (`end_time` > `start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7.3 Student Marks
CREATE TABLE IF NOT EXISTS `student_marks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `exam_schedule_id` BIGINT UNSIGNED NOT NULL,
  `student_id` BIGINT UNSIGNED NOT NULL,
  `marks_obtained` DECIMAL(6,2),
  `is_absent` BOOLEAN DEFAULT FALSE,
  `remarks` VARCHAR(500),
  `entered_by` BIGINT UNSIGNED,
  `verified_by` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uk_schedule_student` (`exam_schedule_id`, `student_id`),
  INDEX `idx_exam_schedule_id` (`exam_schedule_id`),
  INDEX `idx_student_id` (`student_id`),
  INDEX `idx_entered_by` (`entered_by`),
  
  CONSTRAINT `fk_student_marks_schedule` FOREIGN KEY (`exam_schedule_id`) 
    REFERENCES `exam_schedules`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_student_marks_student` FOREIGN KEY (`student_id`) 
    REFERENCES `students`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_student_marks_entered_by` FOREIGN KEY (`entered_by`) 
    REFERENCES `users`(`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_student_marks_verified_by` FOREIGN KEY (`verified_by`) 
    REFERENCES `users`(`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7.4 Grading Scales
CREATE TABLE IF NOT EXISTS `grading_scales` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `academic_year_id` SMALLINT UNSIGNED NOT NULL,
  `grade_name` VARCHAR(10) NOT NULL,
  `min_percentage` DECIMAL(5,2) NOT NULL,
  `max_percentage` DECIMAL(5,2) NOT NULL,
  `grade_point` DECIMAL(4,2),
  `description` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX `idx_academic_year` (`academic_year_id`),
  INDEX `idx_percentage_range` (`min_percentage`, `max_percentage`),
  
  CONSTRAINT `fk_grading_scales_year` FOREIGN KEY (`academic_year_id`) 
    REFERENCES `academic_years`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_percentage_range` CHECK (
    `min_percentage` >= 0 AND 
    `max_percentage` <= 100 AND 
    `min_percentage` < `max_percentage`
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PHASE 8: COMMIT TRANSACTION
-- ============================================================================

COMMIT;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

-- ============================================================================
-- END OF MIGRATION SCRIPT
-- ============================================================================
