jest.mock('../../../../../src/api/v1/services/student-dashboard.service', () => ({
  getDashboard: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  resolveSchoolIdFromRequest: jest.fn()
}));

const studentDashboardController = require('../../../../../src/api/v1/controllers/student-dashboard.controller');
const studentDashboardService = require('../../../../../src/api/v1/services/student-dashboard.service');
const { success } = require('../../../../../src/utils/response');
const { resolveSchoolIdFromRequest } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('StudentDashboardController', () => {
  let req, res, next;
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    resolveSchoolIdFromRequest.mockReturnValue(1);
    req.user = { id: 10, roleName: 'student', schoolId: 1 };
  });
  describe('getDashboard', () => {
    it('should retrieve student dashboard', async () => {
      const dashData = { attendance: 95 };
      studentDashboardService.getDashboard.mockResolvedValue(dashData);
      await studentDashboardController.getDashboard(req, res, next);
      expect(studentDashboardService.getDashboard).toHaveBeenCalledWith(10, 1);
      expect(success).toHaveBeenCalledWith(res, dashData, expect.any(String), 200);
    });
    it('should return 401 when userId missing', async () => {
      req.user = {};
      await studentDashboardController.getDashboard(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });
});
