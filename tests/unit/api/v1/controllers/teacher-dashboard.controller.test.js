jest.mock('../../../../../src/api/v1/services/teacher-dashboard.service', () => ({
  getDashboard: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  resolveSchoolIdFromRequest: jest.fn()
}));

const teacherDashCtrl = require('../../../../../src/api/v1/controllers/teacher-dashboard.controller');
const teacherDashSvc = require('../../../../../src/api/v1/services/teacher-dashboard.service');
const { success } = require('../../../../../src/utils/response');
const { resolveSchoolIdFromRequest } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('TeacherDashboardController', () => {
  let req, res, next;
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    resolveSchoolIdFromRequest.mockReturnValue(1);
    req.user = { id: 5, roleName: 'teacher', schoolId: 1 };
  });
  describe('getDashboard', () => {
    it('should retrieve teacher dashboard', async () => {
      const dashData = { classes: 3 };
      teacherDashSvc.getDashboard.mockResolvedValue(dashData);
      await teacherDashCtrl.getDashboard(req, res, next);
      expect(teacherDashSvc.getDashboard).toHaveBeenCalledWith({ userId: 5, schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, dashData, 'Teacher dashboard fetched successfully', 200);
    });
    it('should propagate errors', async () => {
      teacherDashSvc.getDashboard.mockRejectedValue(new Error('fail'));
      await teacherDashCtrl.getDashboard(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
