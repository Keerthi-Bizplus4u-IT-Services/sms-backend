-- Enforce only one is_current=true per school at the database level.
-- This prevents the scenario where multiple academic years are marked current
-- or no current year is set (detectable via the startup log warning in app.js).

CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_one_current_per_school
  ON academic_years (school_id)
  WHERE is_current = true;
