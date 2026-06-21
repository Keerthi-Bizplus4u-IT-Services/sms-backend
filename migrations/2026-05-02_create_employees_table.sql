-- Create employees table for PostgreSQL
-- Replaces the legacy MySQL `admin` table for employee management

CREATE TABLE IF NOT EXISTS employees (
  id          BIGSERIAL PRIMARY KEY,
  school_id   INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  fname       VARCHAR(100) NOT NULL,
  lname       VARCHAR(100),
  gender      SMALLINT,        -- 0 = male, 1 = female, 2 = other
  dob         DATE,
  phone       VARCHAR(20),
  email       VARCHAR(255),
  address     TEXT,
  ephoto      VARCHAR(500),
  aadhar_url  VARCHAR(500),
  pan_url     VARCHAR(500),
  designation VARCHAR(100),
  salary      NUMERIC(10, 2),
  joiningdate DATE,
  usertype    SMALLINT DEFAULT 1,
  bank_name               VARCHAR(100),
  bank_account_number     VARCHAR(50),
  bank_ifsc_code          VARCHAR(20),
  bank_account_holder_name VARCHAR(100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_employees_school_id  ON employees (school_id);
CREATE INDEX IF NOT EXISTS idx_employees_fname      ON employees (fname);
CREATE INDEX IF NOT EXISTS idx_employees_phone      ON employees (phone);
CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON employees (deleted_at);
