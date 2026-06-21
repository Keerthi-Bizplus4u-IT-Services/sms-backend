-- ============================================================================
-- Pre-Migration Cleanup Script
-- ============================================================================
-- Purpose: Rename legacy tables that conflict with V2 schema names
-- to allow fresh creation of normalized tables.

USE sms;

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;

-- Rename subjects if it exists and has legacy structure (check for subid column ideally, but rename is safe)
-- We use a stored procedure to check if table exists before renaming to avoid errors if run multiple times
DROP PROCEDURE IF EXISTS RenameLegacySubjects;
DELIMITER //
CREATE PROCEDURE RenameLegacySubjects()
BEGIN
    IF EXISTS (SELECT * FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'subjects') THEN
        ALTER TABLE `subjects` RENAME TO `subjects_legacy`;
        SELECT 'Renamed legacy table `subjects` to `subjects_legacy`' AS Status;
    END IF;
END //
DELIMITER ;

CALL RenameLegacySubjects();
DROP PROCEDURE RenameLegacySubjects;

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
