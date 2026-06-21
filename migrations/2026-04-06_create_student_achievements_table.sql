-- ============================================================================
-- CREATE STUDENT ACHIEVEMENTS TABLE
-- ============================================================================
-- Purpose: Track student achievements (awards, certificates, competitions)
-- Date: April 6, 2026
-- ============================================================================

-- PostgreSQL version
CREATE TABLE IF NOT EXISTS student_achievements (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  achievement_type VARCHAR(50) NOT NULL DEFAULT 'award',
  category VARCHAR(100),
  awarded_date DATE NOT NULL,
  awarded_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id ON student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_school_id ON student_achievements(school_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_type ON student_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_student_achievements_awarded_date ON student_achievements(awarded_date);
