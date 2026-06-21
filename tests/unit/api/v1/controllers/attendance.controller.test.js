/**
 * Unit Tests for Attendance Controller (uses req.user.schoolId directly)
 */

jest.mock('../../../../../src/api/v1/services/attendance.service', () => ({
  getAttendance: jest.fn(),
  saveAttendance: jest.fn()
}));
jest.mock('../../../../../src/utils/response');

const attendanceController = require('../../../../../src/api/v1/controllers/attendance.controller');
const attendanceService = require('../../../../../src/api/v1/services/attendance.service');
const { success } = require('../../../../../src/utils/response');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('AttendanceController', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    req.user = { id: 1, roleName: 'teacher', schoolId: 1 };
  });

  describe('getAttendance', () => {
    it('should retrieve attendance with proper context', async () => {
      req.body = { sclass: '3', section: '1', attendenncemonth: '4' };
      attendanceService.getAttendance.mockResolvedValue([]);

      await attendanceController.getAttendance(req, res, next);

      expect(attendanceService.getAttendance).toHaveBeenCalledWith(expect.objectContaining({
        classId: '3', sectionId: '1', schoolId: 1, userId: 1, roleName: 'teacher'
      }));
      expect(success).toHaveBeenCalledWith(res, { items: [] }, 'Attendance retrieved successfully', 200);
    });
  });

  describe('saveAttendance', () => {
    it('should save attendance with normalized date', async () => {
      req.body = {
        sclass: '3', section: '1',
        students: [{ id: '1', attendance: 'P' }, { id: '2', attendance: 'A' }],
        adate: '2026-04-10', attendenncemonth: '4'
      };
      attendanceService.saveAttendance.mockResolvedValue({ saved: true });

      await attendanceController.saveAttendance(req, res, next);

      expect(attendanceService.saveAttendance).toHaveBeenCalledWith(expect.objectContaining({
        classId: '3', sectionId: '1', schoolId: 1, date: '2026-04-10',
        students: expect.any(Array)
      }));
      expect(success).toHaveBeenCalledWith(res, { saved: true }, 'Attendance saved successfully', 200);
    });

    it('should normalize attendance map to array', async () => {
      req.body = {
        sclass: '3', section: '1',
        attendance: { '1': true, '2': false },
        adate: '2026-04-10'
      };
      attendanceService.saveAttendance.mockResolvedValue({ saved: true });

      await attendanceController.saveAttendance(req, res, next);

      expect(attendanceService.saveAttendance).toHaveBeenCalledWith(expect.objectContaining({
        students: expect.arrayContaining([
          expect.objectContaining({ id: '1', attendance: 'P' }),
          expect.objectContaining({ id: '2', attendance: 'A' })
        ])
      }));
    });

    it('should propagate errors', async () => {
      req.body = {};
      attendanceService.saveAttendance.mockRejectedValue(new Error('Save failed'));

      await attendanceController.saveAttendance(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
