/**
 * Unit tests for ReportRepository
 */

jest.mock('../../../../../src/config/database', () => {
  const queryMock = jest.fn();
  return {
    sequelize: {
      query: queryMock
    },
    Sequelize: {
      QueryTypes: {
        SELECT: 'SELECT'
      }
    }
  };
});

jest.mock('../../../../../src/api/v1/repositories/helpers/schema.utils', () => ({
  resolveTableName: jest.fn(),
  getTableColumns: jest.fn()
}));

const { sequelize } = require('../../../../../src/config/database');
const { resolveTableName, getTableColumns } = require('../../../../../src/api/v1/repositories/helpers/schema.utils');
const reportRepository = require('../../../../../src/api/v1/repositories/report.repository');

describe('ReportRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.query.mockReset();
    resolveTableName.mockReset();
    getTableColumns.mockReset();
  });

  describe('feeReport', () => {
    it('should return fee totals grouped by type', async () => {
      resolveTableName.mockResolvedValue('fee_payments');
      getTableColumns.mockResolvedValue(new Set(['id', 'amount', 'fee_type', 'status', 'deleted_at']));

      sequelize.query.mockResolvedValue([
        { fee_type: 'tuition', transaction_count: 50, total_amount: 100000 },
        { fee_type: 'transport', transaction_count: 20, total_amount: 15000 }
      ]);

      const result = await reportRepository.feeReport({ schoolId: 1 });

      expect(result.totalCollected).toBe(115000);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].feeType).toBe('tuition');
    });

    it('should return empty result when table does not exist', async () => {
      resolveTableName.mockResolvedValue(null);

      const result = await reportRepository.feeReport();

      expect(result).toEqual({ rows: [], totalCollected: 0 });
    });
  });

  describe('expenseReport', () => {
    it('should return expense totals grouped by type', async () => {
      resolveTableName.mockResolvedValue('expense');
      getTableColumns.mockResolvedValue(new Set(['exid', 'amount', 'exptype']));

      sequelize.query.mockResolvedValue([
        { expense_type: 'salary', entry_count: 30, total_amount: 200000 },
        { expense_type: 'supplies', entry_count: 10, total_amount: 5000 }
      ]);

      const result = await reportRepository.expenseReport();

      expect(result.totalSpent).toBe(205000);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].expenseType).toBe('salary');
    });

    it('should return empty when table does not exist', async () => {
      resolveTableName.mockResolvedValue(null);
      const result = await reportRepository.expenseReport();
      expect(result).toEqual({ rows: [], totalSpent: 0 });
    });
  });

  describe('studentReport', () => {
    it('should return student counts grouped by class', async () => {
      resolveTableName
        .mockResolvedValueOnce('students')
        .mockResolvedValueOnce('classes');
      getTableColumns.mockResolvedValue(new Set(['id', 'class_id', 'school_id', 'deleted_at']));

      sequelize.query.mockResolvedValue([
        { class_id: 1, class_name: 'Class 1', student_count: 40 },
        { class_id: 2, class_name: 'Class 2', student_count: 35 }
      ]);

      const result = await reportRepository.studentReport({ schoolId: 1 });

      expect(result).toHaveLength(2);
      expect(result[0].className).toBe('Class 1');
      expect(result[0].studentCount).toBe(40);
    });

    it('should return empty when students table not found', async () => {
      resolveTableName.mockResolvedValue(null);
      const result = await reportRepository.studentReport();
      expect(result).toEqual([]);
    });
  });

  describe('financialSummary', () => {
    it('should return combined income vs expenditure', async () => {
      // Fee report resolution
      resolveTableName
        .mockResolvedValueOnce('fee_payments')   // feeReport
        .mockResolvedValueOnce('expense');        // expenseReport

      getTableColumns
        .mockResolvedValueOnce(new Set(['id', 'amount', 'fee_type', 'status']))
        .mockResolvedValueOnce(new Set(['exid', 'amount', 'exptype']));

      sequelize.query
        .mockResolvedValueOnce([{ fee_type: 'tuition', transaction_count: 10, total_amount: 50000 }])
        .mockResolvedValueOnce([{ expense_type: 'salary', entry_count: 5, total_amount: 30000 }]);

      const result = await reportRepository.financialSummary();

      expect(result.totalIncome).toBe(50000);
      expect(result.totalExpenditure).toBe(30000);
      expect(result.netBalance).toBe(20000);
      expect(result.feeBreakdown).toHaveLength(1);
      expect(result.expenseBreakdown).toHaveLength(1);
    });
  });
});
