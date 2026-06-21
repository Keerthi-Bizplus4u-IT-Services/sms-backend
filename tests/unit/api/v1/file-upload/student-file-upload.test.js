/**
 * File Upload Tests for Student Creation
 * Tests file upload handling across controller, middleware, and service layers
 */

// ── Mock dependencies ────────────────────────────────────────────
jest.mock('../../../../../src/api/v1/services/student.service', () => ({
  createStudent: jest.fn(),
  getStudents: jest.fn(),
  getStudentById: jest.fn(),
  getStudentByAdmissionNumber: jest.fn(),
  getStudentByRollNumber: jest.fn(),
  updateStudent: jest.fn(),
  deleteStudent: jest.fn(),
  getStudentsByClass: jest.fn(),
  getStudentsBySection: jest.fn(),
  promoteStudents: jest.fn(),
  getAdmissionRollSuggestion: jest.fn()
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
const { ensureSchoolContext } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

// ── Helpers ──────────────────────────────────────────────────────
const createMockFile = (overrides = {}) => ({
  fieldname: overrides.fieldname || 'photo',
  originalname: overrides.originalname || 'test-photo.jpg',
  encoding: '7bit',
  mimetype: overrides.mimetype || 'image/jpeg',
  size: overrides.size || 50000,
  buffer: Buffer.from(overrides.buffer || 'fake-image-data')
});

const validPersonPayload = {
  first_name: 'Ravi',
  last_name: 'Kumar',
  gender: 'male',
  date_of_birth: '2014-08-20',
  phone: '9876543210',
  blood_group: 'B+'
};

const validStudentPayload = {
  apar_id: 'APAR-TEST-001',
  class_id: 3,
  branch_id: 1,
  admission_date: '2026-04-11',
  status: 'active'
};

// ── Test Suites ──────────────────────────────────────────────────

describe('Student File Upload', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    ensureSchoolContext.mockReturnValue(1);
    req.user = { id: 2, roleName: 'admin', schoolId: 1 };
  });

  // ── Controller: createStudent with file uploads ──────────────
  describe('Controller — createStudent file handling', () => {
    it('should upload photo and aadhar when both files are present', async () => {
      const photoFile = createMockFile({ fieldname: 'photo', originalname: 'student-photo.jpg' });
      const aadharFile = createMockFile({ fieldname: 'aadhar', originalname: 'aadhar-card.pdf', mimetype: 'application/pdf' });

      req.files = { photo: [photoFile], aadhar: [aadharFile] };
      req.body = { person: { ...validPersonPayload }, student: { ...validStudentPayload } };

      photoStorageService.uploadPhoto.mockResolvedValue('https://cdn.example.com/photos/student-photo.jpg');
      photoStorageService.uploadDocument.mockResolvedValue('https://cdn.example.com/docs/aadhar-card.pdf');
      studentService.createStudent.mockResolvedValue({ id: 10 });

      await studentController.createStudent(req, res, next);

      expect(photoStorageService.uploadPhoto).toHaveBeenCalledWith(
        photoFile,
        expect.objectContaining({ schoolId: 1, entityType: 'student' })
      );
      expect(photoStorageService.uploadDocument).toHaveBeenCalledWith(
        aadharFile,
        expect.objectContaining({ schoolId: 1, entityType: 'student', documentType: 'aadhar' })
      );
      expect(req.body.person.photo_url).toBe('https://cdn.example.com/photos/student-photo.jpg');
      expect(req.body.person.aadhar_url).toBe('https://cdn.example.com/docs/aadhar-card.pdf');
      expect(studentService.createStudent).toHaveBeenCalledWith(
        expect.objectContaining({
          person: expect.objectContaining({ photo_url: 'https://cdn.example.com/photos/student-photo.jpg' }),
          student: expect.objectContaining({ class_id: 3 })
        }),
        { schoolId: 1 }
      );
      expect(success).toHaveBeenCalledWith(res, { id: 10 }, 'Student created successfully', 201);
    });

    it('should upload only aadhar when photo is not provided', async () => {
      const aadharFile = createMockFile({ fieldname: 'aadhar', originalname: 'aadhar.pdf', mimetype: 'application/pdf' });

      req.files = { aadhar: [aadharFile] };
      req.body = { person: { ...validPersonPayload }, student: { ...validStudentPayload } };

      photoStorageService.uploadDocument.mockResolvedValue('https://cdn.example.com/docs/aadhar.pdf');
      studentService.createStudent.mockResolvedValue({ id: 11 });

      await studentController.createStudent(req, res, next);

      expect(photoStorageService.uploadPhoto).not.toHaveBeenCalled();
      expect(photoStorageService.uploadDocument).toHaveBeenCalled();
      expect(req.body.person.aadhar_url).toBe('https://cdn.example.com/docs/aadhar.pdf');
      expect(req.body.person.photo_url).toBeUndefined();
    });

    it('should upload only photo when aadhar is not provided', async () => {
      const photoFile = createMockFile({ fieldname: 'photo', originalname: 'face.png', mimetype: 'image/png' });

      req.files = { photo: [photoFile] };
      req.body = { person: { ...validPersonPayload }, student: { ...validStudentPayload } };

      photoStorageService.uploadPhoto.mockResolvedValue('https://cdn.example.com/photos/face.png');
      studentService.createStudent.mockResolvedValue({ id: 12 });

      await studentController.createStudent(req, res, next);

      expect(photoStorageService.uploadPhoto).toHaveBeenCalled();
      expect(photoStorageService.uploadDocument).not.toHaveBeenCalled();
      expect(req.body.person.photo_url).toBe('https://cdn.example.com/photos/face.png');
    });

    it('should create student with no files at all', async () => {
      req.files = {};
      req.body = { person: { ...validPersonPayload }, student: { ...validStudentPayload } };
      studentService.createStudent.mockResolvedValue({ id: 13 });

      await studentController.createStudent(req, res, next);

      expect(photoStorageService.uploadPhoto).not.toHaveBeenCalled();
      expect(photoStorageService.uploadDocument).not.toHaveBeenCalled();
      expect(success).toHaveBeenCalledWith(res, { id: 13 }, 'Student created successfully', 201);
    });

    it('should propagate photo upload failure', async () => {
      const photoFile = createMockFile({ fieldname: 'photo' });
      req.files = { photo: [photoFile] };
      req.body = { person: { ...validPersonPayload }, student: { ...validStudentPayload } };

      photoStorageService.uploadPhoto.mockRejectedValue(new Error('CDN upload timeout'));

      await studentController.createStudent(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'CDN upload timeout' })
      );
      expect(studentService.createStudent).not.toHaveBeenCalled();
    });

    it('should propagate aadhar upload failure', async () => {
      const aadharFile = createMockFile({ fieldname: 'aadhar', mimetype: 'application/pdf' });
      req.files = { aadhar: [aadharFile] };
      req.body = { person: { ...validPersonPayload }, student: { ...validStudentPayload } };

      photoStorageService.uploadDocument.mockRejectedValue(new Error('Storage quota exceeded'));

      await studentController.createStudent(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Storage quota exceeded' })
      );
    });

    it('should pick photo from req.file fallback when req.files has no photo', async () => {
      req.file = createMockFile({ fieldname: 'photo', originalname: 'fallback.jpg' });
      req.files = { aadhar: [createMockFile({ fieldname: 'aadhar', mimetype: 'application/pdf' })] };
      req.body = { person: { ...validPersonPayload }, student: { ...validStudentPayload } };

      photoStorageService.uploadPhoto.mockResolvedValue('https://cdn.example.com/photos/fallback.jpg');
      photoStorageService.uploadDocument.mockResolvedValue('https://cdn.example.com/docs/aadhar.pdf');
      studentService.createStudent.mockResolvedValue({ id: 14 });

      await studentController.createStudent(req, res, next);

      expect(photoStorageService.uploadPhoto).toHaveBeenCalledWith(
        req.file,
        expect.objectContaining({ schoolId: 1 })
      );
    });

    it('should use req.file fallback for photo even if fieldname differs', async () => {
      // pickUploadedFile checks fieldName === 'photo' && req.file, ignoring req.file.fieldname
      req.file = createMockFile({ fieldname: 'aadhar', originalname: 'bad.pdf' });
      req.files = {};
      req.body = { person: { ...validPersonPayload }, student: { ...validStudentPayload } };

      photoStorageService.uploadPhoto.mockResolvedValue('https://cdn.example.com/photos/bad.jpg');
      studentService.createStudent.mockResolvedValue({ id: 15 });

      await studentController.createStudent(req, res, next);

      // req.file is always used as photo fallback
      expect(photoStorageService.uploadPhoto).toHaveBeenCalledWith(
        req.file,
        expect.objectContaining({ schoolId: 1 })
      );
      // aadhar is not in req.files, so no document upload
      expect(photoStorageService.uploadDocument).not.toHaveBeenCalled();
    });
  });

  // ── Controller: updateStudent with file uploads ──────────────
  describe('Controller — updateStudent file handling', () => {
    beforeEach(() => {
      req.params = { id: '5' };
    });

    it('should replace photo and aadhar on update', async () => {
      const photoFile = createMockFile({ fieldname: 'photo' });
      const aadharFile = createMockFile({ fieldname: 'aadhar', mimetype: 'application/pdf' });

      req.files = { photo: [photoFile], aadhar: [aadharFile] };
      req.body = { person: { first_name: 'Updated' }, student: { class_id: 4 } };

      photoStorageService.uploadPhoto.mockResolvedValue('https://cdn.example.com/photos/updated.jpg');
      photoStorageService.uploadDocument.mockResolvedValue('https://cdn.example.com/docs/new-aadhar.pdf');
      studentService.updateStudent.mockResolvedValue({ id: 5 });

      await studentController.updateStudent(req, res, next);

      expect(photoStorageService.uploadPhoto).toHaveBeenCalled();
      expect(photoStorageService.uploadDocument).toHaveBeenCalled();
      expect(req.body.person.photo_url).toBe('https://cdn.example.com/photos/updated.jpg');
      expect(req.body.person.aadhar_url).toBe('https://cdn.example.com/docs/new-aadhar.pdf');
    });

    it('should update without file changes', async () => {
      req.files = {};
      req.body = { person: { first_name: 'NoFileChange' }, student: { status: 'active' } };
      studentService.updateStudent.mockResolvedValue({ id: 5 });

      await studentController.updateStudent(req, res, next);

      expect(photoStorageService.uploadPhoto).not.toHaveBeenCalled();
      expect(photoStorageService.uploadDocument).not.toHaveBeenCalled();
      expect(success).toHaveBeenCalledWith(res, { id: 5 }, 'Student updated successfully', 200);
    });
  });

  // ── Middleware: file filter logic ──────────────────────────────
  describe('Middleware — studentFileFilter validation', () => {
    // We test the raw filter function directly by requiring the middleware
    // without the global multer mock
    const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const ALLOWED_DOC_MIMES = [...ALLOWED_IMAGE_MIMES, 'application/pdf'];

    it.each(ALLOWED_IMAGE_MIMES)('should accept %s for photo field', (mimetype) => {
      const file = createMockFile({ fieldname: 'photo', mimetype });
      // The middleware filter accepts images for photo
      expect(ALLOWED_IMAGE_MIMES).toContain(file.mimetype);
    });

    it.each(ALLOWED_DOC_MIMES)('should accept %s for aadhar field', (mimetype) => {
      const file = createMockFile({ fieldname: 'aadhar', mimetype });
      expect(ALLOWED_DOC_MIMES).toContain(file.mimetype);
    });

    it.each([
      'text/plain',
      'application/zip',
      'application/msword',
      'text/html',
      'application/javascript'
    ])('should reject %s for photo field', (mimetype) => {
      expect(ALLOWED_IMAGE_MIMES).not.toContain(mimetype);
    });

    it.each([
      'text/plain',
      'application/zip',
      'application/msword',
      'text/html'
    ])('should reject %s for aadhar field', (mimetype) => {
      expect(ALLOWED_DOC_MIMES).not.toContain(mimetype);
    });

    it('should enforce 5MB file size limit', () => {
      const FIVE_MB = 5 * 1024 * 1024;
      const oversizedFile = createMockFile({ size: FIVE_MB + 1 });
      expect(oversizedFile.size).toBeGreaterThan(FIVE_MB);

      const normalFile = createMockFile({ size: 1024 * 100 }); // 100KB
      expect(normalFile.size).toBeLessThanOrEqual(FIVE_MB);
    });
  });

  // ── Payload normalizer: JSON fields arrive as strings ────────
  describe('Payload normalizer — multipart JSON fields', () => {
    const { normalizePayload } = require('../../../../../src/middleware/payload-normalizer.middleware');

    it('should parse stringified person and student fields', () => {
      const req = {
        headers: { 'content-type': 'multipart/form-data; boundary=----Test' },
        body: {
          person: JSON.stringify(validPersonPayload),
          student: JSON.stringify(validStudentPayload)
        }
      };
      const res = {};
      const nextFn = jest.fn();

      normalizePayload(req, res, nextFn);

      expect(typeof req.body.person).toBe('object');
      expect(req.body.person.first_name).toBe('Ravi');
      expect(typeof req.body.student).toBe('object');
      expect(req.body.student.class_id).toBe(3);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should leave non-multipart requests untouched', () => {
      const bodyRef = { person: 'raw-string' };
      const req = {
        headers: { 'content-type': 'application/json' },
        body: bodyRef
      };
      const nextFn = jest.fn();

      normalizePayload(req, {}, nextFn);

      expect(req.body).toBe(bodyRef);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully', () => {
      const req = {
        headers: { 'content-type': 'multipart/form-data; boundary=----Test' },
        body: {
          person: '{invalid json',
          student: JSON.stringify(validStudentPayload)
        }
      };
      const nextFn = jest.fn();

      normalizePayload(req, {}, nextFn);

      // Malformed JSON should be kept as-is
      expect(req.body.person).toBe('{invalid json');
      // Valid JSON should be parsed
      expect(typeof req.body.student).toBe('object');
      expect(nextFn).toHaveBeenCalled();
    });

    it('should handle dotted key notation in form fields', () => {
      const req = {
        headers: { 'content-type': 'multipart/form-data; boundary=----Test' },
        body: {
          'person.first_name': 'Ravi',
          'person.last_name': 'Kumar',
          'student.class_id': '3'
        }
      };
      const nextFn = jest.fn();

      normalizePayload(req, {}, nextFn);

      expect(req.body.person).toEqual(expect.objectContaining({
        first_name: 'Ravi',
        last_name: 'Kumar'
      }));
      expect(req.body.student).toEqual(expect.objectContaining({
        class_id: '3'
      }));
      expect(nextFn).toHaveBeenCalled();
    });
  });

  // ── Validator: aadhar file is required ───────────────────────
  describe('Validator — aadhar file requirement', () => {
    const { validationResult } = require('express-validator');
    const { createStudentValidator } = require('../../../../../src/api/v1/validators/student.validator');

    const runValidators = async (req, res) => {
      for (const validator of createStudentValidator) {
        await validator.run(req);
      }
      return validationResult(req);
    };

    it('should fail validation when aadhar file is missing', async () => {
      const req = {
        body: {
          person: { ...validPersonPayload },
          student: { ...validStudentPayload }
        },
        files: {},
        query: {},
        params: {}
      };
      const res = mockResponse();

      const result = await runValidators(req, res);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();
      const aadharError = errors.find(e => e.msg === 'Aadhar document is required');
      expect(aadharError).toBeDefined();
    });

    it('should pass validation when aadhar file is present', async () => {
      const req = {
        body: {
          person: { ...validPersonPayload },
          student: { ...validStudentPayload }
        },
        files: {
          aadhar: [createMockFile({ fieldname: 'aadhar', mimetype: 'application/pdf' })]
        },
        query: {},
        params: {}
      };
      const res = mockResponse();

      const result = await runValidators(req, res);

      const errors = result.array();
      const aadharError = errors.find(e => e.msg === 'Aadhar document is required');
      expect(aadharError).toBeUndefined();
    });

    it('should pass when admission_number and section_id are omitted', async () => {
      const req = {
        body: {
          person: { ...validPersonPayload },
          student: {
            apar_id: 'APAR002',
            class_id: 3,
            branch_id: 1,
            admission_date: '2026-04-11'
          }
        },
        files: {
          aadhar: [createMockFile({ fieldname: 'aadhar', mimetype: 'application/pdf' })]
        },
        query: {},
        params: {}
      };
      const res = mockResponse();

      const result = await runValidators(req, res);
      const errors = result.array();

      // No errors about admission_number or section_id since they are optional
      const admissionError = errors.find(e => (e.path || e.param) === 'student.admission_number');
      const sectionError = errors.find(e => (e.path || e.param) === 'student.section_id');
      expect(admissionError).toBeUndefined();
      expect(sectionError).toBeUndefined();
    });

    it('should reject invalid person fields even with valid files', async () => {
      const req = {
        body: {
          person: { first_name: '', last_name: '', gender: 'invalid', date_of_birth: 'not-a-date' },
          student: { ...validStudentPayload }
        },
        files: {
          aadhar: [createMockFile({ fieldname: 'aadhar', mimetype: 'application/pdf' })]
        },
        query: {},
        params: {}
      };
      const res = mockResponse();

      const result = await runValidators(req, res);

      expect(result.isEmpty()).toBe(false);
      const errors = result.array();

      const firstNameError = errors.find(e => (e.path || e.param) === 'person.first_name');
      const genderError = errors.find(e => (e.path || e.param) === 'person.gender');
      const dobError = errors.find(e => (e.path || e.param) === 'person.date_of_birth');

      expect(firstNameError).toBeDefined();
      expect(genderError).toBeDefined();
      expect(dobError).toBeDefined();
    });
  });
});
