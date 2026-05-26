const { classService, subjectService } = require('../services/class.service');
const { success } = require('../../../utils/response');
const { asyncHandler, AppError } = require('../../../middleware/error.middleware');
const { ensureSchoolContext, parsePositiveInt } = require('../utils/context');

class ClassController {
  getClasses = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      academicYearId: req.query.academicYearId,
      branchId: parsePositiveInt(req.query.branchId)
    };
    const result = await classService.getClasses(filters, { schoolId });
    return success(res, result, 'Classes retrieved successfully', 200);
  });

  getClassesByAcademicYear = asyncHandler(async (req, res) => {
    const academicYearId = parseInt(req.params.academicYearId, 10);
    const schoolId = ensureSchoolContext(req);
    const page = parsePositiveInt(req.query.page);
    const limit = parsePositiveInt(req.query.limit);

    if (Number.isNaN(academicYearId)) {
      throw new AppError('Invalid academic year ID', 400);
    }

    const result = await classService.getClassesByAcademicYear(academicYearId, {
      schoolId,
      page,
      limit
    });

    return success(res, result, 'Classes retrieved successfully', 200);
  });

  getClassById = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const classData = await classService.getClassById(req.params.id, { schoolId });
    return success(res, classData, 'Class retrieved successfully', 200);
  });

  createClass = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const classData = await classService.createClass(req.body, { schoolId });
    return success(res, classData, 'Class created successfully', 201);
  });

  updateClass = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const classData = await classService.updateClass(req.params.id, req.body, { schoolId });
    return success(res, classData, 'Class updated successfully', 200);
  });

  deleteClass = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const result = await classService.deleteClass(req.params.id, { schoolId });
    return success(res, result, 'Class deleted successfully', 200);
  });
}

class SubjectController {
  getSubjects = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      type: req.query.type,
      classId: parsePositiveInt(req.query.class_id ?? req.query.classId)
    };
    const result = await subjectService.getSubjects(filters, { schoolId });
    return success(res, result, 'Subjects retrieved successfully', 200);
  });

  getSubjectById = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const subject = await subjectService.getSubjectById(req.params.id, { schoolId });
    return success(res, subject, 'Subject retrieved successfully', 200);
  });

  createSubject = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const subject = await subjectService.createSubject(req.body, { schoolId });
    return success(res, subject, 'Subject created successfully', 201);
  });

  updateSubject = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const subject = await subjectService.updateSubject(req.params.id, req.body, { schoolId });
    return success(res, subject, 'Subject updated successfully', 200);
  });

  deleteSubject = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const result = await subjectService.deleteSubject(req.params.id, { schoolId });
    return success(res, result, 'Subject deleted successfully', 200);
  });
}

module.exports = {
  classController: new ClassController(),
  subjectController: new SubjectController()
};
