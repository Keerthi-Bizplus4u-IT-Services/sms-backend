-- Ensure academic_years.school_id exists in PostgreSQL environments.
-- This migration is idempotent and safe to run multiple times.

ALTER TABLE academic_years
  ADD COLUMN IF NOT EXISTS school_id INTEGER;

-- Backfill existing rows to the first available school where needed.
UPDATE academic_years
SET school_id = (
  SELECT id
  FROM schools
  ORDER BY id
  LIMIT 1
)
WHERE school_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_academic_years_school_id ON academic_years (school_id);

DO $$
BEGIN
  -- Enforce NOT NULL only after backfill has succeeded.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'academic_years'
      AND column_name = 'school_id'
      AND is_nullable = 'YES'
  ) AND NOT EXISTS (
    SELECT 1
    FROM academic_years
    WHERE school_id IS NULL
  ) THEN
    ALTER TABLE academic_years
      ALTER COLUMN school_id SET NOT NULL;
  END IF;

  -- Add FK only once.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_academic_years_school'
  ) THEN
    ALTER TABLE academic_years
      ADD CONSTRAINT fk_academic_years_school
      FOREIGN KEY (school_id)
      REFERENCES schools(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;