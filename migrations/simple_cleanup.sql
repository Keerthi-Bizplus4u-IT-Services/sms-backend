-- Simply rename the table. 
-- If this fails because table doesn't exist, we can ignore it manually or handle it.
-- But we know it exists.
RENAME TABLE `subjects` TO `subjects_legacy`;
