-- ============================================================================
-- Transport Module: Ensure Normalized Schema + Multi-Tenancy Support
-- Date: 2026-04-03
-- Description: 
--   1. Adds school_id to transport_routes and transport_vehicles for multi-tenancy
--   2. Migrates data from legacy 'transport' table into normalized tables
--   3. Does NOT drop legacy table (kept for rollback safety)
-- ============================================================================

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS=0;

-- -------------------------------------------------------
-- 1. Add school_id to transport_routes if missing
-- -------------------------------------------------------
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'transport_routes'
    AND COLUMN_NAME = 'school_id'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE transport_routes ADD COLUMN school_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD INDEX idx_school (school_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- -------------------------------------------------------
-- 2. Add school_id to transport_vehicles if missing
-- -------------------------------------------------------
SET @col_exists2 = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'transport_vehicles'
    AND COLUMN_NAME = 'school_id'
);

SET @sql2 = IF(@col_exists2 = 0,
  'ALTER TABLE transport_vehicles ADD COLUMN school_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD INDEX idx_school (school_id)',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- -------------------------------------------------------
-- 3. Add school_id to student_transport if missing
-- -------------------------------------------------------
SET @col_exists3 = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'student_transport'
    AND COLUMN_NAME = 'school_id'
);

SET @sql3 = IF(@col_exists3 = 0,
  'ALTER TABLE student_transport ADD COLUMN school_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD INDEX idx_school (school_id)',
  'SELECT 1'
);
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- -------------------------------------------------------
-- 4. Migrate legacy transport data into normalized tables
--    Only runs if legacy table has data and normalized is empty
-- -------------------------------------------------------
INSERT IGNORE INTO transport_routes (route_code, route_name, school_id)
SELECT
  CONCAT('RT-', LPAD(t.bid, 3, '0')),
  t.rname,
  1
FROM transport t
WHERE NOT EXISTS (SELECT 1 FROM transport_routes LIMIT 1)
  AND t.rname IS NOT NULL;

INSERT IGNORE INTO transport_vehicles (vehicle_number, vehicle_name, vehicle_type, capacity, fuel_type, school_id)
SELECT DISTINCT
  t.vno,
  CONCAT('Vehicle ', t.vno),
  'bus',
  40,
  'diesel',
  1
FROM transport t
WHERE NOT EXISTS (SELECT 1 FROM transport_vehicles LIMIT 1)
  AND t.vno IS NOT NULL;

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;

SELECT 'Transport normalized migration complete' AS Status;
