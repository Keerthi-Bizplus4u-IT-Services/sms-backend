-- Add event metadata columns required by the new React dashboard/post-event flows.
-- This script is idempotent and can be executed multiple times safely on MySQL 5.7/8.0.

SET @target_table := 'postevent';

SET @ddl := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = @target_table
        AND COLUMN_NAME = 'location'
    ),
    'SELECT 1',
    'ALTER TABLE `postevent` ADD COLUMN `location` VARCHAR(191) NULL AFTER `dis`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = @target_table
        AND COLUMN_NAME = 'tname'
    ),
    'SELECT 1',
    'ALTER TABLE `postevent` ADD COLUMN `tname` VARCHAR(191) NULL AFTER `location`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = @target_table
        AND COLUMN_NAME = 'idno'
    ),
    'SELECT 1',
    'ALTER TABLE `postevent` ADD COLUMN `idno` VARCHAR(64) NULL AFTER `tname`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = @target_table
        AND COLUMN_NAME = 'enote'
    ),
    'SELECT 1',
    'ALTER TABLE `postevent` ADD COLUMN `enote` TEXT NULL AFTER `idno`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = @target_table
        AND COLUMN_NAME = 'created_at'
    ),
    'SELECT 1',
    'ALTER TABLE `postevent` ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `enote`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = @target_table
        AND COLUMN_NAME = 'updated_at'
    ),
    'SELECT 1',
    'ALTER TABLE `postevent` ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
