-- PostgreSQL-safe migration for parent/guardian and demographic person fields.
-- The earlier migration file uses MySQL-specific syntax (AFTER, ENUM) and
-- does not run on PostgreSQL.

ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS father_name VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS mother_name VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) NULL DEFAULT 'Indian',
  ADD COLUMN IF NOT EXISTS caste VARCHAR(50) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'enum_persons_category'
  ) THEN
    CREATE TYPE enum_persons_category AS ENUM ('general', 'obc', 'sc', 'st', 'ews');
  END IF;
END $$;

ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS category enum_persons_category NULL;
