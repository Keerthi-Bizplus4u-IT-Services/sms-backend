const attendanceRepository = require('../repositories/attendance.repository');
const parentDashboardRepository = require('../repositories/parent-dashboard.repository');
const { AppError } = require('../../../middleware/error.middleware');

const normalizeRoleName = (roleName) => {
  if (!roleName || typeof roleName !== 'string') {
    return '';
  }

  return roleName.trim().toLowerCase();
};

class AttendanceService {
  /**
   * Get attendance data.
   * For student role: only returns the logged-in student's data.
   * For admin/teacher: returns all students in the class/section.
   */
  async getAttendance({ classId, sectionId, month, schoolId, userId, roleName, selectedStudentId = null }) {
    let studentId = null;
    const normalizedRole = normalizeRoleName(roleName);

    if (normalizedRole === 'student') {
      const student = await attendanceRepository.findStudentByUserId(userId);
      if (!student) {
        throw Object.assign(new Error('Student profile not found'), { statusCode: 404 });
      }
      studentId = student.id;
      // Override class/section with student's actual enrollment
      classId = student.class_id;
      sectionId = student.section_id;
    } else if (normalizedRole === 'parent') {
      const parsedStudentId = parseInt(selectedStudentId, 10);
      if (!Number.isInteger(parsedStudentId) || parsedStudentId <= 0) {
        throw new AppError('Child is required for parent attendance', 400);
      }

      const parent = await parentDashboardRepository.findParentByUserId(userId);
      if (!parent) {
        throw new AppError('Parent record not found', 404);
      }

      const studentIds = await parentDashboardRepository.getStudentIdsByParentId(parent.id);
      const hasAccess = studentIds.some((id) => Number(id) === parsedStudentId);
      if (!hasAccess) {
        throw new AppError('You do not have access to this child', 403);
      }

      const students = await parentDashboardRepository.getStudentsByIds([parsedStudentId]);
      if (!students.length) {
        throw new AppError('Student not found', 404);
      }

      const student = students[0];
      studentId = student.id;
      classId = student.class_id;
      sectionId = student.section_id;
    } else {
      if (!classId || !sectionId) {
        throw Object.assign(new Error('Class and section are required'), { statusCode: 400 });
      }
    }

    return attendanceRepository.getAttendance({
      classId: parseInt(classId, 10),
      sectionId: parseInt(sectionId, 10),
      month: parseInt(month, 10),
      schoolId,
      studentId
    });
  }

  /**
   * Save attendance records (admin/teacher only).
   */
  async saveAttendance({ classId, sectionId, sessionHourId, schoolId, createdBy, userId, roleName, students, date }) {
    const normalizedRole = normalizeRoleName(roleName);
    const parsedClassId = parseInt(classId, 10);
    const parsedSectionId = parseInt(sectionId, 10);
    const sessionDate = date || new Date().toISOString().slice(0, 10);

    if (!Number.isInteger(parsedClassId) || !Number.isInteger(parsedSectionId)) {
      throw new AppError('Valid class and section are required', 400);
    }

    if (!Array.isArray(students) || students.length === 0) {
      throw new AppError('At least one student attendance record is required', 400);
    }

    if (normalizedRole === 'teacher') {
      const canTakeAttendance = await attendanceRepository.teacherCanTakeAttendance({
        userId,
        schoolId,
        classId: parsedClassId,
        sectionId: parsedSectionId
      });

      if (!canTakeAttendance) {
        throw new AppError('Only the teacher mapped to this class and section can take attendance', 403);
      }
    }

    const existingSession = await attendanceRepository.findDailyAttendanceSession({
      classId: parsedClassId,
      sectionId: parsedSectionId,
      schoolId,
      sessionDate
    });

    if (existingSession) {
      throw new AppError('Attendance has already been taken for this class and section today', 409);
    }

    return attendanceRepository.saveAttendance({
      classId: parsedClassId,
      sectionId: parsedSectionId,
      sessionHourId: sessionHourId && sessionHourId !== '-1' ? parseInt(sessionHourId, 10) : null,
      schoolId,
      createdBy,
      students,
      date: sessionDate
    });
  }
}

module.exports = new AttendanceService();
