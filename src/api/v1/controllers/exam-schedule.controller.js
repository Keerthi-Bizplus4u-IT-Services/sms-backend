const examScheduleService = require('../services/exam-schedule.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { ensureSchoolContext } = require('../utils/context');

class ExamScheduleController {
  getExamSchedules = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const schedules = await examScheduleService.getExamSchedules(
      {
        academicYearId: req.query.academicYearId,
        studentId: req.query.studentId
      },
      {
        schoolId,
        userId: req.user?.id,
        roleName: req.user?.roleName || req.user?.role
      }
    );

    return success(res, schedules, 'Exam schedules retrieved successfully', 200);
  });

  createLegacySchedule = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const schedule = await examScheduleService.createLegacySchedule(req.body, { schoolId });
    return success(res, schedule, 'Exam schedule saved successfully', 201);
  });

  deleteLegacySchedule = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const result = await examScheduleService.deleteLegacySchedule(req.params.id, { schoolId });
    return success(res, result, 'Exam schedule deleted successfully', 200);
  });
}

module.exports = new ExamScheduleController();