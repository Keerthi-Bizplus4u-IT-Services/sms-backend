-- Seed sample data for normalized transport module (PostgreSQL)
-- Safe to run multiple times.

-- 1) Seed routes for school 1
INSERT INTO transport_routes (
  school_id,
  route_code,
  route_name,
  route_description,
  total_distance_km,
  estimated_duration_minutes,
  start_point,
  end_point,
  monthly_fee,
  is_active,
  created_at,
  updated_at
)
VALUES
  (1, 'RT-001', 'North City Loop', 'Covers north residential clusters', 18.50, 55, 'North Depot', 'Main Campus', 2200.00, TRUE, NOW(), NOW()),
  (1, 'RT-002', 'East Lake Route', 'Morning and evening route for east lake area', 14.20, 45, 'East Lake Gate', 'Main Campus', 2000.00, TRUE, NOW(), NOW()),
  (1, 'RT-003', 'South Market Route', 'Dense pickup route for south market streets', 16.80, 50, 'South Market Circle', 'Main Campus', 2100.00, TRUE, NOW(), NOW())
ON CONFLICT (school_id, route_code)
DO UPDATE SET
  route_name = EXCLUDED.route_name,
  route_description = EXCLUDED.route_description,
  total_distance_km = EXCLUDED.total_distance_km,
  estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
  start_point = EXCLUDED.start_point,
  end_point = EXCLUDED.end_point,
  monthly_fee = EXCLUDED.monthly_fee,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 2) Seed vehicles for school 1
INSERT INTO transport_vehicles (
  school_id,
  vehicle_number,
  vehicle_name,
  vehicle_type,
  capacity,
  registration_date,
  insurance_expiry,
  fitness_certificate_expiry,
  pollution_certificate_expiry,
  road_tax_expiry,
  fuel_type,
  status,
  created_at,
  updated_at
)
VALUES
  (1, 'KA-01-TR-1001', 'Blue Bird 1', 'bus', 48, CURRENT_DATE - INTERVAL '800 days', CURRENT_DATE + INTERVAL '220 days', CURRENT_DATE + INTERVAL '160 days', CURRENT_DATE + INTERVAL '120 days', CURRENT_DATE + INTERVAL '300 days', 'diesel', 'active', NOW(), NOW()),
  (1, 'KA-01-TR-1002', 'Blue Bird 2', 'bus', 42, CURRENT_DATE - INTERVAL '620 days', CURRENT_DATE + INTERVAL '200 days', CURRENT_DATE + INTERVAL '130 days', CURRENT_DATE + INTERVAL '110 days', CURRENT_DATE + INTERVAL '280 days', 'diesel', 'active', NOW(), NOW()),
  (1, 'KA-01-TR-1003', 'City Shuttle Van', 'van', 24, CURRENT_DATE - INTERVAL '520 days', CURRENT_DATE + INTERVAL '170 days', CURRENT_DATE + INTERVAL '140 days', CURRENT_DATE + INTERVAL '100 days', CURRENT_DATE + INTERVAL '250 days', 'cng', 'active', NOW(), NOW())
ON CONFLICT (school_id, vehicle_number)
DO UPDATE SET
  vehicle_name = EXCLUDED.vehicle_name,
  vehicle_type = EXCLUDED.vehicle_type,
  capacity = EXCLUDED.capacity,
  registration_date = EXCLUDED.registration_date,
  insurance_expiry = EXCLUDED.insurance_expiry,
  fitness_certificate_expiry = EXCLUDED.fitness_certificate_expiry,
  pollution_certificate_expiry = EXCLUDED.pollution_certificate_expiry,
  road_tax_expiry = EXCLUDED.road_tax_expiry,
  fuel_type = EXCLUDED.fuel_type,
  status = EXCLUDED.status,
  updated_at = NOW();

-- 3) Seed stops for each route (avoid duplicates by route + stop_name)
INSERT INTO transport_stops (
  route_id,
  stop_name,
  stop_order,
  pickup_time,
  drop_time,
  distance_from_school_km,
  landmark,
  stop_fee,
  is_active,
  created_at,
  updated_at
)
SELECT
  tr.id,
  s.stop_name,
  s.stop_order,
  s.pickup_time,
  s.drop_time,
  s.distance_from_school_km,
  s.landmark,
  s.stop_fee,
  TRUE,
  NOW(),
  NOW()
FROM transport_routes tr
JOIN (
  VALUES
    ('RT-001', 'North Depot Gate', 1, '06:50'::time, '14:55'::time, 18.50, 'Opp. City Fuel Station', 2200.00),
    ('RT-001', 'Green Park Junction', 2, '07:05'::time, '14:40'::time, 12.30, 'Near Green Park Pharmacy', 2100.00),
    ('RT-001', 'River View Stop', 3, '07:18'::time, '14:27'::time, 8.10, 'River View Apartment Gate', 2000.00),

    ('RT-002', 'East Lake Gate', 1, '07:00'::time, '15:00'::time, 14.20, 'Lake Gate Bus Bay', 2000.00),
    ('RT-002', 'Sunrise Colony', 2, '07:14'::time, '14:46'::time, 9.60, 'Sunrise Community Hall', 1950.00),
    ('RT-002', 'Old Bridge Corner', 3, '07:24'::time, '14:36'::time, 5.80, 'Old Bridge Tea Point', 1850.00),

    ('RT-003', 'South Market Circle', 1, '06:55'::time, '14:58'::time, 16.80, 'Market Clock Tower', 2100.00),
    ('RT-003', 'Metro Pillar 47', 2, '07:10'::time, '14:44'::time, 11.40, 'Under Metro Line', 2000.00),
    ('RT-003', 'Temple Street End', 3, '07:22'::time, '14:32'::time, 6.20, 'Temple Street Arch', 1900.00)
) AS s(route_code, stop_name, stop_order, pickup_time, drop_time, distance_from_school_km, landmark, stop_fee)
  ON s.route_code = tr.route_code
WHERE tr.school_id = 1
  AND NOT EXISTS (
    SELECT 1
    FROM transport_stops existing
    WHERE existing.route_id = tr.id
      AND existing.stop_name = s.stop_name
  );
