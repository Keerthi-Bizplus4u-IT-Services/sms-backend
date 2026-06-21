/**
 * Unit Tests for Holiday Controller
 */
jest.mock('../../../../../src/api/v1/services/holiday.service', () => ({
  listHolidays: jest.fn(),
  createHoliday: jest.fn(),
  deleteHoliday: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  ensureSchoolContext: jest.fn()
}));

const holidayController = require('../../../../../src/api/v1/controllers/holiday.controller');
const holidayService = require('../../../../../src/api/v1/services/holiday.service');
const { success, error } = require('../../../../../src/utils/response');
const { ensureSchoolContext } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('HolidayController', () => {
  let req, res, next;
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    ensureSchoolContext.mockReturnValue(1);
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });

  describe('getHolidays', () => {
    it('should retrieve holidays for school', async () => {
      holidayService.listHolidays.mockResolvedValue([{ id: 1, name: 'Diwali' }]);
      await holidayController.getHolidays(req, res, next);
      expect(ensureSchoolContext).toHaveBeenCalledWith(req);
      expect(holidayService.listHolidays).toHaveBeenCalledWith(1);
      expect(success).toHaveBeenCalledWith(res, expect.any(Array), 'Holidays retrieved successfully', 200);
    });
  });

  describe('createHoliday', () => {
    it('should create holiday with school_id injected', async () => {
      req.body = { name: 'New Year', date: '2026-01-01' };
      holidayService.createHoliday.mockResolvedValue({ id: 1 });
      await holidayController.createHoliday(req, res, next);
      expect(holidayService.createHoliday).toHaveBeenCalledWith({ name: 'New Year', date: '2026-01-01', school_id: 1 });
      expect(success).toHaveBeenCalledWith(res, { id: 1 }, 'Holiday added successfully', 201);
    });
  });

  describe('deleteHoliday', () => {
    it('should delete holiday successfully', async () => {
      req.params = { id: '5' };
      holidayService.deleteHoliday.mockResolvedValue(true);
      await holidayController.deleteHoliday(req, res, next);
      expect(holidayService.deleteHoliday).toHaveBeenCalledWith('5', 1);
      expect(success).toHaveBeenCalledWith(res, null, 'Holiday deleted successfully', 200);
    });
    it('should return 404 when holiday not found', async () => {
      req.params = { id: '99' };
      holidayService.deleteHoliday.mockResolvedValue(false);
      error.mockReturnValue(res);
      await holidayController.deleteHoliday(req, res, next);
      expect(error).toHaveBeenCalledWith(res, 'Holiday not found or unauthorized', 404);
    });
  });
});
