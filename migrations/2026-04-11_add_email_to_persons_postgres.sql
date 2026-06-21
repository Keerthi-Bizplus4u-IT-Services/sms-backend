-- Add email column to persons table (PostgreSQL)
ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_person_email ON persons (email);
