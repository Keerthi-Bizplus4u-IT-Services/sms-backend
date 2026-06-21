-- Transport vehicle staff assignment history (effective-dated)
-- Supports changing driver/conductor on specific dates.

CREATE TABLE IF NOT EXISTS transport_vehicle_staff_assignments (
  id BIGSERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL,
  vehicle_id BIGINT NOT NULL,
  driver_id BIGINT NULL,
  conductor_id BIGINT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  CONSTRAINT fk_tvsa_vehicle FOREIGN KEY (vehicle_id) REFERENCES transport_vehicles(id) ON DELETE CASCADE,
  CONSTRAINT chk_tvsa_date_range CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tvsa_vehicle_effective_from
  ON transport_vehicle_staff_assignments(vehicle_id, effective_from)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tvsa_vehicle_date
  ON transport_vehicle_staff_assignments(vehicle_id, effective_from, effective_to)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tvsa_school
  ON transport_vehicle_staff_assignments(school_id)
  WHERE deleted_at IS NULL;
