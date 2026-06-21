-- Migration: Create student_exits table
-- Tracks formal student exit/withdrawal/transfer/graduation from a school
-- Date: 2026-03-23

CREATE TABLE IF NOT EXISTS student_exits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  school_id INT UNSIGNED NOT NULL,
  exit_date DATE NOT NULL,
  exit_type ENUM('transferred', 'graduated', 'withdrawn') NOT NULL,
  reason TEXT NULL,
  class_at_exit VARCHAR(50) NOT NULL COMMENT 'Snapshot of class name at time of exit',
  academic_year_at_exit VARCHAR(20) NOT NULL COMMENT 'Snapshot of academic year at time of exit',
  qualified_for_promotion BOOLEAN DEFAULT TRUE,
  fees_paid BOOLEAN DEFAULT TRUE COMMENT 'Whether all dues are cleared',
  conduct ENUM('excellent', 'very_good', 'good', 'satisfactory', 'needs_improvement') DEFAULT 'good',
  remarks TEXT NULL,
  issued_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_student_exits_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_exits_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_exits_issued_by FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL,

  UNIQUE KEY uq_student_exit (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for common queries
CREATE INDEX idx_student_exits_school ON student_exits(school_id);
CREATE INDEX idx_student_exits_exit_date ON student_exits(exit_date);
CREATE INDEX idx_student_exits_exit_type ON student_exits(exit_type);
