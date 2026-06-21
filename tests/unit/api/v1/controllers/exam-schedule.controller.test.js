/**
 * Unit Tests for Exam Schedule Controller
 */

jest.mock('../../../../../src/api/v1/services/exam-schedule.service', () => ({
  getExamSchedules: jest.fn(),
  createLegacySchedule: jest.fn(),
  deleteLegacySchedule: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  ensureSchoolContext: jest.fn()
}));

const examScheduleController = require('../../../../../src/api/v1/controllers/exam-schedule.controller');
const examScheduleService = require('../../../../../src/api/v1/services/exam-schedule.service');
const { success } = require('../../../../../src/utils/response');
const { ensureSchoolContext } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('ExamScheduleController', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    ensureSchoolContext.mockReturnValue(1);
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });

  describe('getExamSchedules', () => {
    it('should retrieve schedules with role context', async () => {
      req.query = { academicYearId: '2' };
      examScheduleService.getExamSchedules.mockResolvedValue([]);

      await examScheduleController.getExamSchedules(req, res, next);

      expect(examScheduleService.getExamSchedules).toHaveBeenCalledWith(
        { academicYearId: '2', studentId: undefined },
        { schoolId: 1, userId: 1, roleName: 'admin' }
      );
      expect(success).toHaveBeenCalledWith(res, [], 'Exam schedules retrieved successfully', 200);
    });
  });

  describe('createLegacySchedule', () => {
    it('should create legacy exam schedule', async () => {
      req.body = { exam_id: 1, class_id: 3, subject_id: 5, date: '2026-04-15' };
      examScheduleService.createLegacySchedule.mockResolvedValue({ id: 1 });

      await examScheduleController.createLegacySchedule(req, res, next);

      expect(examScheduleService.createLegacySchedule).toHaveBeenCalledWith(req.body, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, { id: 1 }, 'Exam schedule saved successfully', 201);
    });

    it('should reject overlapping exam dates', async () => {
      req.body = { exam_id: 1, class_id: 3, date: '2026-04-15' };
      examScheduleService.createLegacySchedule.mockRejectedValue(new Error('Schedule conflict'));

      await examScheduleController.createLegacySchedule(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('deleteLegacySchedule', () => {
    it('should delete exam schedule', async () => {
      req.params = { id: '1' };
      examScheduleService.deleteLegacySchedule.mockResolvedValue(true);

      await examScheduleController.deleteLegacySchedule(req, res, next);

      expect(examScheduleService.deleteLegacySchedule).toHaveBeenCalledWith('1', { schoolId: 1 });
    });
  });
});
