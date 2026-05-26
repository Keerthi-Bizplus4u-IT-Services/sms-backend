const { sequelize, Sequelize } = require('../config/database');

// Initialize models (each file exports a factory function)
const School = require('./School')(sequelize, Sequelize.DataTypes);
const SchoolSetting = require('./SchoolSetting')(sequelize, Sequelize.DataTypes);
const SchoolBranch = require('./SchoolBranch')(sequelize, Sequelize.DataTypes);
const Role = require('./Role')(sequelize, Sequelize.DataTypes);
const Permission = require('./Permission')(sequelize, Sequelize.DataTypes);
const RolePermission = require('./RolePermission')(sequelize, Sequelize.DataTypes);
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Person = require('./Person')(sequelize, Sequelize.DataTypes);
const RefreshToken = require('./RefreshToken')(sequelize, Sequelize.DataTypes);
const PasswordResetToken = require('./PasswordResetToken')(sequelize, Sequelize.DataTypes);
const AcademicYear = require('./AcademicYear')(sequelize, Sequelize.DataTypes);
const Class = require('./Class')(sequelize, Sequelize.DataTypes);
const Section = require('./Section')(sequelize, Sequelize.DataTypes);
const Subject = require('./Subject')(sequelize, Sequelize.DataTypes);
const Student = require('./Student')(sequelize, Sequelize.DataTypes);
const Teacher = require('./Teacher')(sequelize, Sequelize.DataTypes);
const Parent = require('./Parent')(sequelize, Sequelize.DataTypes);
const LeavePolicy = require('./LeavePolicy')(sequelize, Sequelize.DataTypes);
const LeaveRequest = require('./LeaveRequest')(sequelize, Sequelize.DataTypes);
const LeavePeriodAssignment = require('./LeavePeriodAssignment')(sequelize, Sequelize.DataTypes);
const SessionHour = require('./SessionHour')(sequelize, Sequelize.DataTypes);
const TimetablePeriod = require('./TimetablePeriod')(sequelize, Sequelize.DataTypes);
const ClassTimetable = require('./ClassTimetable')(sequelize, Sequelize.DataTypes);
const Holiday = require('./Holiday')(sequelize, Sequelize.DataTypes);
const Exam = require('./Exam')(sequelize, Sequelize.DataTypes);
const ExamSchedule = require('./ExamSchedule')(sequelize, Sequelize.DataTypes);
const StudentMark = require('./StudentMark')(sequelize, Sequelize.DataTypes);
const GradingScale = require('./GradingScale')(sequelize, Sequelize.DataTypes);
const Assignment = require('./Assignment')(sequelize, Sequelize.DataTypes);
const AssignmentSubmission = require('./AssignmentSubmission')(sequelize, Sequelize.DataTypes);
const HostelBuilding = require('./HostelBuilding')(sequelize, Sequelize.DataTypes);
const HostelRoom = require('./HostelRoom')(sequelize, Sequelize.DataTypes);
const SchoolGroup = require('./SchoolGroup')(sequelize, Sequelize.DataTypes);
const SchoolGroupMember = require('./SchoolGroupMember')(sequelize, Sequelize.DataTypes);
const StudentExit = require('./StudentExit')(sequelize, Sequelize.DataTypes);
const StudentCertificate = require('./StudentCertificate')(sequelize, Sequelize.DataTypes);
const AttendanceSession = require('./AttendanceSession')(sequelize, Sequelize.DataTypes);
const AttendanceRecord = require('./AttendanceRecord')(sequelize, Sequelize.DataTypes);
const StudentAchievement = require('./StudentAchievement')(sequelize, Sequelize.DataTypes);




/**
 * Define Model Associations
 * Sets up relationships between models
 */

// School <-> Branches
School.hasMany(SchoolBranch, { foreignKey: 'school_id', as: 'branches' });
SchoolBranch.belongsTo(School, { foreignKey: 'school_id', as: 'school' });

