-- Fix legacy academic_years uniqueness in PostgreSQL.
-- Some environments still keep a global unique constraint/index on (name),
-- which blocks signup when multiple schools use the same academic year label.

DO $$
DECLARE
  constraint_rec RECORD;
  index_rec RECORD;
BEGIN
  -- Drop UNIQUE constraints that apply only to (name)
  FOR constraint_rec IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'academic_years'
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname::text ORDER BY u.ordinality)
        FROM unnest(c.conkey) WITH ORDINALITY AS u(attnum, ordinality)
        JOIN pg_attribute a
          ON a.attrelid = t.oid
         AND a.attnum = u.attnum
      ) = ARRAY['name']
  LOOP
    EXECUTE format('ALTER TABLE public.academic_years DROP CONSTRAINT IF EXISTS %I', constraint_rec.conname);
  END LOOP;

  -- Drop standalone UNIQUE indexes that apply only to (name)
  FOR index_rec IN
    SELECT i.indexname
    FROM pg_indexes i
    WHERE i.schemaname = 'public'
      AND i.tablename = 'academic_years'
      AND i.indexdef ILIKE 'CREATE UNIQUE INDEX%'
      AND i.indexdef ILIKE '%(name)%'
      AND i.indexdef NOT ILIKE '%school_id%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', index_rec.indexname);
  END LOOP;
END $$;

-- Enforce uniqueness per school (expected multi-tenant behavior)
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_school_name
  ON academic_years (school_id, name);
