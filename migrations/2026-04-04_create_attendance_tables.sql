-- Migration: Create attendance tables for PostgreSQL
-- attendance_sessions: stores each attendance session (per class/section/date/period)
-- attendance_records: stores each student's attendance status per session

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id BIGINT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  session_hour_id BIGINT REFERENCES session_hours(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (class_id, section_id, session_hour_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_att_sess_class_section_date ON attendance_sessions(class_id, section_id, session_date);
CREATE INDEX IF NOT EXISTS idx_att_sess_school ON attendance_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_att_sess_date ON attendance_sessions(session_date);

CREATE TABLE IF NOT EXISTS attendance_records (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(10) NOT NULL CHECK (status IN ('P', 'A', 'L')),
  remarks VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_att_rec_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_att_rec_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_att_rec_status ON attendance_records(status);
