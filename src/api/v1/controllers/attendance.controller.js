const attendanceService = require('../services/attendance.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');

class AttendanceController {
  normalizeAttendanceDate(inputDate, monthValue) {
    if (typeof inputDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
      return inputDate;
    }

    const now = new Date();
    const month = parseInt(monthValue, 10) || (now.getMonth() + 1);
    return `${now.getFullYear()}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  normalizeStudentAttendance(students, attendanceMap) {
    if (Array.isArray(students) && students.length > 0) {
      return students;
    }

    if (!attendanceMap || typeof attendanceMap !== 'object') {
      return [];
    }

    return Object.entries(attendanceMap).map(([id, isPresent]) => ({
      id,
      attendance: isPresent ? 'P' : 'A'
    }));
  }

  /**
   * POST /api/v1/getattendence
   * Get attendance records for a class/section/month.
   * Students see only their own data.
   */
  getAttendance = asyncHandler(async (req, res) => {
    const schoolId = req.user?.schoolId || 1;
    const userId = req.user?.id;
    const roleName = req.user?.roleName;

    const { sclass, section, attendenncemonth, studentId, childId } = req.body;

    const items = await attendanceService.getAttendance({
      classId: sclass,
      sectionId: section,
      month: attendenncemonth,
      schoolId,
      userId,
      roleName,
      selectedStudentId: studentId || childId
    });

    return success(res, { items }, 'Attendance retrieved successfully', 200);
  });

  /**
   * POST /api/v1/saveattendance
   * Save attendance records (admin/teacher only).
   */
  saveAttendance = asyncHandler(async (req, res) => {
    const schoolId = req.user?.schoolId || 1;
    const createdBy = req.user?.id;
    const roleName = req.user?.roleName || req.user?.role || null;

    const {
      sclass,
      section,
      classId,
      sectionId,
      sessionhours,
      students,
      attendance,
      attendenncemonth,
      adate
    } = req.body;

    const normalizedStudents = this.normalizeStudentAttendance(students, attendance);
    const date = this.normalizeAttendanceDate(adate, attendenncemonth);

    const result = await attendanceService.saveAttendance({
      classId: classId || sclass,
      sectionId: sectionId || section,
      sessionHourId: sessionhours || '-1',
      schoolId,
      createdBy,
      userId: createdBy,
      roleName,
      students: normalizedStudents,
      date
    });

    return success(res, result, 'Attendance saved successfully', 200);
  });
}

module.exports = new AttendanceController();
