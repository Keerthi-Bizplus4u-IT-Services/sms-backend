-- Ensure users.school_id exists in PostgreSQL environments.
-- This migration is idempotent and safe to run multiple times.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS school_id BIGINT NULL;

CREATE INDEX IF NOT EXISTS idx_users_school_id ON users (school_id);
