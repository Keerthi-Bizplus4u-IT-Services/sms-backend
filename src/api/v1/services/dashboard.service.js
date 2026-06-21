const dashboardRepository = require('../repositories/dashboard.repository');
const libraryDashboardRepository = require('../repositories/library-dashboard.repository');
const schoolService = require('./school.service');
const { AppError } = require('../../../middleware/error.middleware');

class DashboardService {
  async getSummary(scope = {}) {
    return await dashboardRepository.getSummary(scope);
  }

  async getGenderCounts(scope = {}) {
    return await dashboardRepository.getGenderCounts(scope);
  }

  async getLibrarySummary(scope = {}) {
    return await libraryDashboardRepository.getSummary(scope);
  }

  async getSetupStatus(scope = {}) {
    const { schoolId } = scope;
    if (!schoolId) {
      throw new AppError('School context is required. Provide schoolId query parameter.', 400);
    }
    const checklist = await schoolService.getOnboardingChecklist(schoolId);
    // Return lightweight response without full school object
    return {
      school_id: checklist.school?.id,
      school_name: checklist.school?.name,
      is_setup_complete: checklist.is_setup_complete,
      mandatory_pending: checklist.mandatory_pending,
      optional_pending: checklist.optional_pending,
      total_progress: checklist.total_progress,
      steps: checklist.steps
    };
  }
}

module.exports = new DashboardService();
