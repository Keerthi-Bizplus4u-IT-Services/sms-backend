-- Link fee structures to configured fee terms for term-wise fee mapping
ALTER TABLE IF EXISTS fee_structures
  ADD COLUMN IF NOT EXISTS fee_term_id INTEGER REFERENCES fee_terms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fee_structures_fee_term_id ON fee_structures(fee_term_id);
