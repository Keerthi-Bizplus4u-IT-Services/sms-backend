const reportService = require('../services/report.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { parsePositiveInt, resolveSchoolIdFromRequest } = require('../utils/context');

const resolveReportScope = (req) => ({
  schoolId: resolveSchoolIdFromRequest(req),
  branchId: parsePositiveInt(req?.query?.branchId) || parsePositiveInt(req?.query?.branch_id)
});

class ReportController {
  getDataIntegrityPreview = asyncHandler(async (req, res) => {
    const data = await reportService.dataIntegrityPreview(resolveReportScope(req));
    return success(res, data, 'Data integrity preview generated successfully', 200);
  });

  getFeeReport = asyncHandler(async (req, res) => {
    const data = await reportService.feeReport(resolveReportScope(req));
    return success(res, data, 'Fee report generated successfully', 200);
  });

  getExpenseReport = asyncHandler(async (req, res) => {
    const data = await reportService.expenseReport(resolveReportScope(req));
    return success(res, data, 'Expense report generated successfully', 200);
  });

  getStudentReport = asyncHandler(async (req, res) => {
    const data = await reportService.studentReport(resolveReportScope(req));
    return success(res, data, 'Student report generated successfully', 200);
  });

  getFinancialSummary = asyncHandler(async (req, res) => {
    const data = await reportService.financialSummary(resolveReportScope(req));
    return success(res, data, 'Financial summary generated successfully', 200);
  });
}

module.exports = new ReportController();
