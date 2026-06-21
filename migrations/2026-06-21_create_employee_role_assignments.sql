-- Migration: Create employee_role_assignments table
-- Date: 2026-06-21
-- Description: Allows mapping employees to functional roles such as
--              librarian, principal, school_admin, accountant, hostel_incharge, etc.

CREATE TABLE IF NOT EXISTS employee_role_assignments (
  id          BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  school_id   INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  role_name   VARCHAR(50) NOT NULL,
  assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_employee_role UNIQUE (employee_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_era_employee_id ON employee_role_assignments (employee_id);
CREATE INDEX IF NOT EXISTS idx_era_school_id   ON employee_role_assignments (school_id);
CREATE INDEX IF NOT EXISTS idx_era_role_name   ON employee_role_assignments (role_name);
