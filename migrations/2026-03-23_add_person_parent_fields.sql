-- Migration: Add parent/guardian and demographic fields to persons table
-- Required for Indian schooling certificates (TC, Study & Conduct Certificate)
-- Date: 2026-03-23

-- Add father_name column
ALTER TABLE persons ADD COLUMN IF NOT EXISTS father_name VARCHAR(100) NULL AFTER pan_url;

-- Add mother_name column
ALTER TABLE persons ADD COLUMN IF NOT EXISTS mother_name VARCHAR(100) NULL AFTER father_name;

-- Add guardian_name column
ALTER TABLE persons ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(100) NULL AFTER mother_name;

-- Add nationality column with default 'Indian'
ALTER TABLE persons ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) DEFAULT 'Indian' AFTER guardian_name;

-- Add caste column
ALTER TABLE persons ADD COLUMN IF NOT EXISTS caste VARCHAR(50) NULL AFTER nationality;

-- Add category column (reservation category)
ALTER TABLE persons ADD COLUMN IF NOT EXISTS category ENUM('general', 'obc', 'sc', 'st', 'ews') NULL AFTER caste;
