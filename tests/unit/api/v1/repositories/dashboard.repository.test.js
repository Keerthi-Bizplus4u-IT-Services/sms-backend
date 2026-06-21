/**
 * Unit tests for DashboardRepository
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
const dashboardRepository = require('../../../../../src/api/v1/repositories/dashboard.repository');

describe('DashboardRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.query.mockReset();
    resolveTableName.mockReset();
    getTableColumns.mockReset();
  });

  describe('getSummary', () => {
    it('should return aggregated counts from all tables', async () => {
      resolveTableName.mockImplementation(async (candidates) => candidates[0]);

      getTableColumns.mockImplementation(async (table) => {
        switch (table) {
          case 'students':
          case 'teachers':
          case 'parents':
            return new Set(['id', 'person_id', 'school_id', 'deleted_at']);
          case 'schools':
            return new Set(['id', 'deleted_at']);
          case 'classes':
          case 'sections':
            return new Set(['id', 'school_id', 'deleted_at']);
          case 'notices':
            return new Set(['id', 'title', 'school_id', 'deleted_at', 'is_published']);
          case 'fee_payments':
            return new Set(['id', 'amount', 'school_id', 'deleted_at', 'status']);
          case 'expenses':
            return new Set(['id', 'amount', 'school_id', 'deleted_at', 'status']);
          default:
            return new Set(['id']);
        }
      });

      sequelize.query.mockImplementation(async (query) => {
        if (query.includes('FROM "students"')) return [{ total: 150 }];
        if (query.includes('FROM "teachers"')) return [{ total: 20 }];
        if (query.includes('FROM "parents"')) return [{ total: 65 }];
        if (query.includes('FROM "schools"')) return [{ total: 3 }];
        if (query.includes('FROM "classes"')) return [{ total: 18 }];
        if (query.includes('FROM "sections"')) return [{ total: 42 }];
        if (query.includes('FROM "notices"')) return [{ total: 5 }];
        if (query.includes('FROM "fee_payments"')) return [{ total: 500000 }];
        if (query.includes('FROM "expenses"')) return [{ total: 125000 }];
        return [{ total: 0 }];
      });

      const result = await dashboardRepository.getSummary();

      expect(result).toEqual({
        studentCount: 150,
        teacherCount: 20,
        parentCount: 65,
        schoolCount: 3,
        classCount: 18,
        sectionCount: 42,
        noticeCount: 5,
        totalFeesPaid: 500000,
        totalExpenses: 125000,
        hasEarningsData: true,
        hasExpenseData: true
      });
    });

    it('should return zeros when tables do not exist', async () => {
      resolveTableName.mockResolvedValue(null);

      const result = await dashboardRepository.getSummary();

      expect(result).toEqual({
        studentCount: 0,
        teacherCount: 0,
        parentCount: 0,
        schoolCount: 0,
        classCount: 0,
        sectionCount: 0,
        noticeCount: 0,
        totalFeesPaid: 0,
        totalExpenses: 0,
        hasEarningsData: false,
        hasExpenseData: false
      });
    });
  });

  describe('getGenderCounts', () => {
    it('should return gender breakdown from students joined with persons', async () => {
      resolveTableName
        .mockResolvedValueOnce('students')
        .mockResolvedValueOnce('persons');

      getTableColumns
        .mockResolvedValueOnce(new Set(['id', 'person_id', 'deleted_at']))
        .mockResolvedValueOnce(new Set(['id', 'gender', 'deleted_at']));

      sequelize.query.mockResolvedValue([
        { label: 'male', counts: 80 },
        { label: 'female', counts: 65 },
        { label: 'other', counts: 5 }
      ]);

      const result = await dashboardRepository.getGenderCounts();

      expect(result).toEqual([
        { label: 'male', counts: 80 },
        { label: 'female', counts: 65 },
        { label: 'other', counts: 5 }
      ]);
      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY label'),
        expect.objectContaining({ type: 'SELECT' })
      );
    });

    it('should return empty array when student table does not exist', async () => {
      resolveTableName.mockResolvedValueOnce(null);

      const result = await dashboardRepository.getGenderCounts();

      expect(result).toEqual([]);
    });

    it('should return empty array when person table does not exist', async () => {
      resolveTableName
        .mockResolvedValueOnce('students')
        .mockResolvedValueOnce(null);

      const result = await dashboardRepository.getGenderCounts();

      expect(result).toEqual([]);
    });

    it('should handle tables without deleted_at column', async () => {
      resolveTableName
        .mockResolvedValueOnce('students')
        .mockResolvedValueOnce('persons');

      getTableColumns
        .mockResolvedValueOnce(new Set(['id', 'person_id']))
        .mockResolvedValueOnce(new Set(['id', 'gender']));

      sequelize.query.mockResolvedValue([
        { label: 'male', counts: 50 }
      ]);

      const result = await dashboardRepository.getGenderCounts();

      expect(result).toEqual([{ label: 'male', counts: 50 }]);
      // Query should NOT contain deleted_at filter
      const queryCall = sequelize.query.mock.calls[0][0];
      expect(queryCall).not.toContain('deleted_at');
    });

    it('should coerce count values to numbers', async () => {
      resolveTableName
        .mockResolvedValueOnce('students')
        .mockResolvedValueOnce('persons');

      getTableColumns
        .mockResolvedValueOnce(new Set(['id', 'person_id']))
        .mockResolvedValueOnce(new Set(['id', 'gender']));

      sequelize.query.mockResolvedValue([
        { label: 'male', counts: '80' },
        { label: null, counts: '5' }
      ]);

      const result = await dashboardRepository.getGenderCounts();

      expect(result).toEqual([
        { label: 'male', counts: 80 },
        { label: 'other', counts: 5 }
      ]);
    });
  });
});
