-- Library system tables for PostgreSQL

-- Main book inventory table
CREATE TABLE IF NOT EXISTS library_books (
  id SERIAL PRIMARY KEY,
  isbn VARCHAR(20),
  title VARCHAR(255) NOT NULL,
  authors VARCHAR(500),
  publisher VARCHAR(255),
  edition VARCHAR(50),
  publication_year INTEGER,
  category VARCHAR(100),
  language VARCHAR(50) DEFAULT 'English',
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  shelf_location VARCHAR(50),
  price NUMERIC(10,2),
  acquired_date DATE,
  condition_status VARCHAR(20) DEFAULT 'good',
  is_reference_only BOOLEAN DEFAULT FALSE,
  book_image_url VARCHAR(500),
  description TEXT,
  school_id INTEGER REFERENCES schools(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  CONSTRAINT chk_copies CHECK (available_copies <= total_copies),
  CONSTRAINT chk_condition CHECK (condition_status IN ('new','good','fair','damaged','lost'))
);

CREATE INDEX IF NOT EXISTS idx_library_books_category ON library_books(category);
CREATE INDEX IF NOT EXISTS idx_library_books_school_id ON library_books(school_id);
CREATE INDEX IF NOT EXISTS idx_library_books_isbn ON library_books(isbn);
CREATE INDEX IF NOT EXISTS idx_library_books_title ON library_books(title);
CREATE INDEX IF NOT EXISTS idx_library_books_deleted_at ON library_books(deleted_at);

-- Book issue/return transactions
CREATE TABLE IF NOT EXISTS library_transactions (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES library_books(id),
  borrower_type VARCHAR(20) NOT NULL,
  borrower_id INTEGER NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE NULL,
  fine_amount NUMERIC(8,2) DEFAULT 0,
  fine_paid BOOLEAN DEFAULT FALSE,
  fine_paid_date DATE NULL,
  renewed_count SMALLINT DEFAULT 0,
  max_renewals SMALLINT DEFAULT 2,
  status VARCHAR(20) DEFAULT 'issued',
  issued_by INTEGER NOT NULL REFERENCES users(id),
  returned_to INTEGER NULL REFERENCES users(id),
  remarks TEXT,
  school_id INTEGER REFERENCES schools(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_borrower_type CHECK (borrower_type IN ('student','teacher','staff')),
  CONSTRAINT chk_txn_status CHECK (status IN ('issued','returned','overdue','lost','damaged'))
);

CREATE INDEX IF NOT EXISTS idx_library_transactions_book_id ON library_transactions(book_id);
CREATE INDEX IF NOT EXISTS idx_library_transactions_status ON library_transactions(status);
CREATE INDEX IF NOT EXISTS idx_library_transactions_borrower ON library_transactions(borrower_type, borrower_id);
CREATE INDEX IF NOT EXISTS idx_library_transactions_school_id ON library_transactions(school_id);
CREATE INDEX IF NOT EXISTS idx_library_transactions_due_date ON library_transactions(due_date);
