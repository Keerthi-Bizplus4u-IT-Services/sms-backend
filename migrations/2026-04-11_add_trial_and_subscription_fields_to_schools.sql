-- Migration: Add trial and subscription fields to schools table
-- Date: 2026-04-11
-- Description: Adds trial tracking, subscription plan, and resource limit fields for free trial signup

-- =====================================================
-- 1. Add subscription & trial fields to schools table
-- =====================================================

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS max_students INTEGER NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS max_staff INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_classes INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_branches INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT TRUE;

-- =====================================================
-- 2. Add CHECK constraint for subscription_plan values
-- =====================================================

-- Postgres supports CHECK constraints natively
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_schools_subscription_plan'
  ) THEN
    ALTER TABLE schools
      ADD CONSTRAINT chk_schools_subscription_plan
      CHECK (subscription_plan IN ('free', 'basic', 'premium', 'enterprise'));
  END IF;
END $$;

-- =====================================================
-- 3. Index for querying trial schools
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_schools_is_trial ON schools(is_trial);
CREATE INDEX IF NOT EXISTS idx_schools_subscription_plan ON schools(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_schools_trial_ends_at ON schools(trial_ends_at);

-- =====================================================
-- 4. Update existing schools to 'basic' plan (non-trial)
-- =====================================================

UPDATE schools
  SET subscription_plan = 'basic',
      is_trial = FALSE,
      max_students = 500,
      max_staff = 50,
      max_classes = 100,
      max_branches = 10
  WHERE subscription_plan = 'free'
    AND trial_started_at IS NULL;
