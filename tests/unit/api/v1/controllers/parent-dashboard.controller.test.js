jest.mock('../../../../../src/api/v1/services/parent-dashboard.service', () => ({
  getDashboard: jest.fn()
}));
jest.mock('../../../../../src/api/v1/services/class-timetable.service', () => ({
  getByClassSection: jest.fn()
}));
jest.mock('../../../../../src/api/v1/repositories/parent-dashboard.repository', () => ({
  findParentByUserId: jest.fn(),
  getStudentIdsByParentId: jest.fn(),
  getStudentsByIds: jest.fn()
}));
jest.mock('../../../../../src/api/v1/repositories/class-timetable.repository', () => ({
  findScheduleByClassSection: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  resolveSchoolIdFromRequest: jest.fn(),
  parsePositiveInt: jest.fn((v) => { const n = parseInt(v, 10); return Number.isNaN(n) || n <= 0 ? null : n; })
}));

const parentDashCtrl = require('../../../../../src/api/v1/controllers/parent-dashboard.controller');
const parentDashSvc = require('../../../../../src/api/v1/services/parent-dashboard.service');
const { success } = require('../../../../../src/utils/response');
const { resolveSchoolIdFromRequest } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('ParentDashboardController', () => {
  let req, res, next;
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    resolveSchoolIdFromRequest.mockReturnValue(1);
    req.user = { id: 15, roleName: 'parent', schoolId: 1 };
  });
  describe('getDashboard', () => {
    it('should retrieve parent dashboard', async () => {
      const dashData = { children: [] };
      parentDashSvc.getDashboard.mockResolvedValue(dashData);
      await parentDashCtrl.getDashboard(req, res, next);
      expect(parentDashSvc.getDashboard).toHaveBeenCalledWith(15, 1);
      expect(success).toHaveBeenCalledWith(res, dashData, 'Parent dashboard fetched successfully', 200);
    });
    it('should return 401 when userId missing', async () => {
      req.user = {};
      await parentDashCtrl.getDashboard(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });
});
