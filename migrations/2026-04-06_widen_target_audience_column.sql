-- Migration: Widen target_audience column to support multi-select (comma-separated values)
-- New valid values: all, teachers, parents, students, staff, transport, librarian, drivers, non_teaching_staff

ALTER TABLE notices ALTER COLUMN target_audience TYPE VARCHAR(255);

-- Also update events table if it has the column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'target_audience'
  ) THEN
    ALTER TABLE events ALTER COLUMN target_audience TYPE VARCHAR(255);
  END IF;
END $$;

COMMENT ON COLUMN notices.target_audience IS
  'Comma-separated target audiences: all, teachers, parents, students, staff, transport, librarian, drivers, non_teaching_staff';
