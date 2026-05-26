const sectionService = require('../services/section.service');
const { success } = require('../../../utils/response');
const { asyncHandler, AppError } = require('../../../middleware/error.middleware');
const { ensureSchoolContext, parsePositiveInt } = require('../utils/context');

class SectionController {
  getSectionsByClass = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const classId = parsePositiveInt(req.query.classId || req.params.classId);

    if (!classId) {
      throw new AppError('classId is required', 400);
    }

    const data = await sectionService.getSectionsByClass(classId, { schoolId });
    return success(res, data, 'Sections retrieved successfully');
  });

  createSection = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const data = await sectionService.createSection(req.body, { schoolId });
    return success(res, data, 'Section created successfully', 201);
  });

  updateSection = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const sectionId = parsePositiveInt(req.params.id);

    if (!sectionId) {
      throw new AppError('Invalid section ID', 400);
    }

    const data = await sectionService.updateSection(sectionId, req.body, { schoolId });
    return success(res, data, 'Section updated successfully');
  });

  deleteSection = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const sectionId = parsePositiveInt(req.params.id);

    if (!sectionId) {
      throw new AppError('Invalid section ID', 400);
    }

    await sectionService.deleteSection(sectionId, { schoolId });
    return success(res, null, 'Section deleted successfully');
  });
}

module.exports = new SectionController();
