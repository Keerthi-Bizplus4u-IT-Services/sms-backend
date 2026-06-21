-- Migration: Add missing roles (principal, curriculum_incharge, exam_incharge)
-- Date: 2026-04-03
-- Description: Add principal, curriculum_incharge, and exam_incharge roles
--              that the frontend references but were missing from the backend.
--              Also add the missing communications:delete permission.

-- 1. Add missing roles
INSERT INTO roles (id, name, description, is_system, created_at, updated_at)
VALUES
  (9, 'principal', 'School principal', FALSE, NOW(), NOW()),
  (11, 'exam_incharge', 'Exam/assessment in-charge', FALSE, NOW(), NOW()),
  (12, 'curriculum_incharge', 'Curriculum/subject coordinator', FALSE, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 2. Add missing communications:delete permission
INSERT INTO permissions (name, resource, action, description, created_at, updated_at)
VALUES ('communications:delete', 'communications', 'delete', 'Delete communications', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 3. Assign permissions to principal role
-- Principal can view students, teachers, parents, classes, subjects, marks, timetables, etc.
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT 9, p.id, NOW(), NOW()
FROM permissions p
WHERE p.name IN (
  'students:read',
  'teachers:read',
  'parents:read',
  'classes:read',
  'sections:read',
  'subjects:read',
  'marks:read',
  'timetables:read',
  'holidays:read',
  'leaves:read', 'leaves:approve',
  'academic-years:read',
  'session-hours:read',
  'dashboard:read',
  'communications:read', 'communications:write',
  'books:read',
  'hostels:read',
  'transport:read',
  'employees:read',
  'reports:read', 'reports:export',
  'fees:read',
  'expenses:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Assign permissions to exam_incharge role
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT 11, p.id, NOW(), NOW()
FROM permissions p
WHERE p.name IN (
  'students:read',
  'classes:read',
  'sections:read',
  'subjects:read',
  'marks:read', 'marks:write',
  'timetables:read',
  'holidays:read',
  'academic-years:read',
  'session-hours:read',
  'dashboard:read',
  'communications:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. Assign permissions to curriculum_incharge role
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT 12, p.id, NOW(), NOW()
FROM permissions p
WHERE p.name IN (
  'subjects:read', 'subjects:write', 'subjects:delete',
  'classes:read',
  'sections:read',
  'students:read',
  'teachers:read',
  'timetables:read', 'timetables:write',
  'holidays:read',
  'academic-years:read',
  'session-hours:read',
  'dashboard:read',
  'leaves:read', 'leaves:write',
  'communications:read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
