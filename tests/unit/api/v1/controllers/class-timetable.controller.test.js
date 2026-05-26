/**
 * Unit Tests for Class Timetable Controller
 */

jest.mock('../../../../../src/api/v1/services/class-timetable.service', () => ({
  getByClassSection: jest.fn(),
  createEntry: jest.fn(),
  updateEntry: jest.fn(),
  deleteEntry: jest.fn(),
  changeTeacher: jest.fn(),
  getTeacherWorkload: jest.fn(),
  getTeacherWorkloadDetail: jest.fn(),
  getTimetablePeriods: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  ensureSchoolContext: jest.fn(),
  parsePositiveInt: jest.fn((v) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) || n <= 0 ? null : n;
  })
}));

const classTimetableController = require('../../../../../src/api/v1/controllers/class-timetable.controller');
const classTimetableService = require('../../../../../src/api/v1/services/class-timetable.service');
const { success } = require('../../../../../src/utils/response');
const { ensureSchoolContext, parsePositiveInt } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('ClassTimetableController', () => {
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

  describe('getEntries', () => {
    it('should retrieve timetable entries by class and section', async () => {
      req.query = { class_id: '3', section_id: '1' };
      classTimetableService.getByClassSection.mockResolvedValue([]);

      await classTimetableController.getEntries(req, res, next);

      expect(classTimetableService.getByClassSection).toHaveBeenCalledWith(
        { classId: 3, sectionId: 1 }, { schoolId: 1 }
      );
      expect(success).toHaveBeenCalledWith(res, [], 'Timetable entries retrieved successfully');
    });
  });

  describe('createEntry', () => {
    it('should create a timetable entry', async () => {
      req.body = { class_id: 3, section_id: 1, day: 'Monday', period: 1 };
      classTimetableService.createEntry.mockResolvedValue({ id: 1 });

      await classTimetableController.createEntry(req, res, next);

      expect(classTimetableService.createEntry).toHaveBeenCalledWith(req.body, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, { id: 1 }, 'Timetable entry created successfully', 201);
    });

    it('should reject duplicate entries for same slot', async () => {
      req.body = { class_id: 3, day: 'Monday', period: 1 };
      classTimetableService.createEntry.mockRejectedValue(new Error('Slot already occupied'));

      await classTimetableController.createEntry(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateEntry', () => {
    it('should update a timetable entry', async () => {
      req.params = { id: '1' };
      req.body = { teacher_id: 5 };
      classTimetableService.updateEntry.mockResolvedValue({ id: 1 });

      await classTimetableController.updateEntry(req, res, next);

      expect(classTimetableService.updateEntry).toHaveBeenCalledWith('1', req.body, { schoolId: 1 });
    });
  });

  describe('deleteEntry', () => {
    it('should delete a timetable entry', async () => {
      req.params = { id: '1' };
      classTimetableService.deleteEntry.mockResolvedValue(undefined);

      await classTimetableController.deleteEntry(req, res, next);

      expect(classTimetableService.deleteEntry).toHaveBeenCalledWith('1', { schoolId: 1 });
    });
  });

  describe('changeTeacher', () => {
    it('should change teacher for entry', async () => {
      req.params = { id: '1' };
      req.body = { teacher_id: 10 };
      classTimetableService.changeTeacher.mockResolvedValue({ id: 1 });

      await classTimetableController.changeTeacher(req, res, next);

      expect(classTimetableService.changeTeacher).toHaveBeenCalledWith('1', 10, { schoolId: 1 });
    });
  });
});
