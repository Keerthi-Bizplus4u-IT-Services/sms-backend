-- SMS seed data for one user per role (1..10)
-- NOTE: This is for development only. Passwords are plaintext to match current app logic.
-- UIDs chosen in 9001-9010 range to avoid clashes.

START TRANSACTION;

-- Users (uid, emailid, password, role)
INSERT INTO `user` (`uid`,`emailid`,`password`,`role`) VALUES
  (9001,'admin@sms.local','admin123','1'),
  (9002,'student@sms.local','student123','2'),
  (9003,'parent@sms.local','parent123','3'),
  (9004,'teacher@sms.local','teacher123','4'),
  (9005,'library@sms.local','library123','5'),
  (9006,'subjects@sms.local','subjects123','6'),
  (9007,'accounts@sms.local','accounts123','7'),
  (9008,'exam@sms.local','exam123','8'),
  (9009,'transport@sms.local','transport123','9'),
  (9010,'management@sms.local','management123','10')
ON DUPLICATE KEY UPDATE emailid=VALUES(emailid), password=VALUES(password), role=VALUES(role);

-- Admin-like profiles for roles 1 and 5..10
INSERT INTO `admin` (
  `uid`,`fname`,`lname`,`usertype`,`gender`,`father`,`mother`,`dob`,`religion`,`idno`,`phone`,`address`,`active`
) VALUES
  (9001,'Admin','User','admin','male','NA','NA','01/01/90','NA','A9001','9999990001','N/A',1),
  (9005,'Librarian','User','library','male','NA','NA','01/01/90','NA','A9005','9999990005','N/A',1),
  (9006,'Subjects','Lead','subjects','male','NA','NA','01/01/90','NA','A9006','9999990006','N/A',1),
  (9007,'Accounts','User','accounts','male','NA','NA','01/01/90','NA','A9007','9999990007','N/A',1),
  (9008,'Exam','Officer','exam','male','NA','NA','01/01/90','NA','A9008','9999990008','N/A',1),
  (9009,'Transport','Manager','transport','male','NA','NA','01/01/90','NA','A9009','9999990009','N/A',1),
  (9010,'Management','User','management','male','NA','NA','01/01/90','NA','A9010','9999990010','N/A',1)
ON DUPLICATE KEY UPDATE fname=VALUES(fname), lname=VALUES(lname);

-- Student profile for role 2 (minimal fields)
INSERT INTO `student` (
  `uid`,`fname`,`lname`,`gen`,`dob`,`roll`,`bg`,`rel`,`email`,`cid`,`secid`,`aid`,`phone`,`sphoto`,`admissiondate`,`sanumber`
) VALUES
  (9002,'Student','One','male','01/01/10','15SMS-STU','O+','NA','student@sms.local','1','1',1,'9999991002','', '01/01/2024','SA-9002')
ON DUPLICATE KEY UPDATE fname=VALUES(fname), email=VALUES(email);

-- Parent profile for role 3 (minimal fields)
INSERT INTO `parent` (
  `uid`,`fathername`,`mname`,`occupation`,`bgroup`,`religion`,`email`,`phone`,`address`,`sphoto`,`panumber`,`ppannumber`
) VALUES
  (9003,'Parent','One','NA','O+','NA','parent@sms.local','9999991003','N/A','N/A','P9003','P9003P')
ON DUPLICATE KEY UPDATE fathername=VALUES(fathername), email=VALUES(email);

-- Teacher profile for role 4 (minimal fields)
INSERT INTO `teacher` (`uid`,`fname`,`lname`,`gen`,`dob`,`idno`,`bg`,`rel`,`email`,`address`,`phone`,`skills`,`sphoto`,`salary`,`active`,`tanumber`,`tpannumber`) VALUES
  (9004,'Teacher','One','male','01/01/85','T9004','O+','NA','teacher@sms.local','N/A','9999991004','NA','', '0',1,'','')
ON DUPLICATE KEY UPDATE fname=VALUES(fname), email=VALUES(email);

COMMIT;
