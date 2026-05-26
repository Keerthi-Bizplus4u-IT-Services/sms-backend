jest.mock('../../../../../src/api/v1/services/achievement.service', () => ({
  getParentChildrenAchievements: jest.fn(),
  getSchoolAchievements: jest.fn(),
  createAchievement: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  resolveSchoolIdFromRequest: jest.fn()
}));

const achievementCtrl = require('../../../../../src/api/v1/controllers/achievement.controller');
const achievementSvc = require('../../../../../src/api/v1/services/achievement.service');
const { success } = require('../../../../../src/utils/response');
const { resolveSchoolIdFromRequest } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('AchievementController', () => {
  let req, res, next;
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    resolveSchoolIdFromRequest.mockReturnValue(1);
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });
  describe('getParentAchievements', () => {
    it('should get parent children achievements', async () => {
      req.query = { page: '1', limit: '10' };
      achievementSvc.getParentChildrenAchievements.mockResolvedValue({ data: [] });
      await achievementCtrl.getParentAchievements(req, res, next);
      expect(achievementSvc.getParentChildrenAchievements).toHaveBeenCalledWith(1, { page: 1, limit: 10 });
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'Achievements fetched successfully', 200);
    });
    it('should return 401 when userId missing', async () => {
      req.user = {};
      await achievementCtrl.getParentAchievements(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
  describe('getSchoolAchievements', () => {
    it('should get school achievements', async () => {
      req.query = { page: '2', limit: '20' };
      achievementSvc.getSchoolAchievements.mockResolvedValue({ data: [] });
      await achievementCtrl.getSchoolAchievements(req, res, next);
      expect(achievementSvc.getSchoolAchievements).toHaveBeenCalledWith(1, { page: 2, limit: 20 });
    });
  });
  describe('createAchievement', () => {
    it('should create achievement with remapped fields', async () => {
      req.body = { studentId: 5, title: 'Best Student', description: 'Excellent', achievementType: 'award', category: 'academic', awardedDate: '2026-03-01', awardedBy: 'Principal' };
      achievementSvc.createAchievement.mockResolvedValue({ id: 1 });
      await achievementCtrl.createAchievement(req, res, next);
      expect(achievementSvc.createAchievement).toHaveBeenCalledWith({
        student_id: 5, school_id: 1, title: 'Best Student', description: 'Excellent',
        achievement_type: 'award', category: 'academic', awarded_date: '2026-03-01', awarded_by: 'Principal'
      });
      expect(success).toHaveBeenCalledWith(res, { id: 1 }, 'Achievement created successfully', 201);
    });
  });
});
