/**
 * Unit tests for ReportController
 */

jest.mock('../../../../../src/api/v1/services/report.service', () => ({
  dataIntegrityPreview: jest.fn(),
  feeReport: jest.fn(),
  expenseReport: jest.fn(),
  studentReport: jest.fn(),
  financialSummary: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  resolveSchoolIdFromRequest: jest.fn(),
  parsePositiveInt: jest.fn((v) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) || n <= 0 ? null : n;
  })
}));

const reportController = require('../../../../../src/api/v1/controllers/report.controller');
const reportService = require('../../../../../src/api/v1/services/report.service');
const { success } = require('../../../../../src/utils/response');
const { resolveSchoolIdFromRequest, parsePositiveInt } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse } = require('../../../../helpers/testUtils');

describe('ReportController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest({ user: { schoolId: 1, roleName: 'admin' } });
    req.query = { branchId: '2' };
    res = mockResponse();
    success.mockReturnValue(res);
    resolveSchoolIdFromRequest.mockReturnValue(1);
    parsePositiveInt.mockImplementation((v) => {
      const n = parseInt(v, 10);
      return Number.isNaN(n) || n <= 0 ? null : n;
    });
  });

  describe('getDataIntegrityPreview', () => {
    it('should return data integrity preview with scope', async () => {
      const data = { orphanStudents: 0, missingParents: 0 };
      reportService.dataIntegrityPreview.mockResolvedValue(data);

      await reportController.getDataIntegrityPreview(req, res);

      expect(reportService.dataIntegrityPreview).toHaveBeenCalledWith(
        expect.objectContaining({ schoolId: 1, branchId: 2 })
      );
      expect(success).toHaveBeenCalledWith(res, data, 'Data integrity preview generated successfully', 200);
    });
  });

  describe('getFeeReport', () => {
    it('should return fee report with scope', async () => {
      const data = { rows: [], totalCollected: 0 };
      reportService.feeReport.mockResolvedValue(data);

      await reportController.getFeeReport(req, res);

      expect(reportService.feeReport).toHaveBeenCalledWith(
        expect.objectContaining({ schoolId: 1, branchId: 2 })
      );
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

      expect(reportService.expenseReport).toHaveBeenCalledWith(
        expect.objectContaining({ schoolId: 1, branchId: 2 })
      );
      expect(success).toHaveBeenCalledWith(res, data, 'Expense report generated successfully', 200);
    });
  });

  describe('getStudentReport', () => {
    it('should return student enrollment report', async () => {
      const data = [{ classId: 1, className: 'Class 1', studentCount: 40 }];
      reportService.studentReport.mockResolvedValue(data);

      await reportController.getStudentReport(req, res);

      expect(reportService.studentReport).toHaveBeenCalledWith(
        expect.objectContaining({ schoolId: 1, branchId: 2 })
      );
      expect(success).toHaveBeenCalledWith(res, data, 'Student report generated successfully', 200);
    });
  });

  describe('getFinancialSummary', () => {
    it('should return combined financial summary', async () => {
      const data = { totalIncome: 50000, totalExpenditure: 30000, netBalance: 20000, feeBreakdown: [], expenseBreakdown: [] };
      reportService.financialSummary.mockResolvedValue(data);

      await reportController.getFinancialSummary(req, res);

      expect(reportService.financialSummary).toHaveBeenCalledWith(
        expect.objectContaining({ schoolId: 1, branchId: 2 })
      );
      expect(success).toHaveBeenCalledWith(res, data, 'Financial summary generated successfully', 200);
    });

    it('should allow super_admin global report scope with null school id', async () => {
      req.user = { roleName: 'super_admin', schoolId: null };
      req.query = {};
      resolveSchoolIdFromRequest.mockReturnValue(null);
      reportService.financialSummary.mockResolvedValue({ totalIncome: 10, totalExpenditure: 5, netBalance: 5, feeBreakdown: [], expenseBreakdown: [] });

      await reportController.getFinancialSummary(req, res);

      expect(reportService.financialSummary).toHaveBeenCalledWith(
        expect.objectContaining({ schoolId: null, branchId: null })
      );
    });
  });
});
