/**
 * Unit tests for ReportController
 */

jest.mock('../../../../../src/api/v1/services/report.service', () => ({
  feeReport: jest.fn(),
  expenseReport: jest.fn(),
  studentReport: jest.fn(),
  financialSummary: jest.fn()
}));
jest.mock('../../../../../src/utils/response');

const reportController = require('../../../../../src/api/v1/controllers/report.controller');
const reportService = require('../../../../../src/api/v1/services/report.service');
const { success } = require('../../../../../src/utils/response');
const { mockRequest, mockResponse } = require('../../../../helpers/testUtils');

describe('ReportController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest({ user: { schoolId: 1, roleName: 'admin' } });
    res = mockResponse();
    success.mockReturnValue(res);
  });

  describe('getFeeReport', () => {
    it('should return fee report with scope', async () => {
      const data = { rows: [], totalCollected: 0 };
      reportService.feeReport.mockResolvedValue(data);

      await reportController.getFeeReport(req, res);

      expect(reportService.feeReport).toHaveBeenCalledTimes(1);
      expect(success).toHaveBeenCalledWith(res, data, 'Fee report generated successfully', 200);
    });

    it('should propagate service errors', async () => {
      reportService.feeReport.mockRejectedValue(new Error('DB error'));
      await expect(reportController.getFeeReport(req, res)).rejects.toThrow('DB error');
    });
  });

  describe('getExpenseReport', () => {
    it('should return expense report with scope', async () => {
      const data = { rows: [], totalSpent: 0 };
      reportService.expenseReport.mockResolvedValue(data);

      await reportController.getExpenseReport(req, res);

      expect(reportService.expenseReport).toHaveBeenCalledTimes(1);
      expect(success).toHaveBeenCalledWith(res, data, 'Expense report generated successfully', 200);
    });
  });

  describe('getStudentReport', () => {
    it('should return student enrollment report', async () => {
      const data = [{ classId: 1, className: 'Class 1', studentCount: 40 }];
      reportService.studentReport.mockResolvedValue(data);

      await reportController.getStudentReport(req, res);

      expect(reportService.studentReport).toHaveBeenCalledTimes(1);
      expect(success).toHaveBeenCalledWith(res, data, 'Student report generated successfully', 200);
    });
  });

  describe('getFinancialSummary', () => {
    it('should return combined financial summary', async () => {
      const data = { totalIncome: 50000, totalExpenditure: 30000, netBalance: 20000, feeBreakdown: [], expenseBreakdown: [] };
      reportService.financialSummary.mockResolvedValue(data);

      await reportController.getFinancialSummary(req, res);

      expect(reportService.financialSummary).toHaveBeenCalledTimes(1);
      expect(success).toHaveBeenCalledWith(res, data, 'Financial summary generated successfully', 200);
    });
  });
});
