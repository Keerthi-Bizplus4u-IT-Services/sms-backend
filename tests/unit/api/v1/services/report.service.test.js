/**
 * Unit tests for ReportService
 */

jest.mock('../../../../../src/api/v1/repositories/report.repository', () => ({
  feeReport: jest.fn(),
  expenseReport: jest.fn(),
  studentReport: jest.fn(),
  financialSummary: jest.fn()
}));

const reportService = require('../../../../../src/api/v1/services/report.service');
const reportRepository = require('../../../../../src/api/v1/repositories/report.repository');

describe('ReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('feeReport', () => {
    it('should delegate to repository with scope', async () => {
      const expected = { rows: [], totalCollected: 0 };
      reportRepository.feeReport.mockResolvedValue(expected);

      const scope = { schoolId: 1 };
      const result = await reportService.feeReport(scope);

      expect(reportRepository.feeReport).toHaveBeenCalledWith(scope);
      expect(result).toEqual(expected);
    });
  });

  describe('expenseReport', () => {
    it('should delegate to repository with scope', async () => {
      const expected = { rows: [], totalSpent: 0 };
      reportRepository.expenseReport.mockResolvedValue(expected);

      const result = await reportService.expenseReport({ schoolId: 2 });

      expect(reportRepository.expenseReport).toHaveBeenCalledWith({ schoolId: 2 });
      expect(result).toEqual(expected);
    });
  });

  describe('studentReport', () => {
    it('should delegate to repository with scope', async () => {
      const expected = [{ classId: 1, className: 'Class 1', studentCount: 30 }];
      reportRepository.studentReport.mockResolvedValue(expected);

      const result = await reportService.studentReport({});

      expect(reportRepository.studentReport).toHaveBeenCalledWith({});
      expect(result).toEqual(expected);
    });
  });

  describe('financialSummary', () => {
    it('should delegate to repository with scope', async () => {
      const expected = { totalIncome: 100, totalExpenditure: 50, netBalance: 50, feeBreakdown: [], expenseBreakdown: [] };
      reportRepository.financialSummary.mockResolvedValue(expected);

      const result = await reportService.financialSummary({ schoolId: 1, branchId: 2 });

      expect(reportRepository.financialSummary).toHaveBeenCalledWith({ schoolId: 1, branchId: 2 });
      expect(result).toEqual(expected);
    });

    it('should propagate repository errors', async () => {
      reportRepository.financialSummary.mockRejectedValue(new Error('DB fail'));
      await expect(reportService.financialSummary()).rejects.toThrow('DB fail');
    });
  });
});
