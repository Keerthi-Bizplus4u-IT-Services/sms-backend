const studentDashboardService = require('../services/student-dashboard.service');
const studentService = require('../services/student.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { resolveSchoolIdFromRequest } = require('../utils/context');

class StudentDashboardController {
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
    const data = await studentDashboardService.getDashboard(userId, resolveSchoolIdFromRequest(req));
    return success(res, data, 'Student dashboard fetched successfully', 200);
  });

  getMyProfile = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        data: null,
        errors: null
      });
    }
    const data = await studentService.getStudentByUserId(userId);
    return success(res, data, 'Student profile fetched successfully', 200);
  });
}

module.exports = new StudentDashboardController();