// School <-> Settings
School.hasOne(SchoolSetting, { foreignKey: 'school_id', as: 'settings' });
SchoolSetting.belongsTo(School, { foreignKey: 'school_id', as: 'school' });

// User <-> Role (Many-to-One)
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

// User <-> School (Many-to-One, nullable for super_admin)
User.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
School.hasMany(User, { foreignKey: 'school_id', as: 'users' });

// Role <-> Permission (Many-to-Many through RolePermission)
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id', otherKey: 'permission_id', as: 'permissions' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id', otherKey: 'role_id', as: 'roles' });

// User <-> RefreshToken (One-to-Many)
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> PasswordResetToken (One-to-Many)
User.hasMany(PasswordResetToken, { foreignKey: 'user_id', as: 'passwordResetTokens' });
PasswordResetToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Person <-> User (One-to-One)
Person.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(Person, { foreignKey: 'user_id', as: 'person' });

// Student <-> Person (One-to-One)
Student.belongsTo(Person, { foreignKey: 'person_id', as: 'person' });
Person.hasOne(Student, { foreignKey: 'person_id', as: 'student' });

// Student <-> School / Branch
Student.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
School.hasMany(Student, { foreignKey: 'school_id', as: 'students' });
Student.belongsTo(SchoolBranch, { foreignKey: 'branch_id', as: 'branch' });
SchoolBranch.hasMany(Student, { foreignKey: 'branch_id', as: 'students' });

// Teacher <-> Person (One-to-One)
Teacher.belongsTo(Person, { foreignKey: 'person_id', as: 'person' });
Person.hasOne(Teacher, { foreignKey: 'person_id', as: 'teacher' });

// Teacher <-> School / Branch
Teacher.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
School.hasMany(Teacher, { foreignKey: 'school_id', as: 'teachers' });
Teacher.belongsTo(SchoolBranch, { foreignKey: 'branch_id', as: 'branch' });
SchoolBranch.hasMany(Teacher, { foreignKey: 'branch_id', as: 'teachers' });

// Parent <-> Person (One-to-One)
Parent.belongsTo(Person, { foreignKey: 'person_id', as: 'person' });
Person.hasOne(Parent, { foreignKey: 'person_id', as: 'parent' });

// Student <-> Class (Many-to-One)
Student.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
Class.hasMany(Student, { foreignKey: 'class_id', as: 'students' });

// Student <-> Section (Many-to-One)
Student.belongsTo(Section, { foreignKey: 'section_id', as: 'section' });
Section.hasMany(Student, { foreignKey: 'section_id', as: 'students' });

// Class <-> AcademicYear (Many-to-One)
Class.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
AcademicYear.hasMany(Class, { foreignKey: 'academic_year_id', as: 'classes' });

// Class <-> Branch (Many-to-One)
Class.belongsTo(SchoolBranch, { foreignKey: 'branch_id', as: 'branch' });
SchoolBranch.hasMany(Class, { foreignKey: 'branch_id', as: 'classes' });

// Section <-> Class (Many-to-One)
Section.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
Class.hasMany(Section, { foreignKey: 'class_id', as: 'sections' });

// Section <-> Teacher (Class Teacher)
Section.belongsTo(Teacher, { foreignKey: 'class_teacher_id', as: 'classTeacher' });
Teacher.hasMany(Section, { foreignKey: 'class_teacher_id', as: 'classSections' });

// AcademicYear <-> School
AcademicYear.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
School.hasMany(AcademicYear, { foreignKey: 'school_id', as: 'academicYears' });

// SessionHour relationships
SessionHour.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
School.hasMany(SessionHour, { foreignKey: 'school_id', as: 'sessionHours' });
SessionHour.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
Class.hasMany(SessionHour, { foreignKey: 'class_id', as: 'sessionHours' });
SessionHour.belongsTo(Section, { foreignKey: 'section_id', as: 'section' });
Section.hasMany(SessionHour, { foreignKey: 'section_id', as: 'sessionHours' });

