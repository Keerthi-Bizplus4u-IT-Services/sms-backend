-- PostgreSQL transport schema bootstrap (idempotent)
-- Creates normalized transport tables required by /api/v1/transport endpoints.

CREATE TABLE IF NOT EXISTS transport_routes (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL,
  route_code VARCHAR(50) NOT NULL,
  route_name VARCHAR(150) NOT NULL,
  route_description TEXT,
  total_distance_km NUMERIC(8, 2),
  estimated_duration_minutes INTEGER,
  start_point VARCHAR(150),
  end_point VARCHAR(150),
  monthly_fee NUMERIC(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

ALTER TABLE transport_routes
  ADD COLUMN IF NOT EXISTS school_id INTEGER,
  ADD COLUMN IF NOT EXISTS route_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS route_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS route_description TEXT,
  ADD COLUMN IF NOT EXISTS total_distance_km NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS start_point VARCHAR(150),
  ADD COLUMN IF NOT EXISTS end_point VARCHAR(150),
  ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_transport_routes_school_route_code
  ON transport_routes (school_id, route_code);
CREATE INDEX IF NOT EXISTS idx_transport_routes_school_deleted
  ON transport_routes (school_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_routes_active
  ON transport_routes (school_id, is_active);

CREATE TABLE IF NOT EXISTS transport_vehicles (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL,
  vehicle_number VARCHAR(50) NOT NULL,
  vehicle_name VARCHAR(100),
  vehicle_type VARCHAR(30) NOT NULL DEFAULT 'bus',
  capacity INTEGER NOT NULL DEFAULT 40,
  registration_date DATE,
  insurance_expiry DATE,
  fitness_certificate_expiry DATE,
  pollution_certificate_expiry DATE,
  road_tax_expiry DATE,
  last_service_date DATE,
  next_service_date DATE,
  odometer_reading INTEGER,
  fuel_type VARCHAR(20) NOT NULL DEFAULT 'diesel',
  driver_id BIGINT,
  conductor_id BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

ALTER TABLE transport_vehicles
  ADD COLUMN IF NOT EXISTS school_id INTEGER,
  ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS vehicle_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(30) NOT NULL DEFAULT 'bus',
  ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS registration_date DATE,
  ADD COLUMN IF NOT EXISTS insurance_expiry DATE,
  ADD COLUMN IF NOT EXISTS fitness_certificate_expiry DATE,
  ADD COLUMN IF NOT EXISTS pollution_certificate_expiry DATE,
  ADD COLUMN IF NOT EXISTS road_tax_expiry DATE,
  ADD COLUMN IF NOT EXISTS last_service_date DATE,
  ADD COLUMN IF NOT EXISTS next_service_date DATE,
  ADD COLUMN IF NOT EXISTS odometer_reading INTEGER,
  ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(20) NOT NULL DEFAULT 'diesel',
  ADD COLUMN IF NOT EXISTS driver_id BIGINT,
  ADD COLUMN IF NOT EXISTS conductor_id BIGINT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_transport_vehicles_school_vehicle_number
  ON transport_vehicles (school_id, vehicle_number);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_school_deleted
  ON transport_vehicles (school_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_status
  ON transport_vehicles (school_id, status);

CREATE TABLE IF NOT EXISTS transport_stops (
  id SERIAL PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  stop_name VARCHAR(150) NOT NULL,
  stop_order INTEGER NOT NULL DEFAULT 1,
  pickup_time TIME,
  drop_time TIME,
  distance_from_school_km NUMERIC(8, 2),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  landmark VARCHAR(255),
  stop_fee NUMERIC(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE transport_stops
  ADD COLUMN IF NOT EXISTS route_id INTEGER,
  ADD COLUMN IF NOT EXISTS stop_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS stop_order INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pickup_time TIME,
  ADD COLUMN IF NOT EXISTS drop_time TIME,
  ADD COLUMN IF NOT EXISTS distance_from_school_km NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS landmark VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stop_fee NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_transport_stops_route_order
  ON transport_stops (route_id, stop_order);
CREATE INDEX IF NOT EXISTS idx_transport_stops_active
  ON transport_stops (route_id, is_active);

CREATE TABLE IF NOT EXISTS student_transport (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL,
  student_id BIGINT NOT NULL,
  route_id INTEGER NOT NULL REFERENCES transport_routes(id) ON DELETE RESTRICT,
  stop_id INTEGER NOT NULL REFERENCES transport_stops(id) ON DELETE RESTRICT,
  vehicle_id INTEGER REFERENCES transport_vehicles(id) ON DELETE SET NULL,
  academic_year_id INTEGER NOT NULL,
  transport_fee NUMERIC(10, 2),
  start_date DATE NOT NULL,
  end_date DATE,
  shift VARCHAR(20) NOT NULL DEFAULT 'both',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  remarks TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE student_transport
  ADD COLUMN IF NOT EXISTS school_id INTEGER,
  ADD COLUMN IF NOT EXISTS student_id BIGINT,
  ADD COLUMN IF NOT EXISTS route_id INTEGER,
  ADD COLUMN IF NOT EXISTS stop_id INTEGER,
  ADD COLUMN IF NOT EXISTS vehicle_id INTEGER,
  ADD COLUMN IF NOT EXISTS academic_year_id INTEGER,
  ADD COLUMN IF NOT EXISTS transport_fee NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS shift VARCHAR(20) NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_student_transport_school_year_status
  ON student_transport (school_id, academic_year_id, status);
CREATE INDEX IF NOT EXISTS idx_student_transport_student
  ON student_transport (student_id);
CREATE INDEX IF NOT EXISTS idx_student_transport_route_stop
  ON student_transport (route_id, stop_id);
