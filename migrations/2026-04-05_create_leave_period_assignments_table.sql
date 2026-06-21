-- Migration: Create leave_period_assignments table
-- Purpose: Track period-level teacher substitution/subject reallocation for leave requests
-- Date: 2026-04-05

CREATE TABLE IF NOT EXISTS leave_period_assignments (
  id BIGSERIAL PRIMARY KEY,
  leave_request_id BIGINT NOT NULL,
  school_id INTEGER NOT NULL,
  timetable_id BIGINT NOT NULL,
  assignment_date DATE NOT NULL,
  class_id BIGINT NOT NULL,
  section_id BIGINT NOT NULL,
  period_id INTEGER NOT NULL,
  original_teacher_id BIGINT NOT NULL,
  substitute_teacher_id BIGINT NULL,
  substitute_subject_id BIGINT NULL,
  assignment_type VARCHAR(32) NOT NULL DEFAULT 'teacher_substitution',
  notes VARCHAR(255) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'planned',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE NULL,

  CONSTRAINT fk_lpa_leave_request FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_lpa_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  CONSTRAINT fk_lpa_timetable FOREIGN KEY (timetable_id) REFERENCES class_timetable(id) ON DELETE CASCADE,
  CONSTRAINT fk_lpa_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_lpa_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_lpa_period FOREIGN KEY (period_id) REFERENCES timetable_periods(id) ON DELETE CASCADE,
  CONSTRAINT fk_lpa_original_teacher FOREIGN KEY (original_teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  CONSTRAINT fk_lpa_substitute_teacher FOREIGN KEY (substitute_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  CONSTRAINT fk_lpa_substitute_subject FOREIGN KEY (substitute_subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  CONSTRAINT chk_lpa_assignment_type CHECK (assignment_type IN ('teacher_substitution', 'subject_reallocation')),
  CONSTRAINT chk_lpa_status CHECK (status IN ('planned', 'confirmed', 'cancelled')),
  CONSTRAINT chk_lpa_substitute_presence CHECK (substitute_teacher_id IS NOT NULL OR substitute_subject_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lpa_slot_date_leave
  ON leave_period_assignments (leave_request_id, timetable_id, assignment_date);

CREATE INDEX IF NOT EXISTS idx_lpa_school_date
  ON leave_period_assignments (school_id, assignment_date);

CREATE INDEX IF NOT EXISTS idx_lpa_original_teacher
  ON leave_period_assignments (original_teacher_id, assignment_date);

CREATE INDEX IF NOT EXISTS idx_lpa_substitute_teacher
  ON leave_period_assignments (substitute_teacher_id, assignment_date);

CREATE INDEX IF NOT EXISTS idx_lpa_status
  ON leave_period_assignments (status);
