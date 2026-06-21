-- Migration to create holidays table
-- Replace legacy 'calendar' table with multi-school aware 'holidays'

CREATE TABLE IF NOT EXISTS `holidays` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `school_id` INTEGER UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  CONSTRAINT `fk_holidays_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Create index for searching by school
CREATE INDEX `idx_holidays_school` ON `holidays` (`school_id`);
CREATE INDEX `idx_holidays_dates` ON `holidays` (`start_date`, `end_date`);
