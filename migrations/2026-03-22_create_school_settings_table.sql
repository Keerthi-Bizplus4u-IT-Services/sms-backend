-- School settings per school (feature toggles)
CREATE TABLE IF NOT EXISTS school_settings (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
  transport_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  stock_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  hostel_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_settings_transport_enabled ON school_settings(transport_enabled);
CREATE INDEX IF NOT EXISTS idx_school_settings_stock_enabled ON school_settings(stock_enabled);
CREATE INDEX IF NOT EXISTS idx_school_settings_hostel_enabled ON school_settings(hostel_enabled);