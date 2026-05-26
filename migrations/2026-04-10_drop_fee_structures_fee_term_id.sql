-- Drop the fee_term_id column from fee_structures
-- This column incorrectly linked a fee structure row to a single fee term.
-- Fee structures already contain term-wise breakdowns (term_1, term_2, term_3).
-- Fee terms define time periods independently and relate via academic_year_id.

DROP INDEX IF EXISTS idx_fee_structures_fee_term_id;

ALTER TABLE fee_structures
  DROP COLUMN IF EXISTS fee_term_id;
