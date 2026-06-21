-- Migration: Create student_certificates table
-- Tracks issued certificates (TC, Study & Conduct) with unique serial numbers
-- Date: 2026-03-23

CREATE TABLE IF NOT EXISTS student_certificates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  school_id INT UNSIGNED NOT NULL,
  exit_id BIGINT UNSIGNED NOT NULL,
  certificate_type ENUM('transfer_certificate', 'study_conduct_certificate') NOT NULL,
  certificate_number VARCHAR(50) NOT NULL COMMENT 'Auto-generated serial e.g. TC/2026/0001',
  issued_date DATE NOT NULL,
  issued_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_student_certs_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_certs_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_certs_exit FOREIGN KEY (exit_id) REFERENCES student_exits(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_certs_issued_by FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL,

  UNIQUE KEY uq_certificate_number (certificate_number),
  UNIQUE KEY uq_student_cert_type_exit (student_id, certificate_type, exit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for common queries
CREATE INDEX idx_student_certs_school ON student_certificates(school_id);
CREATE INDEX idx_student_certs_exit ON student_certificates(exit_id);
CREATE INDEX idx_student_certs_type ON student_certificates(certificate_type);
CREATE INDEX idx_student_certs_issued_date ON student_certificates(issued_date);
