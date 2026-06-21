-- ============================================================================
-- LIBRARY MODULE EXPANSION — Physical Book Inventory, Lending & Fines
-- ============================================================================
-- Purpose: Add per-copy tracking, tiered fine rules, lending settings
-- Date: April 1, 2026
-- Depends on: 2026-04-01_create_library_tables.sql
-- ============================================================================

-- 1. Extend library_books with book_type and digital_url
ALTER TABLE library_books
  ADD COLUMN IF NOT EXISTS book_type VARCHAR(20) NOT NULL DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS digital_url VARCHAR(500) NULL;

-- Add constraint for book_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'chk_book_type'
  ) THEN
    ALTER TABLE library_books
      ADD CONSTRAINT chk_book_type CHECK (book_type IN ('physical', 'digital', 'both'));
  END IF;
END $$;

-- 2. Per-copy tracking table
CREATE TABLE IF NOT EXISTS library_book_copies (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  accession_number VARCHAR(50) NOT NULL,
  barcode VARCHAR(100),
  copy_number INTEGER NOT NULL DEFAULT 1,
  purchase_date DATE,
  purchase_price NUMERIC(10,2),
  vendor VARCHAR(255),
  condition_status VARCHAR(20) NOT NULL DEFAULT 'new',
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  current_borrower_type VARCHAR(20) NULL,
  current_borrower_id INTEGER NULL,
  shelf_location VARCHAR(50),
  remarks TEXT,
  school_id INTEGER REFERENCES schools(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_accession_number UNIQUE (accession_number),
  CONSTRAINT uq_barcode UNIQUE (barcode),
  CONSTRAINT chk_copy_condition CHECK (condition_status IN ('new','good','fair','damaged','lost')),
  CONSTRAINT chk_copy_borrower_type CHECK (current_borrower_type IS NULL OR current_borrower_type IN ('student','teacher','staff'))
);

CREATE INDEX IF NOT EXISTS idx_book_copies_book_id ON library_book_copies(book_id);
CREATE INDEX IF NOT EXISTS idx_book_copies_accession ON library_book_copies(accession_number);
CREATE INDEX IF NOT EXISTS idx_book_copies_barcode ON library_book_copies(barcode);
CREATE INDEX IF NOT EXISTS idx_book_copies_available ON library_book_copies(is_available);
CREATE INDEX IF NOT EXISTS idx_book_copies_school_id ON library_book_copies(school_id);

-- 3. Add copy_id to library_transactions for per-copy tracking
ALTER TABLE library_transactions
  ADD COLUMN IF NOT EXISTS copy_id INTEGER NULL REFERENCES library_book_copies(id);

CREATE INDEX IF NOT EXISTS idx_library_transactions_copy_id ON library_transactions(copy_id);

-- 4. Tiered fine rules (PostgreSQL version)
CREATE TABLE IF NOT EXISTS library_fine_rules (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  borrower_type VARCHAR(20) NOT NULL,
  tier_start_day INTEGER NOT NULL DEFAULT 1,
  tier_end_day INTEGER NULL,
  fine_per_day NUMERIC(6,2) NOT NULL,
  grace_period_days SMALLINT NOT NULL DEFAULT 0,
  max_fine_amount NUMERIC(8,2) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_fine_borrower_type CHECK (borrower_type IN ('student','teacher','staff')),
  CONSTRAINT chk_tier_range CHECK (tier_end_day IS NULL OR tier_end_day >= tier_start_day)
);

CREATE INDEX IF NOT EXISTS idx_fine_rules_school ON library_fine_rules(school_id);
CREATE INDEX IF NOT EXISTS idx_fine_rules_borrower ON library_fine_rules(borrower_type);
CREATE INDEX IF NOT EXISTS idx_fine_rules_active ON library_fine_rules(is_active);

-- 5. Library lending settings per role
CREATE TABLE IF NOT EXISTS library_settings (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id),
  borrower_type VARCHAR(20) NOT NULL,
  max_books_allowed INTEGER NOT NULL DEFAULT 3,
  default_issue_days INTEGER NOT NULL DEFAULT 14,
  max_renewals SMALLINT NOT NULL DEFAULT 2,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_library_settings UNIQUE (school_id, borrower_type),
  CONSTRAINT chk_settings_borrower_type CHECK (borrower_type IN ('student','teacher','staff'))
);

-- 6. Accession number sequence
CREATE SEQUENCE IF NOT EXISTS library_accession_seq START WITH 1 INCREMENT BY 1;
