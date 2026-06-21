-- Migration: School Groups for Multi-Tenant Group Boundary Enforcement
-- Date: 2026-03-22
-- Description: Adds school_groups and school_group_members tables so that
--              super-admin / management visibility can be constrained to a
--              defined set of schools rather than the entire instance.

-- 1. Create school_groups table
CREATE TABLE IF NOT EXISTS school_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_school_groups_active ON school_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_school_groups_deleted ON school_groups(deleted_at);

-- 2. Create school_group_members junction table
--    Links schools to groups. A school may belong to more than one group.
CREATE TABLE IF NOT EXISTS school_group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES school_groups(id) ON DELETE CASCADE,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_sgm_group_id ON school_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_sgm_school_id ON school_group_members(school_id);

-- 3. Add optional group_id to users table
--    When set, the user's cross-school visibility is constrained to schools
--    that belong to this group. NULL means instance-wide (legacy behaviour).
ALTER TABLE users ADD COLUMN IF NOT EXISTS group_id INTEGER NULL REFERENCES school_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_group_id ON users(group_id);
