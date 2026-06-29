/**
 * Unit Tests for Student Controller
 */

jest.mock('../../../../../src/api/v1/services/student.service', () => ({
  getStudents: jest.fn(),
  getStudentById: jest.fn(),
  getStudentByAdmissionNumber: jest.fn(),
  getStudentByRollNumber: jest.fn(),
  createStudent: jest.fn(),
  updateStudent: jest.fn(),
  deleteStudent: jest.fn(),
  getStudentsByClass: jest.fn(),
  getStudentsBySection: jest.fn(),
  promoteStudents: jest.fn()
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

const studentController = require('../../../../../src/api/v1/controllers/student.controller');
const studentService = require('../../../../../src/api/v1/services/student.service');
const photoStorageService = require('../../../../../src/api/v1/services/photo-storage.service');
const { success } = require('../../../../../src/utils/response');
const { ensureSchoolContext, resolveSchoolIdFromRequest, parsePositiveInt } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('StudentController', () => {
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

  describe('getStudents', () => {
    it('should retrieve students with pagination', async () => {
      const payload = { students: [{ id: 1 }], total: 1, page: 1, totalPages: 1 };
      req.query = { page: '1', limit: '10', search: 'John' };
      studentService.getStudents.mockResolvedValue(payload);

      await studentController.getStudents(req, res, next);

      expect(ensureSchoolContext).toHaveBeenCalledWith(req);
      expect(studentService.getStudents).toHaveBeenCalledWith(
        expect.objectContaining({ page: '1', limit: '10', search: 'John', schoolId: 1 }),
        { isSuperAdmin: false }
      );
      expect(success).toHaveBeenCalledWith(res, payload, 'Students retrieved successfully', 200);
    });

    it('should resolve school for super_admin', async () => {
      req.user = { id: 1, roleName: 'super_admin', schoolId: null };
      req.query = { page: '1', limit: '10' };
      resolveSchoolIdFromRequest.mockReturnValue(5);
      studentService.getStudents.mockResolvedValue({ students: [], total: 0 });

      await studentController.getStudents(req, res, next);

      expect(resolveSchoolIdFromRequest).toHaveBeenCalledWith(req);
      expect(studentService.getStudents).toHaveBeenCalledWith(
        expect.objectContaining({ schoolId: 5 }),
        { isSuperAdmin: true }
      );
    });

    it('should allow super_admin global scope when no school is selected', async () => {
      req.user = { id: 1, roleName: 'super_admin', schoolId: null };
      req.query = { page: '1', limit: '10' };
      resolveSchoolIdFromRequest.mockReturnValue(null);
      studentService.getStudents.mockResolvedValue({ students: [], total: 0 });

      await studentController.getStudents(req, res, next);

      expect(studentService.getStudents).toHaveBeenCalledWith(
        expect.objectContaining({ schoolId: null }),
        { isSuperAdmin: true }
      );
    });

    it('should propagate service errors', async () => {
      req.query = {};
      studentService.getStudents.mockRejectedValue(new Error('DB error'));

      await studentController.getStudents(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should propagate missing tenant context errors for non-super-admin', async () => {
      req.query = {};
      ensureSchoolContext.mockImplementation(() => {
        throw new Error('School context is required');
      });

      await studentController.getStudents(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(studentService.getStudents).not.toHaveBeenCalled();
    });
  });

  describe('getStudentById', () => {
    it('should retrieve student by ID', async () => {
      req.params = { id: '5' };
      const student = { id: 5, name: 'John' };
      studentService.getStudentById.mockResolvedValue(student);

      await studentController.getStudentById(req, res, next);

      expect(studentService.getStudentById).toHaveBeenCalledWith('5', { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, student, 'Student retrieved successfully', 200);
    });
  });

  describe('getStudentByAdmissionNumber', () => {
    it('should retrieve student by admission number', async () => {
      req.params = { admissionNumber: 'ADM001' };
      studentService.getStudentByAdmissionNumber.mockResolvedValue({ id: 1 });

      await studentController.getStudentByAdmissionNumber(req, res, next);

      expect(studentService.getStudentByAdmissionNumber).toHaveBeenCalledWith('ADM001', { schoolId: 1 });
    });
  });

  describe('getStudentByRollNumber', () => {
    it('should retrieve student by roll number', async () => {
      req.params = { rollNumber: 'R001' };
      studentService.getStudentByRollNumber.mockResolvedValue({ id: 1 });

      await studentController.getStudentByRollNumber(req, res, next);

      expect(studentService.getStudentByRollNumber).toHaveBeenCalledWith('R001', { schoolId: 1 });
    });
  });

  describe('createStudent', () => {
    it('should create a student without file uploads', async () => {
      req.body = { person: { first_name: 'John' }, student: { class_id: 1 } };
      studentService.createStudent.mockResolvedValue({ id: 1 });

      await studentController.createStudent(req, res, next);

      expect(studentService.createStudent).toHaveBeenCalledWith(req.body, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, { id: 1 }, 'Student created successfully', 201);
    });

    it('should handle photo and aadhar uploads', async () => {
      req.files = {
        photo: [{ originalname: 'photo.jpg' }],
        aadhar: [{ originalname: 'aadhar.pdf' }]
      };
      req.body = { person: { first_name: 'John' } };
      photoStorageService.uploadPhoto.mockResolvedValue('http://cdn/photo.jpg');
      photoStorageService.uploadDocument.mockResolvedValue('http://cdn/aadhar.pdf');
      studentService.createStudent.mockResolvedValue({ id: 1 });

      await studentController.createStudent(req, res, next);

      expect(photoStorageService.uploadPhoto).toHaveBeenCalled();
      expect(photoStorageService.uploadDocument).toHaveBeenCalled();
    });

    it('should propagate validation errors', async () => {
      req.body = {};
      studentService.createStudent.mockRejectedValue(new Error('Validation failed'));

      await studentController.createStudent(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateStudent', () => {
    it('should update a student', async () => {
      req.params = { id: '1' };
      req.body = { person: { first_name: 'Updated' } };
      studentService.updateStudent.mockResolvedValue({ id: 1 });

      await studentController.updateStudent(req, res, next);

      expect(studentService.updateStudent).toHaveBeenCalledWith('1', req.body, { schoolId: 1 });
    });
  });

  describe('deleteStudent', () => {
    it('should delete a student', async () => {
      req.params = { id: '1' };
      studentService.deleteStudent.mockResolvedValue(true);

      await studentController.deleteStudent(req, res, next);

      expect(studentService.deleteStudent).toHaveBeenCalledWith('1', { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, true, 'Student deleted successfully', 200);
    });
  });

  describe('getStudentsByClass', () => {
    it('should retrieve students by class', async () => {
      req.params = { classId: '3' };
      req.query = { page: '1', limit: '20' };
      studentService.getStudentsByClass.mockResolvedValue({ students: [] });

      await studentController.getStudentsByClass(req, res, next);

      expect(studentService.getStudentsByClass).toHaveBeenCalledWith('3', expect.objectContaining({
        schoolId: 1, page: '1', limit: '20'
      }));
    });
  });

  describe('getStudentsBySection', () => {
    it('should retrieve students by class and section', async () => {
      req.params = { classId: '3', sectionId: '2' };
      req.query = { page: '1', limit: '20' };
      studentService.getStudentsBySection.mockResolvedValue({ students: [] });

      await studentController.getStudentsBySection(req, res, next);

      expect(studentService.getStudentsBySection).toHaveBeenCalledWith('3', '2', expect.objectContaining({
        schoolId: 1
      }));
    });
  });

  describe('promoteStudents', () => {
    it('should promote students', async () => {
      req.body = { sourceClassId: 1, targetClassId: 2, studentIds: [1, 2] };
      studentService.promoteStudents.mockResolvedValue({ promoted: 2 });

      await studentController.promoteStudents(req, res, next);

      expect(studentService.promoteStudents).toHaveBeenCalledWith(req.body, {
        userId: 1, schoolId: 1
      });
      expect(success).toHaveBeenCalledWith(res, { promoted: 2 }, 'Students promoted successfully', 200);
    });
  });
});
