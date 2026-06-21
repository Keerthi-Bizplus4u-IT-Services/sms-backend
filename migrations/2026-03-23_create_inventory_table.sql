-- Inventory table for tracking school items (supplies, equipment, furniture, etc.)
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'pcs',
  unit_price NUMERIC(12, 2) DEFAULT 0,
  supplier VARCHAR(255),
  location VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  purchase_date DATE,
  notes TEXT,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  branch_id INTEGER REFERENCES school_branches(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_school_id ON inventory(school_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch_id ON inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
