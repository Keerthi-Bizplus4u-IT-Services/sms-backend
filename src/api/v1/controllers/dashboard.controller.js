const dashboardService = require('../services/dashboard.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { parsePositiveInt, resolveSchoolIdFromRequest } = require('../utils/context');

const resolveDashboardScope = (req) => {
  const schoolId = resolveSchoolIdFromRequest(req);
  const branchId = parsePositiveInt(req?.query?.branchId) || parsePositiveInt(req?.query?.branch_id);

  return {
    schoolId,
    branchId
  };
};

class DashboardController {
  getSummary = asyncHandler(async (req, res) => {
    const summary = await dashboardService.getSummary(resolveDashboardScope(req));
    return success(res, summary, 'Dashboard summary fetched successfully', 200);
  });

  getGenderCounts = asyncHandler(async (req, res) => {
    const counts = await dashboardService.getGenderCounts(resolveDashboardScope(req));
    return success(res, counts, 'Gender counts fetched successfully', 200);
  });

  getLibrarySummary = asyncHandler(async (req, res) => {
    const summary = await dashboardService.getLibrarySummary(resolveDashboardScope(req));
    return success(res, summary, 'Library dashboard summary fetched successfully', 200);
  });

  getSetupStatus = asyncHandler(async (req, res) => {
    const scope = resolveDashboardScope(req);
    const status = await dashboardService.getSetupStatus(scope);
    return success(res, status, 'Setup status fetched successfully', 200);
  });
}

module.exports = new DashboardController();
