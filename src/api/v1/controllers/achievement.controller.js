const achievementService = require('../services/achievement.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { resolveSchoolIdFromRequest } = require('../utils/context');

class AchievementController {
  /**
   * GET /parent/achievements
   * Returns achievements for the authenticated parent's children
   */
  getParentAchievements = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        data: null,
        errors: null
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const data = await achievementService.getParentChildrenAchievements(userId, { page, limit });
    return success(res, data, 'Achievements fetched successfully', 200);
  });

  /**
   * GET /achievements
   * Returns achievements for the school (admin use)
   */
  getSchoolAchievements = asyncHandler(async (req, res) => {
    const schoolId = resolveSchoolIdFromRequest(req);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const data = await achievementService.getSchoolAchievements(schoolId, { page, limit });
    return success(res, data, 'Achievements fetched successfully', 200);
  });

  /**
   * POST /achievements
   * Create a new achievement (admin use)
   */
  createAchievement = asyncHandler(async (req, res) => {
    const schoolId = resolveSchoolIdFromRequest(req);
    const { studentId, title, description, achievementType, category, awardedDate, awardedBy } = req.body;

    const achievement = await achievementService.createAchievement({
      student_id: studentId,
      school_id: schoolId,
      title,
      description: description || null,
      achievement_type: achievementType || 'award',
      category: category || null,
      awarded_date: awardedDate,
      awarded_by: awardedBy || null
    });

    return success(res, achievement, 'Achievement created successfully', 201);
  });
}

module.exports = new AchievementController();
