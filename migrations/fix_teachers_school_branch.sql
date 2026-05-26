USE sms;

ALTER TABLE `teachers`
  ADD COLUMN `school_id` INT UNSIGNED NULL AFTER `person_id`;

UPDATE `teachers`
SET `school_id` = 1
WHERE `school_id` IS NULL;

ALTER TABLE `teachers`
  MODIFY `school_id` INT UNSIGNED NOT NULL,
  ADD INDEX `idx_teachers_school` (`school_id`);

ALTER TABLE `teachers`
  ADD COLUMN `branch_id` INT UNSIGNED NULL AFTER `school_id`;

UPDATE `teachers`
SET `branch_id` = 1
WHERE `branch_id` IS NULL;

ALTER TABLE `teachers`
  MODIFY `branch_id` INT UNSIGNED NULL,
  ADD INDEX `idx_teachers_branch` (`branch_id`);

ALTER TABLE `teachers`
  ADD COLUMN `joining_date` DATE NULL AFTER `experience_years`;

ALTER TABLE `teachers`
  ADD COLUMN `employment_status` ENUM('active','on_leave','resigned','terminated')
    DEFAULT 'active'
    AFTER `resignation_date`;