-- Adds email column to persons table for student contact info

ALTER TABLE `persons`
  ADD COLUMN `email` VARCHAR(255) NULL AFTER `middle_name`,
  ADD INDEX `idx_person_email` (`email`);

