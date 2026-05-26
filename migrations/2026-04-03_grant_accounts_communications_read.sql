-- Migration: Grant communications read permission to accounts role
-- Date: 2026-04-03
-- Description: Fix dashboard notices/events load failure for accounts users
-- by granting communications:read permission to role 'accounts'.

INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT r.id, p.id, NOW(), NOW()
FROM roles r
JOIN permissions p ON p.name = 'communications:read'
WHERE LOWER(r.name) = 'accounts'
ON CONFLICT (role_id, permission_id) DO NOTHING;
