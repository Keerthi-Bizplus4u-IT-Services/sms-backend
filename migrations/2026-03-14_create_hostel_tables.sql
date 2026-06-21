-- ============================================================================
-- Hostel Management Migration Script
-- Date: 2026-03-14
-- Description: Create tables for hostel buildings and room management
-- ============================================================================

USE sms;

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='STRICT_TRANS_TABLES,NO_AUTO_VALUE_ON_ZERO,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

START TRANSACTION;

-- 1. Hostel Buildings
CREATE TABLE IF NOT EXISTS `hostel_buildings` (
  `id` INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `school_id` INT UNSIGNED NOT NULL DEFAULT 1,
  `building_name` VARCHAR(100) NOT NULL,
  `building_type` ENUM('male', 'female', 'co_ed', 'other') DEFAULT 'co_ed',
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_school_id` (`school_id`),
  CONSTRAINT `fk_hostel_buildings_school` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Hostel Rooms
CREATE TABLE IF NOT EXISTS `hostel_rooms` (
  `id` INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  `building_id` INT UNSIGNED NOT NULL,
  `room_number` VARCHAR(20) NOT NULL,
  `capacity` INT UNSIGNED NOT NULL DEFAULT 1,
  `occupied_beds` INT UNSIGNED DEFAULT 0,
  `monthly_rent` DECIMAL(10,2) DEFAULT 0.00,
  `status` ENUM('available', 'full', 'maintenance') DEFAULT 'available',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`building_id`) REFERENCES `hostel_buildings`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_building_room` (`building_id`, `room_number`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
