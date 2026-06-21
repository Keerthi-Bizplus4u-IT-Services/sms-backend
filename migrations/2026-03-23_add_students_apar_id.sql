-- Add APAR identifier to students table.
-- Idempotent migration for PostgreSQL environments.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS apar_id VARCHAR(50);

-- Backfill with admission number if available to allow NOT NULL/UNIQUE enforcement.
UPDATE students
SET apar_id = admission_number
WHERE apar_id IS NULL AND admission_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_apar_id ON students (apar_id);