// TimetablePeriod relationships
TimetablePeriod.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
AcademicYear.hasMany(TimetablePeriod, { foreignKey: 'academic_year_id', as: 'timetablePeriods' });

// ClassTimetable relationships
ClassTimetable.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
AcademicYear.hasMany(ClassTimetable, { foreignKey: 'academic_year_id', as: 'classTimetables' });
ClassTimetable.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
Class.hasMany(ClassTimetable, { foreignKey: 'class_id', as: 'classTimetables' });
ClassTimetable.belongsTo(Section, { foreignKey: 'section_id', as: 'section' });
Section.hasMany(ClassTimetable, { foreignKey: 'section_id', as: 'classTimetables' });
ClassTimetable.belongsTo(TimetablePeriod, { foreignKey: 'period_id', as: 'period' });
TimetablePeriod.hasMany(ClassTimetable, { foreignKey: 'period_id', as: 'classTimetables' });
ClassTimetable.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
Subject.hasMany(ClassTimetable, { foreignKey: 'subject_id', as: 'classTimetables' });
ClassTimetable.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
Teacher.hasMany(ClassTimetable, { foreignKey: 'teacher_id', as: 'classTimetables' });

// Subject <-> School
Subject.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
School.hasMany(Subject, { foreignKey: 'school_id', as: 'subjects' });

// Student <-> Parent (Many-to-Many) - Will be added when StudentParent model is created

// School <-> LeavePolicy
School.hasMany(LeavePolicy, { foreignKey: 'school_id', as: 'leavePolicies' });
LeavePolicy.belongsTo(School, { foreignKey: 'school_id', as: 'school' });

// LeavePolicy <-> LeaveRequest
LeavePolicy.hasMany(LeaveRequest, { foreignKey: 'policy_id', as: 'requests' });
LeaveRequest.belongsTo(LeavePolicy, { foreignKey: 'policy_id', as: 'policy' });

// User <-> LeaveRequest (requester)
User.hasMany(LeaveRequest, { foreignKey: 'user_id', as: 'leaveRequests' });
LeaveRequest.belongsTo(User, { foreignKey: 'user_id', as: 'requester' });

// User <-> LeaveRequest (approver)
User.hasMany(LeaveRequest, { foreignKey: 'approver_id', as: 'approvedLeaves' });
LeaveRequest.belongsTo(User, { foreignKey: 'approver_id', as: 'approver' });

// LeaveRequest <-> LeavePeriodAssignment
LeaveRequest.hasMany(LeavePeriodAssignment, { foreignKey: 'leave_request_id', as: 'periodAssignments' });
LeavePeriodAssignment.belongsTo(LeaveRequest, { foreignKey: 'leave_request_id', as: 'leaveRequest' });

// School <-> LeavePeriodAssignment
School.hasMany(LeavePeriodAssignment, { foreignKey: 'school_id', as: 'leavePeriodAssignments' });
LeavePeriodAssignment.belongsTo(School, { foreignKey: 'school_id', as: 'school' });

// Timetable <-> LeavePeriodAssignment
ClassTimetable.hasMany(LeavePeriodAssignment, { foreignKey: 'timetable_id', as: 'leaveAssignments' });
LeavePeriodAssignment.belongsTo(ClassTimetable, { foreignKey: 'timetable_id', as: 'timetable' });

// Period/Class/Section <-> LeavePeriodAssignment
TimetablePeriod.hasMany(LeavePeriodAssignment, { foreignKey: 'period_id', as: 'leaveAssignments' });
LeavePeriodAssignment.belongsTo(TimetablePeriod, { foreignKey: 'period_id', as: 'period' });
Class.hasMany(LeavePeriodAssignment, { foreignKey: 'class_id', as: 'leaveAssignments' });
LeavePeriodAssignment.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
Section.hasMany(LeavePeriodAssignment, { foreignKey: 'section_id', as: 'leaveAssignments' });
LeavePeriodAssignment.belongsTo(Section, { foreignKey: 'section_id', as: 'section' });

