-- ============================================================================
-- CRITICAL MISSING FEATURES - SQL MIGRATION SCRIPT
-- ============================================================================
-- Purpose: Add critical missing tables for school/college management
-- Version: 1.0
-- Date: November 15, 2025
-- Priority: CRITICAL - Implement immediately
-- ============================================================================

USE sms;

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_VALUE_ON_ZERO';

START TRANSACTION;

-- ============================================================================
-- CATEGORY 1: LIBRARY MANAGEMENT (3 tables)
-- ============================================================================

-- 1.1 Library Books Inventory
CREATE TABLE IF NOT EXISTS library_books (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  isbn VARCHAR(20) UNIQUE,
  title VARCHAR(255) NOT NULL,
  authors VARCHAR(500),
  publisher VARCHAR(255),
  edition VARCHAR(50),
  publication_year YEAR,
  subject_category VARCHAR(100),
  language VARCHAR(50) DEFAULT 'English',
  total_copies INT UNSIGNED NOT NULL DEFAULT 1,
  available_copies INT UNSIGNED NOT NULL DEFAULT 1,
  shelf_location VARCHAR(50),
  price DECIMAL(10,2),
  acquired_date DATE,
  condition_status ENUM('new', 'good', 'fair', 'damaged', 'lost') DEFAULT 'good',
  is_reference_only BOOLEAN DEFAULT FALSE,
  book_image_url VARCHAR(500),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_isbn (isbn),
  INDEX idx_title (title),
  INDEX idx_category (subject_category),
  INDEX idx_available (available_copies),
  INDEX idx_deleted (deleted_at),
  
  CONSTRAINT chk_copies CHECK (available_copies <= total_copies)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Library book inventory management';

-- 1.2 Library Transactions (Issue/Return)
CREATE TABLE IF NOT EXISTS library_transactions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  book_id BIGINT UNSIGNED NOT NULL,
  borrower_type ENUM('student', 'teacher', 'staff') NOT NULL,
  borrower_id BIGINT UNSIGNED NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE NULL,
  fine_amount DECIMAL(8,2) DEFAULT 0,
  fine_paid BOOLEAN DEFAULT FALSE,
  fine_paid_date DATE NULL,
  renewed_count TINYINT UNSIGNED DEFAULT 0,
  max_renewals TINYINT UNSIGNED DEFAULT 2,
  status ENUM('issued', 'returned', 'overdue', 'lost', 'damaged') DEFAULT 'issued',
  issued_by BIGINT UNSIGNED NOT NULL,
  returned_to BIGINT UNSIGNED NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (book_id) REFERENCES library_books(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (issued_by) REFERENCES users(id) ON UPDATE CASCADE,
  FOREIGN KEY (returned_to) REFERENCES users(id) ON UPDATE CASCADE,
  
  INDEX idx_book_id (book_id),
  INDEX idx_borrower (borrower_type, borrower_id),
  INDEX idx_status (status),
  INDEX idx_due_date (due_date),
  INDEX idx_issue_date (issue_date),
  
  CONSTRAINT chk_return_date CHECK (return_date IS NULL OR return_date >= issue_date),
  CONSTRAINT chk_renewals CHECK (renewed_count <= max_renewals)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Library book issue and return tracking';

-- 1.3 Library Fine Rules
CREATE TABLE IF NOT EXISTS library_fine_rules (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  academic_year_id SMALLINT UNSIGNED NOT NULL,
  user_type ENUM('student', 'teacher', 'staff') NOT NULL,
  fine_per_day DECIMAL(6,2) NOT NULL,
  grace_period_days TINYINT UNSIGNED DEFAULT 0,
  max_fine_amount DECIMAL(8,2),
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,
  
  INDEX idx_user_type (user_type),
  INDEX idx_active (is_active),
  INDEX idx_effective_dates (effective_from, effective_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Library fine calculation rules';

-- ============================================================================
-- CATEGORY 2: ASSIGNMENT & HOMEWORK MANAGEMENT (2 tables)
-- ============================================================================

-- 2.1 Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  academic_year_id SMALLINT UNSIGNED NOT NULL,
  class_id BIGINT UNSIGNED NOT NULL,
  section_id INT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assignment_type ENUM('homework', 'project', 'practical', 'worksheet', 'online_quiz', 'presentation') NOT NULL,
  max_marks DECIMAL(6,2) DEFAULT 0,
  weightage_percentage DECIMAL(5,2) DEFAULT 0 COMMENT 'Contribution to final grade',
  assigned_date DATE NOT NULL,
  due_date DATE NOT NULL,
  allow_late_submission BOOLEAN DEFAULT FALSE,
  late_submission_penalty_percent DECIMAL(5,2) DEFAULT 0,
  attachment_url VARCHAR(500),
  instructions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT,
  
  INDEX idx_class_section (class_id, section_id),
  INDEX idx_subject (subject_id),
  INDEX idx_teacher (teacher_id),
  INDEX idx_due_date (due_date),
  INDEX idx_active (is_active),
  INDEX idx_deleted (deleted_at),
  
  CONSTRAINT chk_assignment_dates CHECK (due_date >= assigned_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Student assignments and homework';

-- 2.2 Assignment Submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  assignment_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submission_url VARCHAR(500),
  submission_text TEXT,
  submission_file_name VARCHAR(255),
  is_late BOOLEAN DEFAULT FALSE,
  marks_obtained DECIMAL(6,2) NULL,
  feedback TEXT,
  grade VARCHAR(5),
  status ENUM('pending', 'submitted', 'graded', 'resubmit_required', 'missing') DEFAULT 'pending',
  graded_by BIGINT UNSIGNED NULL,
  graded_at TIMESTAMP NULL,
  version INT UNSIGNED DEFAULT 1 COMMENT 'For resubmissions',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by) REFERENCES users(id) ON UPDATE CASCADE,
  
  UNIQUE KEY uk_assignment_student_version (assignment_id, student_id, version),
  INDEX idx_student (student_id),
  INDEX idx_status (status),
  INDEX idx_submission_date (submission_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Student assignment submissions and grading';

-- ============================================================================
-- CATEGORY 3: TIMETABLE MANAGEMENT (3 tables)
-- ============================================================================

-- 3.1 Timetable Periods/Slots
CREATE TABLE IF NOT EXISTS timetable_periods (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  academic_year_id SMALLINT UNSIGNED NOT NULL,
  period_number TINYINT UNSIGNED NOT NULL,
  period_name VARCHAR(50),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes TINYINT UNSIGNED,
  is_break BOOLEAN DEFAULT FALSE,
  break_type ENUM('short_break', 'lunch_break', 'assembly') NULL,
  display_order TINYINT UNSIGNED,
  is_active BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  
  UNIQUE KEY uk_year_period (academic_year_id, period_number),
  INDEX idx_active (is_active),
  
  CONSTRAINT chk_period_time CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Timetable period/slot configuration';

-- 3.2 Class Timetable (Day-wise Schedule)
CREATE TABLE IF NOT EXISTS class_timetable (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  academic_year_id SMALLINT UNSIGNED NOT NULL,
  class_id BIGINT UNSIGNED NOT NULL,
  section_id INT UNSIGNED NOT NULL,
  day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
  period_id INT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  teacher_id BIGINT UNSIGNED NOT NULL,
  room_number VARCHAR(50),
  is_practical BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE,
  effective_to DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (period_id) REFERENCES timetable_periods(id) ON DELETE RESTRICT,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT,
  
  UNIQUE KEY uk_class_day_period (class_id, section_id, day_of_week, period_id, is_active),
  INDEX idx_teacher (teacher_id, day_of_week, period_id),
  INDEX idx_subject (subject_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Class-wise timetable schedule';

-- 3.3 Timetable Substitutions
CREATE TABLE IF NOT EXISTS timetable_substitutions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  timetable_id BIGINT UNSIGNED NOT NULL,
  original_teacher_id BIGINT UNSIGNED NOT NULL,
  substitute_teacher_id BIGINT UNSIGNED NOT NULL,
  substitution_date DATE NOT NULL,
  reason TEXT,
  approved_by BIGINT UNSIGNED NOT NULL,
  approval_date DATE NOT NULL,
  status ENUM('pending', 'approved', 'completed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (timetable_id) REFERENCES class_timetable(id) ON DELETE CASCADE,
  FOREIGN KEY (original_teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT,
  FOREIGN KEY (substitute_teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE CASCADE,
  
  INDEX idx_date (substitution_date),
  INDEX idx_original_teacher (original_teacher_id, substitution_date),
  INDEX idx_substitute_teacher (substitute_teacher_id, substitution_date),
  INDEX idx_status (status),
  
  CONSTRAINT chk_different_teachers CHECK (original_teacher_id != substitute_teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Teacher substitution tracking';

-- ============================================================================
-- CATEGORY 4: FEE INSTALLMENTS & CONCESSIONS (3 tables)
-- ============================================================================

-- 4.1 Fee Installment Plans
CREATE TABLE IF NOT EXISTS fee_installments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_fee_id BIGINT UNSIGNED NOT NULL,
  installment_number TINYINT UNSIGNED NOT NULL,
  installment_name VARCHAR(100),
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  payment_date DATE NULL,
  late_fee DECIMAL(10,2) DEFAULT 0,
  status ENUM('pending', 'partial', 'paid', 'overdue', 'waived') DEFAULT 'pending',
  reminder_sent BOOLEAN DEFAULT FALSE,
  last_reminder_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (student_fee_id) REFERENCES student_fees(id) ON DELETE CASCADE,
  
  UNIQUE KEY uk_fee_installment (student_fee_id, installment_number),
  INDEX idx_due_date (due_date),
  INDEX idx_status (status),
  INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Fee installment payment tracking';

-- 4.2 Fee Concessions/Scholarships
CREATE TABLE IF NOT EXISTS fee_concessions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  academic_year_id SMALLINT UNSIGNED NOT NULL,
  concession_type ENUM('merit_scholarship', 'sports_quota', 'sibling_discount', 'staff_ward', 'economically_backward', 'need_based', 'government_scheme', 'other') NOT NULL,
  concession_name VARCHAR(100),
  concession_percentage DECIMAL(5,2),
  concession_amount DECIMAL(12,2),
  reason TEXT,
  approved_by BIGINT UNSIGNED NOT NULL,
  approved_date DATE NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  certificate_url VARCHAR(500),
  reference_number VARCHAR(50),
  status ENUM('active', 'expired', 'cancelled', 'revoked') DEFAULT 'active',
  revoked_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON UPDATE CASCADE,
  
  INDEX idx_student_year (student_id, academic_year_id),
  INDEX idx_type (concession_type),
  INDEX idx_status (status),
  INDEX idx_valid_dates (valid_from, valid_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Student fee concessions and scholarships';

-- 4.3 Fee Payment Reminders
CREATE TABLE IF NOT EXISTS fee_reminders (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_fee_id BIGINT UNSIGNED NOT NULL,
  installment_id BIGINT UNSIGNED NULL,
  reminder_type ENUM('sms', 'email', 'notification', 'call', 'letter') NOT NULL,
  sent_date DATE NOT NULL,
  sent_time TIME,
  due_amount DECIMAL(12,2),
  message_content TEXT,
  delivery_status ENUM('pending', 'sent', 'delivered', 'failed', 'bounced') DEFAULT 'sent',
  delivery_time TIMESTAMP NULL,
  error_message TEXT,
  cost DECIMAL(8,4) DEFAULT 0,
  sent_by BIGINT UNSIGNED NOT NULL,
  
  FOREIGN KEY (student_fee_id) REFERENCES student_fees(id) ON DELETE CASCADE,
  FOREIGN KEY (installment_id) REFERENCES fee_installments(id) ON DELETE SET NULL,
  FOREIGN KEY (sent_by) REFERENCES users(id) ON UPDATE CASCADE,
  
  INDEX idx_sent_date (sent_date),
  INDEX idx_student_fee (student_fee_id),
  INDEX idx_status (delivery_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Fee payment reminder tracking';

-- ============================================================================
-- CATEGORY 5: SECURITY & AUDIT (3 tables)
-- ============================================================================

-- 5.1 Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  action_type ENUM('create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'view', 'download', 'print') NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id BIGINT UNSIGNED NULL,
  old_values JSON,
  new_values JSON,
  description VARCHAR(500),
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  session_id VARCHAR(128),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_user_action (user_id, action_type),
  INDEX idx_timestamp (timestamp),
  INDEX idx_table_record (table_name, record_id),
  INDEX idx_action_type (action_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='System audit trail for all important operations';

-- 5.2 User Sessions (Enhanced)
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown',
  browser VARCHAR(50),
  login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  logout_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  auto_logout_at TIMESTAMP NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_user_active (user_id, is_active),
  INDEX idx_token (session_token),
  INDEX idx_last_activity (last_activity_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Active user session management';

-- 5.3 Permissions (RBAC Enhancement)
CREATE TABLE IF NOT EXISTS permissions (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  permission_name VARCHAR(100) UNIQUE NOT NULL,
  permission_slug VARCHAR(100) UNIQUE NOT NULL,
  permission_category VARCHAR(50),
  description VARCHAR(255),
  resource_type VARCHAR(50) COMMENT 'Table or module name',
  is_system BOOLEAN DEFAULT FALSE COMMENT 'System permissions cannot be deleted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (permission_category),
  INDEX idx_slug (permission_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='System permissions for RBAC';

-- 5.4 Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  role_id TINYINT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  can_create BOOLEAN DEFAULT FALSE,
  can_read BOOLEAN DEFAULT FALSE,
  can_update BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_export BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  
  UNIQUE KEY uk_role_permission (role_id, permission_id),
  INDEX idx_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Role-permission mapping for RBAC';

-- ============================================================================
-- CATEGORY 6: TRANSPORT MANAGEMENT (4 tables)
-- ============================================================================

-- 6.1 Transport Routes
CREATE TABLE IF NOT EXISTS transport_routes (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  route_code VARCHAR(20) UNIQUE NOT NULL,
  route_name VARCHAR(100) NOT NULL,
  route_description TEXT,
  total_distance_km DECIMAL(6,2),
  estimated_duration_minutes INT UNSIGNED,
  start_point VARCHAR(255),
  end_point VARCHAR(255),
  monthly_fee DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_code (route_code),
  INDEX idx_active (is_active),
  INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Transport route master';

-- 6.2 Transport Vehicles
CREATE TABLE IF NOT EXISTS transport_vehicles (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  vehicle_number VARCHAR(20) UNIQUE NOT NULL,
  vehicle_name VARCHAR(100),
  vehicle_type ENUM('bus', 'van', 'mini_bus', 'auto', 'car') NOT NULL,
  capacity INT UNSIGNED NOT NULL,
  registration_date DATE,
  insurance_expiry DATE,
  fitness_certificate_expiry DATE,
  pollution_certificate_expiry DATE,
  road_tax_expiry DATE,
  last_service_date DATE,
  next_service_date DATE,
  odometer_reading INT UNSIGNED,
  fuel_type ENUM('diesel', 'petrol', 'cng', 'electric') NOT NULL,
  driver_id BIGINT UNSIGNED NULL,
  conductor_id BIGINT UNSIGNED NULL,
  status ENUM('active', 'maintenance', 'inactive', 'retired') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (driver_id) REFERENCES staff(id) ON DELETE SET NULL,
  FOREIGN KEY (conductor_id) REFERENCES staff(id) ON DELETE SET NULL,
  
  INDEX idx_vehicle_number (vehicle_number),
  INDEX idx_status (status),
  INDEX idx_driver (driver_id),
  INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Transport vehicle fleet management';

-- 6.3 Transport Stops
CREATE TABLE IF NOT EXISTS transport_stops (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  route_id INT UNSIGNED NOT NULL,
  stop_name VARCHAR(100) NOT NULL,
  stop_order TINYINT UNSIGNED NOT NULL,
  pickup_time TIME,
  drop_time TIME,
  distance_from_school_km DECIMAL(6,2),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  landmark VARCHAR(255),
  stop_fee DECIMAL(10,2) COMMENT 'Stop-specific fee if different from route fee',
  is_active BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (route_id) REFERENCES transport_routes(id) ON DELETE CASCADE,
  
  UNIQUE KEY uk_route_order (route_id, stop_order),
  INDEX idx_route (route_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Transport route stops';

-- 6.4 Student Transport Assignment
CREATE TABLE IF NOT EXISTS student_transport (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  route_id INT UNSIGNED NOT NULL,
  stop_id INT UNSIGNED NOT NULL,
  vehicle_id INT UNSIGNED NULL,
  academic_year_id SMALLINT UNSIGNED NOT NULL,
  transport_fee DECIMAL(10,2),
  start_date DATE NOT NULL,
  end_date DATE NULL,
  shift ENUM('morning', 'evening', 'both') DEFAULT 'both',
  status ENUM('active', 'inactive', 'suspended', 'cancelled') DEFAULT 'active',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (route_id) REFERENCES transport_routes(id) ON DELETE RESTRICT,
  FOREIGN KEY (stop_id) REFERENCES transport_stops(id) ON DELETE RESTRICT,
  FOREIGN KEY (vehicle_id) REFERENCES transport_vehicles(id) ON DELETE SET NULL,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,
  
  INDEX idx_student (student_id),
  INDEX idx_route (route_id),
  INDEX idx_vehicle (vehicle_id),
  INDEX idx_status (status),
  INDEX idx_academic_year (academic_year_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Student transport allocation';

-- ============================================================================
-- INSERT DEFAULT/SAMPLE DATA
-- ============================================================================

-- Insert default library fine rules
INSERT IGNORE INTO library_fine_rules (academic_year_id, user_type, fine_per_day, grace_period_days, max_fine_amount, effective_from) VALUES
  (1, 'student', 2.00, 0, 200.00, '2025-04-01'),
  (1, 'teacher', 5.00, 2, 500.00, '2025-04-01'),
  (1, 'staff', 3.00, 1, 300.00, '2025-04-01');

-- Insert default timetable periods (example for 8 periods + breaks)
INSERT IGNORE INTO timetable_periods (academic_year_id, period_number, period_name, start_time, end_time, duration_minutes, is_break, display_order) VALUES
  (1, 1, 'Period 1', '08:00:00', '08:45:00', 45, FALSE, 1),
  (1, 2, 'Period 2', '08:45:00', '09:30:00', 45, FALSE, 2),
  (1, 3, 'Short Break', '09:30:00', '09:45:00', 15, TRUE, 3),
  (1, 4, 'Period 3', '09:45:00', '10:30:00', 45, FALSE, 4),
  (1, 5, 'Period 4', '10:30:00', '11:15:00', 45, FALSE, 5),
  (1, 6, 'Lunch Break', '11:15:00', '12:00:00', 45, TRUE, 6),
  (1, 7, 'Period 5', '12:00:00', '12:45:00', 45, FALSE, 7),
  (1, 8, 'Period 6', '12:45:00', '13:30:00', 45, FALSE, 8),
  (1, 9, 'Period 7', '13:30:00', '14:15:00', 45, FALSE, 9),
  (1, 10, 'Period 8', '14:15:00', '15:00:00', 45, FALSE, 10);

-- Insert basic permissions
INSERT IGNORE INTO permissions (permission_name, permission_slug, permission_category, description, resource_type) VALUES
  ('Manage Students', 'manage_students', 'Academic', 'Full access to student management', 'students'),
  ('View Students', 'view_students', 'Academic', 'View student information', 'students'),
  ('Manage Teachers', 'manage_teachers', 'Staff', 'Full access to teacher management', 'teachers'),
  ('Manage Fees', 'manage_fees', 'Finance', 'Full access to fee management', 'fees'),
  ('View Fees', 'view_fees', 'Finance', 'View fee information', 'fees'),
  ('Manage Library', 'manage_library', 'Library', 'Full access to library management', 'library'),
  ('Issue Books', 'issue_books', 'Library', 'Issue and return books', 'library'),
  ('Manage Transport', 'manage_transport', 'Transport', 'Full access to transport management', 'transport'),
  ('Manage Assignments', 'manage_assignments', 'Academic', 'Create and manage assignments', 'assignments'),
  ('Submit Assignments', 'submit_assignments', 'Academic', 'Submit assignments', 'assignments'),
  ('Manage Timetable', 'manage_timetable', 'Academic', 'Create and manage timetables', 'timetable'),
  ('View Timetable', 'view_timetable', 'Academic', 'View timetables', 'timetable'),
  ('View Audit Logs', 'view_audit_logs', 'Security', 'View system audit logs', 'audit_logs'),
  ('Manage Concessions', 'manage_concessions', 'Finance', 'Approve fee concessions', 'concessions');

-- Assign basic permissions to roles
INSERT IGNORE INTO role_permissions (role_id, permission_id, can_create, can_read, can_update, can_delete) VALUES
  -- Admin (role_id = 1) gets all permissions
  (1, 1, TRUE, TRUE, TRUE, TRUE),  -- Manage Students
  (1, 3, TRUE, TRUE, TRUE, TRUE),  -- Manage Teachers
  (1, 4, TRUE, TRUE, TRUE, TRUE),  -- Manage Fees
  (1, 6, TRUE, TRUE, TRUE, TRUE),  -- Manage Library
  (1, 8, TRUE, TRUE, TRUE, TRUE),  -- Manage Transport
  (1, 9, TRUE, TRUE, TRUE, TRUE),  -- Manage Assignments
  (1, 11, TRUE, TRUE, TRUE, TRUE), -- Manage Timetable
  (1, 13, FALSE, TRUE, FALSE, FALSE), -- View Audit Logs
  (1, 14, TRUE, TRUE, TRUE, TRUE), -- Manage Concessions
  
  -- Teacher (role_id = 4)
  (4, 2, FALSE, TRUE, FALSE, FALSE),  -- View Students
  (4, 9, TRUE, TRUE, TRUE, FALSE),    -- Manage Assignments
  (4, 12, FALSE, TRUE, FALSE, FALSE), -- View Timetable
  (4, 7, TRUE, TRUE, FALSE, FALSE),   -- Issue Books
  
  -- Library (role_id = 5)
  (5, 6, TRUE, TRUE, TRUE, FALSE),    -- Manage Library
  (5, 7, TRUE, TRUE, TRUE, FALSE),    -- Issue Books
  
  -- Accounts (role_id = 6)
  (6, 4, TRUE, TRUE, TRUE, FALSE),    -- Manage Fees
  (6, 14, TRUE, TRUE, TRUE, FALSE),   -- Manage Concessions
  
  -- Transport (role_id = 8)
  (8, 8, TRUE, TRUE, TRUE, FALSE);    -- Manage Transport

-- ============================================================================
-- CREATE USEFUL VIEWS
-- ============================================================================

-- View: Library books currently issued
CREATE OR REPLACE VIEW v_library_books_issued AS
SELECT 
  lb.id AS book_id,
  lb.isbn,
  lb.title,
  lb.authors,
  lt.id AS transaction_id,
  lt.borrower_type,
  lt.borrower_id,
  CASE 
    WHEN lt.borrower_type = 'student' THEN (SELECT CONCAT(p.first_name, ' ', p.last_name) FROM students s JOIN persons p ON p.id = s.person_id WHERE s.id = lt.borrower_id)
    WHEN lt.borrower_type = 'teacher' THEN (SELECT CONCAT(p.first_name, ' ', p.last_name) FROM teachers t JOIN persons p ON p.id = t.person_id WHERE t.id = lt.borrower_id)
    WHEN lt.borrower_type = 'staff' THEN (SELECT CONCAT(p.first_name, ' ', p.last_name) FROM staff s JOIN persons p ON p.id = s.person_id WHERE s.id = lt.borrower_id)
  END AS borrower_name,
  lt.issue_date,
  lt.due_date,
  DATEDIFF(CURDATE(), lt.due_date) AS days_overdue,
  lt.fine_amount,
  lt.status
FROM library_books lb
JOIN library_transactions lt ON lt.book_id = lb.id
WHERE lt.status IN ('issued', 'overdue');

-- View: Pending assignments by class
CREATE OR REPLACE VIEW v_pending_assignments AS
SELECT 
  a.id AS assignment_id,
  a.title,
  a.assignment_type,
  c.name AS class_name,
  sec.name AS section_name,
  sub.name AS subject_name,
  CONCAT(p.first_name, ' ', p.last_name) AS teacher_name,
  a.assigned_date,
  a.due_date,
  DATEDIFF(a.due_date, CURDATE()) AS days_remaining,
  COUNT(asub.id) AS total_submissions,
  (SELECT COUNT(*) FROM students s 
   WHERE s.class_id = a.class_id 
   AND s.section_id = a.section_id 
   AND s.deleted_at IS NULL) AS total_students
FROM assignments a
JOIN classes c ON c.id = a.class_id
JOIN sections sec ON sec.id = a.section_id
JOIN subjects sub ON sub.id = a.subject_id
JOIN teachers t ON t.id = a.teacher_id
JOIN persons p ON p.id = t.person_id
LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id
WHERE a.is_active = TRUE
  AND a.due_date >= CURDATE()
GROUP BY a.id;

-- View: Student transport details
CREATE OR REPLACE VIEW v_student_transport_details AS
SELECT 
  s.id AS student_id,
  s.roll_number,
  CONCAT(p.first_name, ' ', p.last_name) AS student_name,
  c.name AS class_name,
  sec.name AS section_name,
  tr.route_code,
  tr.route_name,
  ts.stop_name,
  ts.pickup_time,
  ts.drop_time,
  tv.vehicle_number,
  tv.vehicle_type,
  st.transport_fee,
  st.status
FROM student_transport st
JOIN students s ON s.id = st.student_id
JOIN persons p ON p.id = s.person_id
JOIN classes c ON c.id = s.class_id
JOIN sections sec ON sec.id = s.section_id
JOIN transport_routes tr ON tr.id = st.route_id
JOIN transport_stops ts ON ts.id = st.stop_id
LEFT JOIN transport_vehicles tv ON tv.id = st.vehicle_id
WHERE st.status = 'active'
  AND s.deleted_at IS NULL;

COMMIT;

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET SQL_MODE=@OLD_SQL_MODE;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 'Critical tables created successfully!' AS Status;

SELECT 'Library Tables' AS Category, COUNT(*) AS TableCount 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'sms' AND TABLE_NAME LIKE 'library_%';

SELECT 'Assignment Tables' AS Category, COUNT(*) AS TableCount 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'sms' AND TABLE_NAME LIKE 'assignment%';

SELECT 'Timetable Tables' AS Category, COUNT(*) AS TableCount 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'sms' AND TABLE_NAME LIKE 'timetable_%' OR TABLE_NAME LIKE 'class_timetable';

SELECT 'Fee Tables' AS Category, COUNT(*) AS TableCount 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'sms' AND TABLE_NAME LIKE 'fee_%';

SELECT 'Security Tables' AS Category, COUNT(*) AS TableCount 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'sms' AND TABLE_NAME IN ('audit_logs', 'user_sessions', 'permissions', 'role_permissions');

SELECT 'Transport Tables' AS Category, COUNT(*) AS TableCount 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'sms' AND TABLE_NAME LIKE 'transport_%' OR TABLE_NAME = 'student_transport';

-- ============================================================================
-- END OF MIGRATION SCRIPT
-- ============================================================================
