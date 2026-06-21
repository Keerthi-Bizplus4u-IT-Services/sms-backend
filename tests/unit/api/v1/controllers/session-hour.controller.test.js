/**
 * Unit Tests for Session Hour Controller
 */

jest.mock('../../../../../src/api/v1/services/session-hour.service', () => ({
  listSessionHours: jest.fn(),
  getEffectiveSessionHours: jest.fn(),
  createSessionHour: jest.fn(),
  updateSessionHour: jest.fn(),
  deleteSessionHour: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  ensureSchoolContext: jest.fn(),
  parsePositiveInt: jest.fn((v) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) || n <= 0 ? null : n;
  })
}));

const sessionHourController = require('../../../../../src/api/v1/controllers/session-hour.controller');
const sessionHourService = require('../../../../../src/api/v1/services/session-hour.service');
const { success } = require('../../../../../src/utils/response');
const { ensureSchoolContext, parsePositiveInt } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('SessionHourController', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    ensureSchoolContext.mockReturnValue(1);
    parsePositiveInt.mockImplementation((v) => {
      const n = parseInt(v, 10);
      return Number.isNaN(n) || n <= 0 ? null : n;
    });
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });

  describe('getSessionHours', () => {
    it('should retrieve session hours with filters', async () => {
      req.query = { scope: 'GLOBAL' };
      sessionHourService.listSessionHours.mockResolvedValue([{ id: 1, label: 'Period 1' }]);

      await sessionHourController.getSessionHours(req, res, next);

      expect(sessionHourService.listSessionHours).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'GLOBAL' }),
        { schoolId: 1 }
      );
      expect(success).toHaveBeenCalledWith(res, expect.any(Array), 'Session hours retrieved successfully');
    });
  });

  describe('createSessionHour', () => {
    it('should create a session hour', async () => {
      req.body = { label: 'Period 1', start_time: '09:00', end_time: '09:45' };
      sessionHourService.createSessionHour.mockResolvedValue({ id: 1 });

      await sessionHourController.createSessionHour(req, res, next);

      expect(sessionHourService.createSessionHour).toHaveBeenCalledWith(req.body, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, { id: 1 }, 'Session hour created successfully', 201);
    });

    it('should reject overlapping time ranges', async () => {
      req.body = { label: 'Period 1', start_time: '09:00', end_time: '09:45' };
      sessionHourService.createSessionHour.mockRejectedValue(new Error('Time range overlaps'));

      await sessionHourController.createSessionHour(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateSessionHour', () => {
    it('should update a session hour', async () => {
      req.params = { id: '1' };
      req.body = { label: 'Updated Period' };
      sessionHourService.updateSessionHour.mockResolvedValue({ id: 1 });

      await sessionHourController.updateSessionHour(req, res, next);

      expect(sessionHourService.updateSessionHour).toHaveBeenCalledWith('1', req.body, { schoolId: 1 });
    });
  });

  describe('deleteSessionHour', () => {
    it('should delete a session hour', async () => {
      req.params = { id: '1' };
      sessionHourService.deleteSessionHour.mockResolvedValue(undefined);

      await sessionHourController.deleteSessionHour(req, res, next);

      expect(sessionHourService.deleteSessionHour).toHaveBeenCalledWith('1', { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, null, 'Session hour deleted successfully');
    });
  });
});