// Teacher/Subject <-> LeavePeriodAssignment
Teacher.hasMany(LeavePeriodAssignment, { foreignKey: 'original_teacher_id', as: 'originalLeaveAssignments' });
Teacher.hasMany(LeavePeriodAssignment, { foreignKey: 'substitute_teacher_id', as: 'substituteLeaveAssignments' });
LeavePeriodAssignment.belongsTo(Teacher, { foreignKey: 'original_teacher_id', as: 'originalTeacher' });
LeavePeriodAssignment.belongsTo(Teacher, { foreignKey: 'substitute_teacher_id', as: 'substituteTeacher' });
Subject.hasMany(LeavePeriodAssignment, { foreignKey: 'substitute_subject_id', as: 'leaveReallocations' });
LeavePeriodAssignment.belongsTo(Subject, { foreignKey: 'substitute_subject_id', as: 'substituteSubject' });

// School <-> Holiday
School.hasMany(Holiday, { foreignKey: 'school_id', as: 'holidays' });
Holiday.belongsTo(School, { foreignKey: 'school_id', as: 'school' });

// Exam Associations
AcademicYear.hasMany(Exam, { foreignKey: 'academic_year_id', as: 'exams' });
Exam.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });

Exam.hasMany(ExamSchedule, { foreignKey: 'exam_id', as: 'schedules' });
ExamSchedule.belongsTo(Exam, { foreignKey: 'exam_id', as: 'exam' });

ExamSchedule.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
Class.hasMany(ExamSchedule, { foreignKey: 'class_id', as: 'examSchedules' });

ExamSchedule.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
Subject.hasMany(ExamSchedule, { foreignKey: 'subject_id', as: 'examSchedules' });

ExamSchedule.hasMany(StudentMark, { foreignKey: 'exam_schedule_id', as: 'marks' });
StudentMark.belongsTo(ExamSchedule, { foreignKey: 'exam_schedule_id', as: 'schedule' });

StudentMark.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Student.hasMany(StudentMark, { foreignKey: 'student_id', as: 'marks' });

AcademicYear.hasMany(GradingScale, { foreignKey: 'academic_year_id', as: 'gradingScales' });
GradingScale.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });

// Assignment associations
AcademicYear.hasMany(Assignment, { foreignKey: 'academic_year_id', as: 'assignments' });
Assignment.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });

Class.hasMany(Assignment, { foreignKey: 'class_id', as: 'assignments' });
Assignment.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });

Section.hasMany(Assignment, { foreignKey: 'section_id', as: 'assignments' });
Assignment.belongsTo(Section, { foreignKey: 'section_id', as: 'section' });

Subject.hasMany(Assignment, { foreignKey: 'subject_id', as: 'assignments' });
Assignment.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });

Teacher.hasMany(Assignment, { foreignKey: 'teacher_id', as: 'assignments' });
Assignment.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });

Assignment.hasMany(AssignmentSubmission, { foreignKey: 'assignment_id', as: 'submissions' });
AssignmentSubmission.belongsTo(Assignment, { foreignKey: 'assignment_id', as: 'assignment' });

Student.hasMany(AssignmentSubmission, { foreignKey: 'student_id', as: 'assignmentSubmissions' });
AssignmentSubmission.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });

User.hasMany(AssignmentSubmission, { foreignKey: 'graded_by', as: 'gradedAssignments' });
AssignmentSubmission.belongsTo(User, { foreignKey: 'graded_by', as: 'grader' });

// Hostel Associations
School.hasMany(HostelBuilding, { foreignKey: 'school_id', as: 'hostelBuildings' });
HostelBuilding.belongsTo(School, { foreignKey: 'school_id', as: 'school' });

HostelBuilding.hasMany(HostelRoom, { foreignKey: 'building_id', as: 'rooms' });
HostelRoom.belongsTo(HostelBuilding, { foreignKey: 'building_id', as: 'building' });

