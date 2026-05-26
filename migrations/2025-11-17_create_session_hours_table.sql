-- ------------------------------------------------------------------
-- Session Hours Table (multi-school aware)
-- Supports school-wide, class-level, and section-level session timing
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `session_hours` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `school_id` INTEGER UNSIGNED NOT NULL,
  `class_id` BIGINT UNSIGNED NULL,
  `section_id` INTEGER UNSIGNED NULL,
  `scope` ENUM('SCHOOL', 'CLASS', 'SECTION') NOT NULL DEFAULT 'SCHOOL',
  `period_label` VARCHAR(50) DEFAULT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_session_hours_time` CHECK (`end_time` > `start_time`),
  CONSTRAINT `fk_session_hours_school` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_session_hours_class` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_session_hours_section` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_session_hours_school` ON `session_hours` (`school_id`);
CREATE INDEX `idx_session_hours_scope` ON `session_hours` (`scope`);
CREATE INDEX `idx_session_hours_class_section` ON `session_hours` (`class_id`, `section_id`);
