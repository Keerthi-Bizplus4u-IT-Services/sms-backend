/**
 * Unit tests for DashboardController
 */

jest.mock('../../../../../src/api/v1/services/dashboard.service', () => ({
  getSummary: jest.fn(),
  getGenderCounts: jest.fn()
}));
jest.mock('../../../../../src/utils/response');

const dashboardController = require('../../../../../src/api/v1/controllers/dashboard.controller');
const dashboardService = require('../../../../../src/api/v1/services/dashboard.service');
const { success } = require('../../../../../src/utils/response');
const { mockRequest, mockResponse } = require('../../../../helpers/testUtils');

describe('DashboardController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = mockRequest();
    res = mockResponse();
    success.mockReturnValue(res);
  });

  describe('getSummary', () => {
    it('should return dashboard summary successfully', async () => {
      const summaryData = {
        studentCount: 150,
        teacherCount: 20,
        noticeCount: 5,
        totalFeesPaid: 500000
      };
      dashboardService.getSummary.mockResolvedValue(summaryData);

      await dashboardController.getSummary(req, res);

      expect(dashboardService.getSummary).toHaveBeenCalledTimes(1);
      expect(success).toHaveBeenCalledWith(res, summaryData, 'Dashboard summary fetched successfully', 200);
    });

    it('should return zero counts when no data exists', async () => {
      const emptyData = {
        studentCount: 0,
        teacherCount: 0,
        noticeCount: 0,
        totalFeesPaid: 0
      };
      dashboardService.getSummary.mockResolvedValue(emptyData);

      await dashboardController.getSummary(req, res);

      expect(success).toHaveBeenCalledWith(res, emptyData, 'Dashboard summary fetched successfully', 200);
    });

    it('should propagate service errors', async () => {
      dashboardService.getSummary.mockRejectedValue(new Error('DB connection failed'));

      await expect(dashboardController.getSummary(req, res)).rejects.toThrow('DB connection failed');
    });
  });

  describe('getGenderCounts', () => {
    it('should return gender breakdown successfully', async () => {
      const genderData = [
        { label: 'male', counts: 80 },
        { label: 'female', counts: 65 },
        { label: 'other', counts: 5 }
      ];
      dashboardService.getGenderCounts.mockResolvedValue(genderData);

      await dashboardController.getGenderCounts(req, res);

      expect(dashboardService.getGenderCounts).toHaveBeenCalledTimes(1);
      expect(success).toHaveBeenCalledWith(res, genderData, 'Gender counts fetched successfully', 200);
    });

    it('should return empty array when no students exist', async () => {
      dashboardService.getGenderCounts.mockResolvedValue([]);

      await dashboardController.getGenderCounts(req, res);

      expect(success).toHaveBeenCalledWith(res, [], 'Gender counts fetched successfully', 200);
    });

    it('should propagate service errors', async () => {
      dashboardService.getGenderCounts.mockRejectedValue(new Error('Query failed'));

      await expect(dashboardController.getGenderCounts(req, res)).rejects.toThrow('Query failed');
    });
  });
});
