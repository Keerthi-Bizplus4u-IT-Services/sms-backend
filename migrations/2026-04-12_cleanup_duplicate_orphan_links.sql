-- Cleanup migration: removes orphan/duplicate relation rows and adds protective unique indexes.
-- Target DB: PostgreSQL

BEGIN;

DO $$
DECLARE
  relation_table TEXT;
  student_col TEXT;
  parent_col TEXT;
BEGIN
  SELECT table_name
  INTO relation_table
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'student_parents'
  LIMIT 1;

  IF relation_table IS NOT NULL THEN
    SELECT CASE
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = relation_table AND column_name = 'student_id'
      ) THEN 'student_id'
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = relation_table AND column_name = 'sid'
      ) THEN 'sid'
      ELSE NULL
    END INTO student_col;

    SELECT CASE
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = relation_table AND column_name = 'parent_id'
      ) THEN 'parent_id'
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = relation_table AND column_name = 'pid'
      ) THEN 'pid'
      ELSE NULL
    END INTO parent_col;

    IF student_col IS NOT NULL AND parent_col IS NOT NULL THEN
      -- Remove orphan links (missing student or parent).
      EXECUTE format(
        'DELETE FROM %1$I sp
         WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = sp.%2$I)
            OR NOT EXISTS (SELECT 1 FROM parents p WHERE p.id = sp.%3$I)',
        relation_table,
        student_col,
        parent_col
      );

      -- Remove duplicate links, keep one row per student-parent pair.
      EXECUTE format(
        'DELETE FROM %1$I a
         USING %1$I b
         WHERE a.ctid < b.ctid
           AND a.%2$I = b.%2$I
           AND a.%3$I = b.%3$I',
        relation_table,
        student_col,
        parent_col
      );

      -- Add unique protection to avoid duplicate relation inserts going forward.
      IF to_regclass('public.uq_student_parents_student_parent') IS NULL THEN
        EXECUTE format(
          'CREATE UNIQUE INDEX uq_student_parents_student_parent ON %I (%I, %I)',
          relation_table,
          student_col,
          parent_col
        );
      END IF;
    END IF;
  END IF;
END $$;

-- Remove orphan exam schedules.
DELETE FROM exam_schedules es
WHERE NOT EXISTS (SELECT 1 FROM exams e WHERE e.id = es.exam_id)
   OR NOT EXISTS (SELECT 1 FROM classes c WHERE c.id = es.class_id)
   OR NOT EXISTS (SELECT 1 FROM subjects s WHERE s.id = es.subject_id);

-- Remove duplicate exam schedule rows, keep latest id for each exam/class/subject.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY exam_id, class_id, subject_id
      ORDER BY id DESC
    ) AS rn
  FROM exam_schedules
)
DELETE FROM exam_schedules es
USING ranked r
WHERE es.id = r.id
  AND r.rn > 1;

-- Add unique guardrail for exam/class/subject schedule entries.
CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_schedules_exam_class_subject
ON exam_schedules (exam_id, class_id, subject_id);

COMMIT;
