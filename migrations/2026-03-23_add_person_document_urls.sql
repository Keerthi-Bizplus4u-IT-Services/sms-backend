-- Add person document URL fields for teacher/staff identity uploads.
-- Idempotent migration for PostgreSQL environments.

ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS aadhar_url VARCHAR(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pan_url VARCHAR(500) DEFAULT NULL;