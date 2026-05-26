-- Term-wise fee configuration for private school fee cycles
CREATE TABLE IF NOT EXISTS fee_terms (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  due_date DATE NOT NULL,
  late_fee_per_day DECIMAL(10,2) NOT NULL DEFAULT 0,
  late_fee_max DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fee_terms_dates_check CHECK (end_date >= start_date),
  CONSTRAINT fee_terms_due_date_check CHECK (due_date >= start_date AND due_date <= end_date),
  CONSTRAINT uq_fee_terms_name_per_year UNIQUE (school_id, academic_year_id, name)
);

CREATE INDEX IF NOT EXISTS idx_fee_terms_school_year ON fee_terms(school_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_fee_terms_sort_order ON fee_terms(academic_year_id, sort_order);
