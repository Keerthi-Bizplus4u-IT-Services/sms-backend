-- ------------------------------------------------------------------
-- Legacy Table Cleanup - Align database with Sequelize models
-- Removes tables that have no corresponding model definitions
-- Source reference: dump-sms-202511150644.sql (legacy schema snapshot)
-- ------------------------------------------------------------------

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `addattendence`;
DROP TABLE IF EXISTS `admin`;
DROP TABLE IF EXISTS `attendence`;
DROP TABLE IF EXISTS `balance_leaves`;
DROP TABLE IF EXISTS `balance_leaves_apply`;
DROP TABLE IF EXISTS `calendar`;
DROP TABLE IF EXISTS `class`;
DROP TABLE IF EXISTS `config`;
DROP TABLE IF EXISTS `contact`;
DROP TABLE IF EXISTS `event`;
DROP TABLE IF EXISTS `exam`;
DROP TABLE IF EXISTS `examgrade`;
DROP TABLE IF EXISTS `examschedule`;
DROP TABLE IF EXISTS `expense`;
DROP TABLE IF EXISTS `feedetails`;
DROP TABLE IF EXISTS `fees`;
DROP TABLE IF EXISTS `feetransactions`;
DROP TABLE IF EXISTS `hostel`;
DROP TABLE IF EXISTS `hostelregistration`;
DROP TABLE IF EXISTS `leaves`;
DROP TABLE IF EXISTS `library`;
DROP TABLE IF EXISTS `marks`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `notice`;
DROP TABLE IF EXISTS `parent`;
DROP TABLE IF EXISTS `parent_student`;
DROP TABLE IF EXISTS `postevent`;
DROP TABLE IF EXISTS `promotion`;
DROP TABLE IF EXISTS `salary`;
DROP TABLE IF EXISTS `schedule`;
DROP TABLE IF EXISTS `section`;
DROP TABLE IF EXISTS `sessionhours`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `student`;
DROP TABLE IF EXISTS `studentmarks`;
DROP TABLE IF EXISTS `teacher`;
DROP TABLE IF EXISTS `timetable`;
DROP TABLE IF EXISTS `timings`;
DROP TABLE IF EXISTS `total_leaves`;
DROP TABLE IF EXISTS `transport`;
DROP TABLE IF EXISTS `ulogins`;
DROP TABLE IF EXISTS `unsubscribemail`;
DROP TABLE IF EXISTS `user`;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

-- End of legacy cleanup
