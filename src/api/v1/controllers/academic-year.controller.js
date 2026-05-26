const academicYearService = require('../services/academic-year.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { ensureSchoolContext } = require('../utils/context');

class AcademicYearController {
  getAcademicYears = asyncHandler(async (req, res) => {
    const filters = {
      page: req.query.page,
      limit: req.query.limit
    };

    if (typeof req.query.isCurrent !== 'undefined') {
      filters.isCurrent = req.query.isCurrent === 'true';
    }

    const schoolId = ensureSchoolContext(req);
    const result = await academicYearService.getAcademicYears(filters, { schoolId });
    return success(res, result, 'Academic years retrieved successfully', 200);
  });

  getCurrentAcademicYear = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const year = await academicYearService.getCurrentAcademicYear({ schoolId });
    return success(res, year, 'Current academic year retrieved successfully', 200);
  });

  createAcademicYear = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const year = await academicYearService.createAcademicYear(req.body, { schoolId });
    return success(res, year, 'Academic year created successfully', 201);
  });

  updateAcademicYear = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const year = await academicYearService.updateAcademicYear(req.params.id, req.body, { schoolId });
    return success(res, year, 'Academic year updated successfully', 200);
  });

  setCurrentAcademicYear = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const year = await academicYearService.setCurrentAcademicYear(req.params.id, { schoolId });
    return success(res, year, 'Academic year set as current successfully', 200);
  });

  createMigrationDraft = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const draft = await academicYearService.createMigrationDraft(req.body, { schoolId });
    return success(res, draft, 'Academic year migration draft created successfully', 200);
  });

  finalizeMigration = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const result = await academicYearService.finalizeMigration(req.body, {
      schoolId,
      userId: req.user?.id
    });
    return success(res, result, 'Academic year migration finalized successfully', 200);
  });
}

module.exports = new AcademicYearController();
