const parentDashboardService = require('../services/parent-dashboard.service');
const classTimetableService = require('../services/class-timetable.service');
const parentDashboardRepository = require('../repositories/parent-dashboard.repository');
const classTimetableRepository = require('../repositories/class-timetable.repository');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { AppError } = require('../../../middleware/error.middleware');
const { resolveSchoolIdFromRequest, parsePositiveInt } = require('../utils/context');

class ParentDashboardController {
  getDashboard = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        data: null,
        errors: null
      });
    }
    const data = await parentDashboardService.getDashboard(userId, resolveSchoolIdFromRequest(req));
    return success(res, data, 'Parent dashboard fetched successfully', 200);
  });

  /**
   * GET /parent/my-children
   * Returns the list of children linked to the authenticated parent
   */
  getMyChildren = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const parent = await parentDashboardRepository.findParentByUserId(userId);
    if (!parent) {
      throw new AppError('Parent record not found', 404);
    }
    const studentIds = await parentDashboardRepository.getStudentIdsByParentId(parent.id);
    const students = await parentDashboardRepository.getStudentsByIds(studentIds);
    return success(res, students, 'Children retrieved successfully');
  });

  /**
   * GET /parent/child-timetable/:studentId
   * Returns the weekly timetable for a specific child
   */
  getChildTimetable = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const studentId = parsePositiveInt(req.params.studentId);
    const schoolId = resolveSchoolIdFromRequest(req);

    // Verify parent-child relationship
    const parent = await parentDashboardRepository.findParentByUserId(userId);
    if (!parent) {
      throw new AppError('Parent record not found', 404);
    }
    const studentIds = await parentDashboardRepository.getStudentIdsByParentId(parent.id);
    const hasAccess = studentIds.some((id) => Number(id) === studentId);
    if (!hasAccess) {
      throw new AppError('You do not have access to this student\'s timetable', 403);
    }

    // Get student's class and section
    const students = await parentDashboardRepository.getStudentsByIds([studentId]);
    if (!students.length) {
      throw new AppError('Student not found', 404);
    }
    const student = students[0];

    const data = await classTimetableRepository.findScheduleByClassSection(
      student.class_id, student.section_id, schoolId
    );
    return success(res, data, 'Child timetable retrieved successfully');
  });
}

module.exports = new ParentDashboardController();
