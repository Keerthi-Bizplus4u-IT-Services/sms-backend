/**
 * Unit Tests for Timetable Controller (no context utils - uses req.user directly)
 */

jest.mock('../../../../../src/api/v1/services/timetable.service', () => ({
  getSchedule: jest.fn(),
  getMySchedule: jest.fn(),
  searchSchedule: jest.fn()
}));
jest.mock('../../../../../src/utils/response');

const timetableController = require('../../../../../src/api/v1/controllers/timetable.controller');
const timetableService = require('../../../../../src/api/v1/services/timetable.service');
const { success } = require('../../../../../src/utils/response');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('TimetableController', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    req.user = { id: 1, roleName: 'teacher', schoolId: 1 };
  });

  describe('getSchedule', () => {
    it('should retrieve timetable schedule', async () => {
      const results = [{ day: 'Monday', periods: [] }];
      timetableService.getSchedule.mockResolvedValue(results);

      await timetableController.getSchedule(req, res, next);

      expect(timetableService.getSchedule).toHaveBeenCalledWith({}, req.user);
      expect(success).toHaveBeenCalledWith(res, { userData: results }, 'Timetable retrieved successfully', 200);
    });
  });

  describe('getMySchedule', () => {
    it('should retrieve personal schedule', async () => {
      timetableService.getMySchedule.mockResolvedValue([]);

      await timetableController.getMySchedule(req, res, next);

      expect(timetableService.getMySchedule).toHaveBeenCalledWith(req.user);
    });
  });

  describe('searchSchedule', () => {
    it('should search schedule by class details', async () => {
      req.body = { 'allclass-id': '5', 'allclass-name': 'X', 'allclass-class': 'Class 10' };
      timetableService.searchSchedule.mockResolvedValue([]);

      await timetableController.searchSchedule(req, res, next);

      expect(timetableService.searchSchedule).toHaveBeenCalledWith(
        { id: '5', name: 'X', className: 'Class 10' }, req.user
      );
    });

    it('should propagate errors', async () => {
      req.body = {};
      timetableService.searchSchedule.mockRejectedValue(new Error('Search failed'));

      await timetableController.searchSchedule(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
