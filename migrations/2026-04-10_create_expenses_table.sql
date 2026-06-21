-- Create expenses table for PostgreSQL environments.
-- This replaces the dropped legacy MySQL `expense` table with a
-- multi-school compatible structure used by v1 expense APIs.

CREATE TABLE IF NOT EXISTS expenses (
  exid BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  idno VARCHAR(100),
  exptype VARCHAR(50) NOT NULL,
  invoiceno VARCHAR(100),
  amount NUMERIC(12, 2) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  date DATE,
  purpose VARCHAR(255),
  school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
  branch_id BIGINT REFERENCES school_branches(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_school_id ON expenses(school_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_exptype ON expenses(exptype);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
