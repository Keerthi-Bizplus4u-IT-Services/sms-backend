-- Migration: Add father/mother phone and email columns to persons table
-- Date: 2026-04-06

ALTER TABLE persons ADD COLUMN IF NOT EXISTS father_phone VARCHAR(20) NULL;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS mother_phone VARCHAR(20) NULL;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS father_email VARCHAR(255) NULL;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS mother_email VARCHAR(255) NULL;
