-- Migration: RBAC Permission System + Refresh Tokens + Password Reset Tokens
-- Date: 2026-03-22
-- Description: Add granular RBAC tables, refresh token storage, password reset tokens,
--              school_id to users, is_system to roles

-- 1. Add school_id to users table (nullable for super_admin)
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id BIGINT NULL REFERENCES schools(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);

-- 2. Add is_system flag to roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('read', 'write', 'delete', 'approve', 'export')),
  description VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);

-- 4. Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_id SMALLINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- 5. Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  device_info VARCHAR(255),
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);

-- 6. Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_otp_hash ON password_reset_tokens(otp_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- 7. Mark existing roles as system roles
UPDATE roles SET is_system = TRUE WHERE name IN ('admin', 'student', 'parent', 'teacher');

-- 8. Insert super_admin role if not exists
INSERT INTO roles (id, name, description, is_system, created_at, updated_at)
VALUES (10, 'super_admin', 'Super administrator with full system access', TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Ensure all standard roles exist
INSERT INTO roles (id, name, description, is_system, created_at, updated_at) VALUES
  (1, 'admin', 'School administrator', TRUE, NOW(), NOW()),
  (2, 'student', 'Student user', TRUE, NOW(), NOW()),
  (3, 'parent', 'Parent/guardian user', TRUE, NOW(), NOW()),
  (4, 'teacher', 'Teacher user', TRUE, NOW(), NOW()),
  (5, 'accounts', 'Accounts/finance staff', TRUE, NOW(), NOW()),
  (6, 'library', 'Library staff', TRUE, NOW(), NOW()),
  (7, 'management', 'Management staff', TRUE, NOW(), NOW()),
  (8, 'transport', 'Transport staff', TRUE, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET is_system = TRUE;
