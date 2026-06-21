-- Make apar_id nullable in students table
ALTER TABLE students ALTER COLUMN apar_id DROP NOT NULL;
