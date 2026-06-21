-- Ensure assigned transport drivers/conductors are represented in persons table
-- so they live in the same people registry used by teachers and parents.

CREATE TEMP TABLE tmp_transport_assigned_users (
  school_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_transport_assigned_users (school_id, user_id)
SELECT tv.school_id, tv.driver_id::bigint
FROM transport_vehicles tv
WHERE tv.deleted_at IS NULL
  AND tv.driver_id IS NOT NULL;

INSERT INTO tmp_transport_assigned_users (school_id, user_id)
SELECT tv.school_id, tv.conductor_id::bigint
FROM transport_vehicles tv
WHERE tv.deleted_at IS NULL
  AND tv.conductor_id IS NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.transport_vehicle_staff_assignments') IS NOT NULL THEN
    INSERT INTO tmp_transport_assigned_users (school_id, user_id)
    SELECT tva.school_id, tva.driver_id::bigint
    FROM transport_vehicle_staff_assignments tva
    WHERE tva.deleted_at IS NULL
      AND tva.driver_id IS NOT NULL;

    INSERT INTO tmp_transport_assigned_users (school_id, user_id)
    SELECT tva.school_id, tva.conductor_id::bigint
    FROM transport_vehicle_staff_assignments tva
    WHERE tva.deleted_at IS NULL
      AND tva.conductor_id IS NOT NULL;
  END IF;
END $$;

WITH distinct_users AS (
  SELECT DISTINCT school_id, user_id
  FROM tmp_transport_assigned_users
),
missing_people AS (
  SELECT
    du.school_id,
    u.id AS user_id,
    u.email,
    regexp_split_to_array(split_part(COALESCE(u.email, ''), '@', 1), '[._-]+') AS name_parts
  FROM distinct_users du
  JOIN users u
    ON u.id = du.user_id
   AND u.school_id = du.school_id
   AND u.deleted_at IS NULL
  LEFT JOIN persons p
    ON p.user_id = u.id
   AND p.deleted_at IS NULL
  WHERE p.id IS NULL
)
INSERT INTO persons (
  user_id,
  first_name,
  last_name,
  gender,
  date_of_birth,
  country,
  created_at,
  updated_at
)
SELECT
  mp.user_id,
  COALESCE(NULLIF(initcap(mp.name_parts[1]), ''), 'Transport') AS first_name,
  COALESCE(
    NULLIF(initcap(array_to_string(mp.name_parts[2:array_length(mp.name_parts, 1)], ' ')), ''),
    'Staff'
  ) AS last_name,
  'prefer_not_to_say',
  DATE '1990-01-01',
  'India',
  NOW(),
  NOW()
FROM missing_people mp
ON CONFLICT (user_id) DO NOTHING;
