-- Add class teacher mapping to sections
-- Each section can have one primary class teacher.

ALTER TABLE sections
  ADD COLUMN IF NOT EXISTS class_teacher_id BIGINT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_sections_class_teacher'
  ) THEN
    ALTER TABLE sections
      ADD CONSTRAINT fk_sections_class_teacher
      FOREIGN KEY (class_teacher_id)
      REFERENCES teachers(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sections_class_teacher_id
  ON sections (class_teacher_id);
