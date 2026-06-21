/**
 * Unit Tests for Class Controller
 */

jest.mock('../../../../../src/api/v1/services/class.service', () => ({
  classService: {
    getClasses: jest.fn(),
    getClassesByAcademicYear: jest.fn(),
    getClassById: jest.fn(),
    createClass: jest.fn(),
    updateClass: jest.fn(),
    deleteClass: jest.fn()
  },
  subjectService: {
    getSubjects: jest.fn(),
    getSubjectById: jest.fn(),
    createSubject: jest.fn(),
    updateSubject: jest.fn(),
    deleteSubject: jest.fn()
  }
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  ensureSchoolContext: jest.fn(),
  parsePositiveInt: jest.fn((v) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) || n <= 0 ? null : n;
  })
}));

const { classController } = require('../../../../../src/api/v1/controllers/class.controller');
const { classService } = require('../../../../../src/api/v1/services/class.service');
const { success } = require('../../../../../src/utils/response');
const { ensureSchoolContext, parsePositiveInt } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('ClassController', () => {
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

  describe('getClasses', () => {
    it('should retrieve classes with filters', async () => {
      req.query = { page: '1', limit: '10', academicYearId: '2' };
      const payload = { classes: [{ id: 1, name: 'Class 1' }], total: 1 };
      classService.getClasses.mockResolvedValue(payload);

      await classController.getClasses(req, res, next);

      expect(ensureSchoolContext).toHaveBeenCalledWith(req);
      expect(classService.getClasses).toHaveBeenCalledWith(
        expect.objectContaining({ page: '1', limit: '10', academicYearId: '2' }),
        { schoolId: 1 }
      );
      expect(success).toHaveBeenCalledWith(res, payload, 'Classes retrieved successfully', 200);
    });
  });

  describe('getClassById', () => {
    it('should retrieve class by ID', async () => {
      req.params = { id: '3' };
      classService.getClassById.mockResolvedValue({ id: 3, name: 'Class 3' });

      await classController.getClassById(req, res, next);

      expect(classService.getClassById).toHaveBeenCalledWith('3', { schoolId: 1 });
    });
  });

  describe('createClass', () => {
    it('should create a class', async () => {
      req.body = { name: 'Class 10', academic_year_id: 1 };
      classService.createClass.mockResolvedValue({ id: 10, name: 'Class 10' });

      await classController.createClass(req, res, next);

      expect(classService.createClass).toHaveBeenCalledWith(req.body, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'Class created successfully', 201);
    });

    it('should not allow duplicate class names within same school', async () => {
      req.body = { name: 'Class 10' };
      classService.createClass.mockRejectedValue(new Error('Class already exists'));

      await classController.createClass(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateClass', () => {
    it('should update a class', async () => {
      req.params = { id: '3' };
      req.body = { name: 'Updated Class' };
      classService.updateClass.mockResolvedValue({ id: 3 });

      await classController.updateClass(req, res, next);

      expect(classService.updateClass).toHaveBeenCalledWith('3', req.body, { schoolId: 1 });
    });
  });

  describe('deleteClass', () => {
    it('should delete a class', async () => {
      req.params = { id: '3' };
      classService.deleteClass.mockResolvedValue(true);

      await classController.deleteClass(req, res, next);

      expect(classService.deleteClass).toHaveBeenCalledWith('3', { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, true, 'Class deleted successfully', 200);
    });

    it('should propagate errors when deleting class with students', async () => {
      req.params = { id: '999' };
      classService.deleteClass.mockRejectedValue(new Error('Cannot delete class with students'));

      await classController.deleteClass(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
