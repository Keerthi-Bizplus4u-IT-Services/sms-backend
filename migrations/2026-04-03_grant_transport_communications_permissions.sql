-- Migration: Grant communications permissions to transport role
-- Date: 2026-04-03
-- Description: Align transport dashboard and notice/event workflows by granting
--              communications read/write/delete permissions to role 'transport'.

INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT r.id, p.id, NOW(), NOW()
FROM roles r
JOIN permissions p ON p.name IN (
  'communications:read',
  'communications:write',
  'communications:delete'
)
WHERE LOWER(r.name) = 'transport'
ON CONFLICT (role_id, permission_id) DO NOTHING;
