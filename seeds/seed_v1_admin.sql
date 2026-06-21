-- Seed V1 Admin User for API v1
-- Creates normalized users/persons/roles entries compatible with Sequelize models
-- Password: admin123 (bcrypt hash below)

START TRANSACTION;
SET @default_school_id = COALESCE(@default_school_id, 1);

-- 1. Ensure roles table has admin role (id=1)
INSERT INTO `roles` (`id`, `name`, `description`, `created_at`, `updated_at`) 
VALUES (1, 'admin', 'Administrator', NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- 2. Create user with bcrypt-hashed password (admin123)
-- Hash generated via: bcrypt.hash('admin123', 10)
INSERT INTO `users` (`school_id`, `email`, `password_hash`, `role_id`, `is_active`, `created_at`, `updated_at`)
VALUES (
  @default_school_id,
  'admin@sms.local',
  '$2b$10$q1z5xjCnuRiCAfz8vd9P7eQazMOrU/nyZw1zr6Uf8Rs/kkzHI3dFC',
  1,
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  email=VALUES(email),
  password_hash=VALUES(password_hash),
  school_id=VALUES(school_id),
  role_id=VALUES(role_id),
  is_active=VALUES(is_active),
  updated_at=VALUES(updated_at);

-- 3. Get the user ID (for MySQL 8+ or use LAST_INSERT_ID() if newly inserted)
SET @user_id = (SELECT id FROM `users` WHERE email='admin@sms.local' LIMIT 1);

-- 4. Create person record linked to user
INSERT INTO `persons` (
  `user_id`, `first_name`, `last_name`, `gender`, `date_of_birth`, 
  `phone`, `address_line1`, `city`, `state`, `country`, 
  `created_at`, `updated_at`
)
VALUES (
  @user_id, 'Admin', 'User', 'male', '1990-01-01',
  '9999990001', 'System Administrator', 'N/A', 'N/A', 'India',
  NOW(), NOW()
)
ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), first_name=VALUES(first_name);

COMMIT;

-- Verification query (run after seeding):
-- SELECT u.id, u.email, u.role_id, r.name as role, p.first_name, p.last_name 
-- FROM users u 
-- LEFT JOIN roles r ON u.role_id = r.id 
-- LEFT JOIN persons p ON p.user_id = u.id 
-- WHERE u.email = 'admin@sms.local';
