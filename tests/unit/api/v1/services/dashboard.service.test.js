/**
 * Unit tests for DashboardService
 */

jest.mock('../../../../../src/api/v1/repositories/dashboard.repository', () => ({
  getSummary: jest.fn(),
  getGenderCounts: jest.fn()
}));

jest.mock('../../../../../src/api/v1/repositories/library-dashboard.repository', () => ({
  getSummary: jest.fn()
}));

const dashboardService = require('../../../../../src/api/v1/services/dashboard.service');
const dashboardRepository = require('../../../../../src/api/v1/repositories/dashboard.repository');
const libraryDashboardRepository = require('../../../../../src/api/v1/repositories/library-dashboard.repository');

describe('DashboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should delegate to repository and return summary', async () => {
      const expected = {
        studentCount: 100,
        teacherCount: 15,
        parentCount: 80,
        schoolCount: 2,
        classCount: 12,
        sectionCount: 24,
        noticeCount: 3,
        totalFeesPaid: 250000,
        totalExpenses: 120000,
        hasEarningsData: true,
        hasExpenseData: true
      };
      dashboardRepository.getSummary.mockResolvedValue(expected);

      const result = await dashboardService.getSummary();

      expect(dashboardRepository.getSummary).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expected);
    });

    it('should propagate repository errors', async () => {
      dashboardRepository.getSummary.mockRejectedValue(new Error('DB error'));

      await expect(dashboardService.getSummary()).rejects.toThrow('DB error');
    });
  });

  describe('getGenderCounts', () => {
    it('should delegate to repository and return gender counts', async () => {
      const expected = [
        { label: 'male', counts: 55 },
        { label: 'female', counts: 40 },
        { label: 'other', counts: 5 }
      ];
      dashboardRepository.getGenderCounts.mockResolvedValue(expected);

      const result = await dashboardService.getGenderCounts();

      expect(dashboardRepository.getGenderCounts).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expected);
    });

    it('should return empty array when repository returns empty', async () => {
      dashboardRepository.getGenderCounts.mockResolvedValue([]);

      const result = await dashboardService.getGenderCounts();

      expect(result).toEqual([]);
    });

    it('should propagate repository errors', async () => {
      dashboardRepository.getGenderCounts.mockRejectedValue(new Error('Query error'));

      await expect(dashboardService.getGenderCounts()).rejects.toThrow('Query error');
    });
  });

  describe('getLibrarySummary', () => {
    it('should delegate to repository and return library dashboard shape', async () => {
      const expected = {
        totalBooks: 130,
        totalCopies: 500,
        availableCopies: 420,
        issuedCopies: 80,
        totalCategories: 11,
        categoryBreakdown: [
          { category: 'Science', bookCount: 30, totalCopies: 120, availableCopies: 95 }
        ],
        issuedBooks: 70,
        overdueBooks: 9,
        recentTransactions: [
          {
            id: 1,
            bookTitle: 'Physics Fundamentals',
            borrowerType: 'student',
            status: 'issued',
            issueDate: '2026-04-01',
            dueDate: '2026-04-10',
            returnDate: null,
            fineAmount: 0
          }
        ],
        totalFinesCollected: 350
      };

      libraryDashboardRepository.getSummary.mockResolvedValue(expected);

      const result = await dashboardService.getLibrarySummary();

      expect(libraryDashboardRepository.getSummary).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expected);
    });

    it('should propagate library repository errors', async () => {
      libraryDashboardRepository.getSummary.mockRejectedValue(new Error('Library query error'));

      await expect(dashboardService.getLibrarySummary()).rejects.toThrow('Library query error');
    });
  });
});