// SchoolGroup <-> School (Many-to-Many through SchoolGroupMember)
SchoolGroup.belongsToMany(School, { through: SchoolGroupMember, foreignKey: 'group_id', otherKey: 'school_id', as: 'schools' });
School.belongsToMany(SchoolGroup, { through: SchoolGroupMember, foreignKey: 'school_id', otherKey: 'group_id', as: 'groups' });

// User <-> SchoolGroup (optional group boundary)
User.belongsTo(SchoolGroup, { foreignKey: 'group_id', as: 'schoolGroup' });
SchoolGroup.hasMany(User, { foreignKey: 'group_id', as: 'users' });

// StudentExit associations
Student.hasOne(StudentExit, { foreignKey: 'student_id', as: 'exit' });
StudentExit.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
StudentExit.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
School.hasMany(StudentExit, { foreignKey: 'school_id', as: 'studentExits' });
StudentExit.belongsTo(User, { foreignKey: 'issued_by', as: 'issuedBy' });

// StudentCertificate associations
StudentCertificate.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Student.hasMany(StudentCertificate, { foreignKey: 'student_id', as: 'certificates' });
StudentCertificate.belongsTo(StudentExit, { foreignKey: 'exit_id', as: 'exit' });
StudentExit.hasMany(StudentCertificate, { foreignKey: 'exit_id', as: 'certificates' });
StudentCertificate.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
StudentCertificate.belongsTo(User, { foreignKey: 'issued_by', as: 'issuedBy' });

// AttendanceSession associations
AttendanceSession.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
Class.hasMany(AttendanceSession, { foreignKey: 'class_id', as: 'attendanceSessions' });
AttendanceSession.belongsTo(Section, { foreignKey: 'section_id', as: 'section' });
Section.hasMany(AttendanceSession, { foreignKey: 'section_id', as: 'attendanceSessions' });
AttendanceSession.belongsTo(SessionHour, { foreignKey: 'session_hour_id', as: 'sessionHour' });
SessionHour.hasMany(AttendanceSession, { foreignKey: 'session_hour_id', as: 'attendanceSessions' });
AttendanceSession.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
School.hasMany(AttendanceSession, { foreignKey: 'school_id', as: 'attendanceSessions' });
AttendanceSession.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
AttendanceSession.hasMany(AttendanceRecord, { foreignKey: 'session_id', as: 'records' });

// AttendanceRecord associations
AttendanceRecord.belongsTo(AttendanceSession, { foreignKey: 'session_id', as: 'session' });
AttendanceRecord.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Student.hasMany(AttendanceRecord, { foreignKey: 'student_id', as: 'attendanceRecords' });

// StudentAchievement associations
StudentAchievement.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Student.hasMany(StudentAchievement, { foreignKey: 'student_id', as: 'achievements' });
StudentAchievement.belongsTo(School, { foreignKey: 'school_id', as: 'school' });
School.hasMany(StudentAchievement, { foreignKey: 'school_id', as: 'studentAchievements' });


module.exports = {
  sequelize,
  School,
  SchoolSetting,
  SchoolBranch,
  Role,
  Permission,
  RolePermission,
  User,
  Person,
  RefreshToken,
  PasswordResetToken,
  AcademicYear,
  Class,
  Section,
  Subject,
  Student,
  Teacher,
  Parent,
  LeavePolicy,
  LeaveRequest,
  LeavePeriodAssignment,
  SessionHour,
  TimetablePeriod,
  ClassTimetable,
  Holiday,
  Exam,
  ExamSchedule,
  StudentMark,
  GradingScale,
  Assignment,
  AssignmentSubmission,
  HostelBuilding,
  HostelRoom,
  SchoolGroup,
  SchoolGroupMember,
  StudentExit,
  StudentCertificate,
  AttendanceSession,
  AttendanceRecord,
  StudentAchievement
};
