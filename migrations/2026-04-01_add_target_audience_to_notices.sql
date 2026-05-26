-- Migration: Add target_audience column to notices table
-- Purpose: Enable broadcast targeting (all, teachers, parents, students, specific class)
-- Date: 2026-04-01

-- PostgreSQL
ALTER TABLE notices
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(50) NOT NULL DEFAULT 'all';

-- Add index for filtering by audience
CREATE INDEX IF NOT EXISTS idx_notices_target_audience ON notices (target_audience);

-- Valid values: 'all', 'teachers', 'parents', 'students', 'staff', or a class name like 'class-5'
COMMENT ON COLUMN notices.target_audience IS 'Target audience for notice broadcast: all, teachers, parents, students, staff, or class-specific';
