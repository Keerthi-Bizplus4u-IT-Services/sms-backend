const studentService = require('../services/student.service');
const photoStorageService = require('../services/photo-storage.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { ensureSchoolContext, resolveSchoolIdFromRequest, parsePositiveInt } = require('../utils/context');

const pickUploadedFile = (req, fieldName) => {
  if (req.files && Array.isArray(req.files[fieldName]) && req.files[fieldName][0]) {
    return req.files[fieldName][0];
  }

  if (fieldName === 'photo' && req.file) {
    return req.file;
  }

  return null;
};

/**
 * Student Controller
 * Handles HTTP requests for students
 */

class StudentController {
  /**
   * GET /api/v1/students/suggestions/admission-roll
   * Suggest next admission number, section and roll for selected class
   */
  getAdmissionRollSuggestion = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const result = await studentService.getAdmissionRollSuggestion(
      {
        classId: parsePositiveInt(req.query.classId),
        sectionId: parsePositiveInt(req.query.sectionId)
      },
      { schoolId }
    );

    return success(res, result, 'Admission suggestion generated successfully', 200);
  });

  /**
   * GET /api/v1/students
   * Get all students with pagination and filters
   */
  getStudents = asyncHandler(async (req, res) => {
    const isSuperAdmin = req.user?.roleName === 'super_admin';
    const schoolId = isSuperAdmin
      ? resolveSchoolIdFromRequest(req)
      : ensureSchoolContext(req);
    const branchId = parsePositiveInt(req.query.branchId);
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      classId: req.query.classId,
      sectionId: req.query.sectionId,
      status: req.query.status,
      search: req.query.search,
      branchId,
      schoolId
    };

    const result = await studentService.getStudents(filters, { isSuperAdmin });

    return success(res, result, 'Students retrieved successfully', 200);
  });

  /**
   * GET /api/v1/students/:id
   * Get student by ID
   */
  getStudentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const schoolId = ensureSchoolContext(req);

    const student = await studentService.getStudentById(id, { schoolId });

    return success(res, student, 'Student retrieved successfully', 200);
  });

  /**
   * GET /api/v1/students/admission/:admissionNumber
   * Get student by admission number
   */
  getStudentByAdmissionNumber = asyncHandler(async (req, res) => {
    const { admissionNumber } = req.params;
    const schoolId = ensureSchoolContext(req);

    const student = await studentService.getStudentByAdmissionNumber(admissionNumber, { schoolId });

    return success(res, student, 'Student retrieved successfully', 200);
  });

  /**
   * GET /api/v1/students/roll/:rollNumber
   * Get student by roll number
   */
  getStudentByRollNumber = asyncHandler(async (req, res) => {
    const { rollNumber } = req.params;
    const schoolId = ensureSchoolContext(req);

    const student = await studentService.getStudentByRollNumber(rollNumber, { schoolId });

    return success(res, student, 'Student retrieved successfully', 200);
  });

  /**
   * POST /api/v1/students
   * Create new student
   */
  createStudent = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);

    const photoFile = pickUploadedFile(req, 'photo');
    const aadharFile = pickUploadedFile(req, 'aadhar');

    const personPayload = {
      ...(req.body.person || {})
    };

    if (photoFile && !personPayload.photo_url) {
      const photo = await photoStorageService.uploadPhoto(photoFile, {
        schoolId,
        entityType: 'student'
      });
      personPayload.photo_url = photo;
    }

    if (aadharFile && !personPayload.aadhar_url) {
      const aadharUrl = await photoStorageService.uploadDocument(aadharFile, {
        schoolId,
        entityType: 'student',
        documentType: 'aadhar'
      });
      personPayload.aadhar_url = aadharUrl;
    }

    req.body.person = personPayload;

    const student = await studentService.createStudent(req.body, { schoolId });

    return success(res, student, 'Student created successfully', 201);
  });

  /**
   * PUT /api/v1/students/:id
   * Update student
   */
  updateStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const schoolId = ensureSchoolContext(req);

    const photoFile = pickUploadedFile(req, 'photo');
    const aadharFile = pickUploadedFile(req, 'aadhar');

    const personPayload = {
      ...(req.body.person || {})
    };

    if (photoFile) {
      const photo = await photoStorageService.uploadPhoto(photoFile, {
        schoolId,
        entityType: 'student'
      });
      personPayload.photo_url = photo;
    }

    if (aadharFile) {
      const aadharUrl = await photoStorageService.uploadDocument(aadharFile, {
        schoolId,
        entityType: 'student',
        documentType: 'aadhar'
      });
      personPayload.aadhar_url = aadharUrl;
    }

    req.body.person = personPayload;

    const student = await studentService.updateStudent(id, req.body, { schoolId });

    return success(res, student, 'Student updated successfully', 200);
  });

  /**
   * DELETE /api/v1/students/:id
   * Delete student
   */
  deleteStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const schoolId = ensureSchoolContext(req);

    const result = await studentService.deleteStudent(id, { schoolId });

    return success(res, result, 'Student deleted successfully', 200);
  });

  /**
   * GET /api/v1/students/class/:classId
   * Get students by class
   */
  getStudentsByClass = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const schoolId = ensureSchoolContext(req);

    const result = await studentService.getStudentsByClass(classId, {
      schoolId,
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      search: req.query.search
    });

    return success(res, result, 'Students retrieved successfully', 200);
  });

  /**
   * GET /api/v1/students/class/:classId/section/:sectionId
   * Get students by section
   */
  getStudentsBySection = asyncHandler(async (req, res) => {
    const { classId, sectionId } = req.params;
    const schoolId = ensureSchoolContext(req);

    const result = await studentService.getStudentsBySection(classId, sectionId, {
      schoolId,
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      search: req.query.search
    });

    return success(res, result, 'Students retrieved successfully', 200);
  });

  /**
   * POST /api/v1/students/promotions
   * Promote students from one class/year to another
   */
  promoteStudents = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const result = await studentService.promoteStudents(req.body, {
      userId: req.user?.id,
      schoolId
    });

    return success(res, result, 'Students promoted successfully', 200);
  });

  /**
   * POST /api/v1/students/upload-document
   * Upload a single document (aadhar) to Bunny CDN immediately
   */
  uploadDocument = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);

    const file = req.files?.aadhar?.[0] || null;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No aadhar file provided',
        data: null,
        errors: [{ field: 'aadhar', message: 'Aadhar document file is required' }]
      });
    }

    const url = await photoStorageService.uploadDocument(file, {
      schoolId,
      entityType: 'student',
      documentType: 'aadhar'
    });

    return success(res, { url }, 'Document uploaded successfully', 200);
  });
}

module.exports = new StudentController();
