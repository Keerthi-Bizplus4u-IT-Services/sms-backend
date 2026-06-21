-- sms Schema Optimization v2 (2025-11-15) - MySQL 8.0 Compatible
-- This version removes IF NOT EXISTS from ALTER TABLE statements
-- Uses error suppression for idempotency

START TRANSACTION;

-- 1) Create roles table
CREATE TABLE IF NOT EXISTS `roles` (
  `id` TINYINT UNSIGNED NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `roles` (`id`,`name`,`description`) VALUES
  (1,'admin','Administrator'),
  (2,'student','Student user'),
  (3,'parent','Parent/guardian'),
  (4,'teacher','Teacher/faculty'),
  (5,'library','Library staff'),
  (6,'subjects','Subject coordinator'),
  (7,'accounts','Accounts/billing'),
  (8,'exam','Examinations/assessment'),
  (9,'transport','Transport manager'),
  (10,'management','Management/executive')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- User table enhancements
-- Note: These will error if columns exist, which is expected and safe
SET @sql = 'ALTER TABLE `user` ADD COLUMN `role_id` TINYINT UNSIGNED NULL AFTER `role`';
SET @check_sql = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'role_id');
PREPARE stmt FROM IF(@check_sql = 0, @sql, 'SELECT 1');
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE `user` ADD COLUMN `password_hash` VARCHAR(255) NULL AFTER `password`';
SET @check_sql = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'password_hash');
PREPARE stmt FROM IF(@check_sql = 0, @sql, 'SELECT 1');
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE `user` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `password_hash`';
SET @check_sql = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'is_active');
PREPARE stmt FROM IF(@check_sql = 0, @sql, 'SELECT 1');
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE `user` ADD COLUMN `last_login_at` DATETIME NULL AFTER `is_active`';
SET @check_sql = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'last_login_at');
PREPARE stmt FROM IF(@check_sql = 0, @sql, 'SELECT 1');
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE `user` ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `last_login_at`';
SET @check_sql = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'created_at');
PREPARE stmt FROM IF(@check_sql = 0, @sql, 'SELECT 1');
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE `user` ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`';
SET @check_sql = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'updated_at');
PREPARE stmt FROM IF(@check_sql = 0, @sql, 'SELECT 1');
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill role_id from existing role (if numeric)
UPDATE `user` SET `role_id` = CAST(`role` AS UNSIGNED)
WHERE `role_id` IS NULL AND `role` REGEXP '^[0-9]+$';

-- Indexes for fast auth and lookups
CREATE INDEX `idx_user_role_id` ON `user` (`role_id`);
CREATE INDEX `idx_user_is_active` ON `user` (`is_active`);

COMMIT;
