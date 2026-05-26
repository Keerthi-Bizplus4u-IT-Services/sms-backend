const achievementRepository = require('../repositories/achievement.repository');
const parentDashboardRepository = require('../repositories/parent-dashboard.repository');
const { AppError } = require('../../../middleware/error.middleware');

class AchievementService {
  /**
   * Get achievements for a parent's children
   */
  async getParentChildrenAchievements(userId, { page = 1, limit = 20 } = {}) {
    const parent = await parentDashboardRepository.findParentByUserId(userId);
    if (!parent) {
      throw new AppError('Parent profile not found for this user', 403);
    }

    const studentIds = await parentDashboardRepository.getStudentIdsByParentId(parent.id);
    if (!studentIds.length) {
      return { achievements: [], total: 0, page, limit };
    }

    const result = await achievementRepository.getAchievementsByStudentIds(studentIds, { page, limit });

    const achievements = result.achievements.map((a) => {
      const plain = a.toJSON ? a.toJSON() : a;
      const person = plain.student?.person || {};
      return {
        id: plain.id,
        title: plain.title,
        description: plain.description,
        achievementType: plain.achievement_type,
        category: plain.category,
        awardedDate: plain.awarded_date,
        awardedBy: plain.awarded_by,
        studentName: person.first_name
          ? `${person.first_name} ${(person.last_name || '').trim()}`.trim()
          : `Student ${plain.student_id}`,
        className: plain.student?.class?.name || '',
        sectionName: plain.student?.section?.name || ''
      };
    });

    return {
      achievements,
      total: result.total,
      page,
      limit
    };
  }

  /**
   * Count achievements for a parent's children (for dashboard stat)
   */
  async countParentChildrenAchievements(userId) {
    const parent = await parentDashboardRepository.findParentByUserId(userId);
    if (!parent) return 0;

    const studentIds = await parentDashboardRepository.getStudentIdsByParentId(parent.id);
    if (!studentIds.length) return 0;

    return achievementRepository.countByStudentIds(studentIds);
  }

  /**
   * Create an achievement (admin use)
   */
  async createAchievement(data) {
    return achievementRepository.create(data);
  }

  /**
   * Get achievements by school (admin use)
   */
  async getSchoolAchievements(schoolId, { page = 1, limit = 20 } = {}) {
    const result = await achievementRepository.getBySchoolId(schoolId, { page, limit });

    const achievements = result.achievements.map((a) => {
      const plain = a.toJSON ? a.toJSON() : a;
      const person = plain.student?.person || {};
      return {
        id: plain.id,
        title: plain.title,
        description: plain.description,
        achievementType: plain.achievement_type,
        category: plain.category,
        awardedDate: plain.awarded_date,
        awardedBy: plain.awarded_by,
        studentName: person.first_name
          ? `${person.first_name} ${(person.last_name || '').trim()}`.trim()
          : `Student ${plain.student_id}`,
        className: plain.student?.class?.name || '',
        sectionName: plain.student?.section?.name || ''
      };
    });

    return {
      achievements,
      total: result.total,
      page,
      limit
    };
  }
}

module.exports = new AchievementService();
