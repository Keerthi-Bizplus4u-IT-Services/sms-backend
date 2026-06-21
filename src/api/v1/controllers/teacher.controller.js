const teacherService = require('../services/teacher.service');
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

class TeacherController {
  getTeachers = asyncHandler(async (req, res) => {
    const isSuperAdmin = req.user?.roleName === 'super_admin';
    const schoolId = isSuperAdmin
      ? resolveSchoolIdFromRequest(req)
      : ensureSchoolContext(req);
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      search: req.query.search,
      designation: req.query.designation,
      branchId: parsePositiveInt(req.query.branchId),
      schoolId
    };

    const result = await teacherService.getTeachers(filters, { isSuperAdmin });
    return success(res, result, 'Teachers retrieved successfully', 200);
  });

  getTeacherById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const schoolId = ensureSchoolContext(req);
    const teacher = await teacherService.getTeacherById(id, { schoolId });
    return success(res, teacher, 'Teacher retrieved successfully', 200);
  });

  createTeacher = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);

    const photoFile = pickUploadedFile(req, 'photo');
    const aadharFile = pickUploadedFile(req, 'aadhar');
    const panFile = pickUploadedFile(req, 'pan');

    const personPayload = {
      ...(req.body.person || {})
    };

    if (photoFile && !personPayload.photo_url) {
      const photo = await photoStorageService.uploadPhoto(photoFile, {
        schoolId,
        entityType: 'teacher'
      });
      personPayload.photo_url = photo;
    }

    if (aadharFile && !personPayload.aadhar_url) {
      const aadharUrl = await photoStorageService.uploadDocument(aadharFile, {
        schoolId,
        entityType: 'teacher',
        documentType: 'aadhar'
      });
      personPayload.aadhar_url = aadharUrl;
    }

    if (panFile && !personPayload.pan_url) {
      const panUrl = await photoStorageService.uploadDocument(panFile, {
        schoolId,
        entityType: 'teacher',
        documentType: 'pan'
      });
      personPayload.pan_url = panUrl;
    }

    req.body.person = personPayload;

    const teacher = await teacherService.createTeacher(req.body, { schoolId });
    return success(res, teacher, 'Teacher created successfully', 201);
  });

  updateTeacher = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const schoolId = ensureSchoolContext(req);

    const photoFile = pickUploadedFile(req, 'photo');
    const aadharFile = pickUploadedFile(req, 'aadhar');
    const panFile = pickUploadedFile(req, 'pan');

    const personPayload = {
      ...(req.body.person || {})
    };

    if (photoFile) {
      const photo = await photoStorageService.uploadPhoto(photoFile, {
        schoolId,
        entityType: 'teacher'
      });
      personPayload.photo_url = photo;
    }

    if (aadharFile) {
      const aadharUrl = await photoStorageService.uploadDocument(aadharFile, {
        schoolId,
        entityType: 'teacher',
        documentType: 'aadhar'
      });
      personPayload.aadhar_url = aadharUrl;
    }

    if (panFile) {
      const panUrl = await photoStorageService.uploadDocument(panFile, {
        schoolId,
        entityType: 'teacher',
        documentType: 'pan'
      });
      personPayload.pan_url = panUrl;
    }

    req.body.person = personPayload;

    const teacher = await teacherService.updateTeacher(id, req.body, { schoolId });
    return success(res, teacher, 'Teacher updated successfully', 200);
  });

  deleteTeacher = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const schoolId = ensureSchoolContext(req);
    const result = await teacherService.deleteTeacher(id, { schoolId });
    return success(res, result, 'Teacher deleted successfully', 200);
  });
}

module.exports = new TeacherController();
