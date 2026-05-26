const teacherDashboardService = require('../services/teacher-dashboard.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { resolveSchoolIdFromRequest } = require('../utils/context');

class TeacherDashboardController {
  getDashboard = asyncHandler(async (req, res) => {
    const data = await teacherDashboardService.getDashboard({
      userId: req.user?.id,
      schoolId: resolveSchoolIdFromRequest(req)
    });
    return success(res, data, 'Teacher dashboard fetched successfully', 200);
  });
}

module.exports = new TeacherDashboardController();
