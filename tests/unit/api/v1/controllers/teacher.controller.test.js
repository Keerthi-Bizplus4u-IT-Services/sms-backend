/**
 * Unit Tests for Teacher Controller
 */

jest.mock('../../../../../src/api/v1/services/teacher.service', () => ({
  getTeachers: jest.fn(),
  getTeacherById: jest.fn(),
  createTeacher: jest.fn(),
  updateTeacher: jest.fn(),
  deleteTeacher: jest.fn()
}));
jest.mock('../../../../../src/api/v1/services/photo-storage.service', () => ({
  uploadPhoto: jest.fn(),
  uploadDocument: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  ensureSchoolContext: jest.fn(),
  resolveSchoolIdFromRequest: jest.fn(),
  parsePositiveInt: jest.fn((v) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) || n <= 0 ? null : n;
  })
}));

const teacherController = require('../../../../../src/api/v1/controllers/teacher.controller');
const teacherService = require('../../../../../src/api/v1/services/teacher.service');
const photoStorageService = require('../../../../../src/api/v1/services/photo-storage.service');
const { success } = require('../../../../../src/utils/response');
const { ensureSchoolContext, resolveSchoolIdFromRequest, parsePositiveInt } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('TeacherController', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    ensureSchoolContext.mockReturnValue(1);
    resolveSchoolIdFromRequest.mockReturnValue(1);
    parsePositiveInt.mockImplementation((v) => {
      const n = parseInt(v, 10);
      return Number.isNaN(n) || n <= 0 ? null : n;
    });
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });

  describe('getTeachers', () => {
    it('should retrieve teachers with filters', async () => {
      req.query = { page: '1', limit: '10', status: 'active' };
      const payload = { teachers: [{ id: 1 }], total: 1 };
      teacherService.getTeachers.mockResolvedValue(payload);

      await teacherController.getTeachers(req, res, next);

      expect(ensureSchoolContext).toHaveBeenCalledWith(req);
      expect(teacherService.getTeachers).toHaveBeenCalledWith(
        expect.objectContaining({ page: '1', limit: '10', status: 'active', schoolId: 1 }),
        { isSuperAdmin: false }
      );
      expect(success).toHaveBeenCalledWith(res, payload, 'Teachers retrieved successfully', 200);
    });

    it('should resolve school for super_admin', async () => {
      req.user = { id: 1, roleName: 'super_admin' };
      req.query = {};
      resolveSchoolIdFromRequest.mockReturnValue(5);
      teacherService.getTeachers.mockResolvedValue({ teachers: [] });

      await teacherController.getTeachers(req, res, next);

      expect(resolveSchoolIdFromRequest).toHaveBeenCalledWith(req);
      expect(teacherService.getTeachers).toHaveBeenCalledWith(
        expect.objectContaining({ schoolId: 5 }),
        { isSuperAdmin: true }
      );
    });
  });

  describe('getTeacherById', () => {
    it('should retrieve teacher by ID', async () => {
      req.params = { id: '5' };
      teacherService.getTeacherById.mockResolvedValue({ id: 5 });

      await teacherController.getTeacherById(req, res, next);

      expect(teacherService.getTeacherById).toHaveBeenCalledWith('5', { schoolId: 1 });
    });
  });

  describe('createTeacher', () => {
    it('should create teacher without files', async () => {
      req.body = { person: { first_name: 'John' } };
      teacherService.createTeacher.mockResolvedValue({ id: 1 });

      await teacherController.createTeacher(req, res, next);

      expect(teacherService.createTeacher).toHaveBeenCalledWith(req.body, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, { id: 1 }, 'Teacher created successfully', 201);
    });

    it('should handle photo, aadhar, pan uploads', async () => {
      req.files = {
        photo: [{ originalname: 'photo.jpg' }],
        aadhar: [{ originalname: 'aadhar.pdf' }],
        pan: [{ originalname: 'pan.pdf' }]
      };
      req.body = { person: {} };
      photoStorageService.uploadPhoto.mockResolvedValue('http://cdn/photo.jpg');
      photoStorageService.uploadDocument.mockResolvedValueOnce('http://cdn/aadhar.pdf')
        .mockResolvedValueOnce('http://cdn/pan.pdf');
      teacherService.createTeacher.mockResolvedValue({ id: 1 });

      await teacherController.createTeacher(req, res, next);

      expect(photoStorageService.uploadPhoto).toHaveBeenCalled();
      expect(photoStorageService.uploadDocument).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateTeacher', () => {
    it('should update teacher', async () => {
      req.params = { id: '1' };
      req.body = { person: { first_name: 'Updated' } };
      teacherService.updateTeacher.mockResolvedValue({ id: 1 });

      await teacherController.updateTeacher(req, res, next);

      expect(teacherService.updateTeacher).toHaveBeenCalledWith('1', req.body, { schoolId: 1 });
    });
  });

  describe('deleteTeacher', () => {
    it('should delete teacher', async () => {
      req.params = { id: '1' };
      teacherService.deleteTeacher.mockResolvedValue(true);

      await teacherController.deleteTeacher(req, res, next);

      expect(teacherService.deleteTeacher).toHaveBeenCalledWith('1', { schoolId: 1 });
    });

    it('should propagate errors', async () => {
      req.params = { id: '999' };
      teacherService.deleteTeacher.mockRejectedValue(new Error('Not found'));

      await teacherController.deleteTeacher(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
