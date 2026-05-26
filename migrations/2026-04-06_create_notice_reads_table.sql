-- Migration: Create notice_reads table for tracking read/unread notices
-- Date: 2026-04-06

CREATE TABLE IF NOT EXISTS notice_reads (
  id SERIAL PRIMARY KEY,
  notice_id INTEGER NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (notice_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notice_reads_user_id ON notice_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notice_reads_notice_id ON notice_reads(notice_id);
