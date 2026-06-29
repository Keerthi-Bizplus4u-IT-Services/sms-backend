const parentService = require('../services/parent.service');
const photoStorageService = require('../services/photo-storage.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { ensureSchoolContext, resolveSchoolIdFromRequest } = require('../utils/context');

const pickUploadedFile = (req, fieldName) => {
  if (req.files && Array.isArray(req.files[fieldName]) && req.files[fieldName][0]) {
    return req.files[fieldName][0];
  }

  if (fieldName === 'photo' && req.file) {
    return req.file;
  }

  return null;
};

class ParentController {
  getParents = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      studentId: req.query.studentId
    };
    const result = await parentService.getParents(filters, { schoolId });
    return success(res, result, 'Parents retrieved successfully', 200);
  });

  getParentById = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const parent = await parentService.getParentById(req.params.id, { schoolId });
    return success(res, parent, 'Parent retrieved successfully', 200);
  });

  createParent = asyncHandler(async (req, res) => {
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
        entityType: 'parent'
      });
      personPayload.photo_url = photo;
    }

    if (aadharFile && !personPayload.aadhar_url) {
      const aadharUrl = await photoStorageService.uploadDocument(aadharFile, {
        schoolId,
        entityType: 'parent',
        documentType: 'aadhar'
      });
      personPayload.aadhar_url = aadharUrl;
    }

    if (panFile && !personPayload.pan_url) {
      const panUrl = await photoStorageService.uploadDocument(panFile, {
        schoolId,
        entityType: 'parent',
        documentType: 'pan'
      });
      personPayload.pan_url = panUrl;
    }

    req.body.person = personPayload;

    const parent = await parentService.createParent(req.body);
    return success(res, parent, 'Parent created successfully', 201);
  });

  linkStudent = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);

    const parent = await parentService.linkStudentToParent(
      req.params.id,
      req.params.studentId,
      req.body,
      { schoolId }
    );

    return success(res, parent, 'Student linked to parent successfully', 200);
  });

  updateParent = asyncHandler(async (req, res) => {
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
        entityType: 'parent'
      });
      personPayload.photo_url = photo;
    }

    if (aadharFile) {
      const aadharUrl = await photoStorageService.uploadDocument(aadharFile, {
        schoolId,
        entityType: 'parent',
        documentType: 'aadhar'
      });
      personPayload.aadhar_url = aadharUrl;
    }

    if (panFile) {
      const panUrl = await photoStorageService.uploadDocument(panFile, {
        schoolId,
        entityType: 'parent',
        documentType: 'pan'
      });
      personPayload.pan_url = panUrl;
    }

    req.body.person = personPayload;

    const parent = await parentService.updateParent(req.params.id, req.body, { schoolId });
    return success(res, parent, 'Parent updated successfully', 200);
  });

  deleteParent = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const result = await parentService.deleteParent(req.params.id, { schoolId });
    return success(res, result, 'Parent deleted successfully', 200);
  });

  syncStudentLinks = asyncHandler(async (req, res) => {
    const schoolId = resolveSchoolIdFromRequest(req);
    const dryRun = req.body?.dryRun === true || req.body?.dryRun === 'true';

    const result = await parentService.syncStudentLinks({ schoolId, dryRun });
    return success(res, result, dryRun ? 'Parent-student link sync preview generated' : 'Parent-student links synchronized successfully', 200);
  });
}

module.exports = new ParentController();
