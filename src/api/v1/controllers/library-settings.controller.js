const librarySettingsService = require('../services/library-settings.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { resolveSchoolIdFromRequest } = require('../utils/context');

const resolveScope = (req) => ({
  schoolId: resolveSchoolIdFromRequest(req)
});

class LibrarySettingsController {
  // Lending settings
  getSettings = asyncHandler(async (req, res) => {
    const result = await librarySettingsService.getSettings(resolveScope(req));
    return success(res, result, 'Library settings retrieved', 200);
  });

  upsertSettings = asyncHandler(async (req, res) => {
    const result = await librarySettingsService.upsertSettings(req.body, resolveScope(req));
    return success(res, result, 'Library settings updated', 200);
  });

  // Fine rules
  getFineRules = asyncHandler(async (req, res) => {
    const result = await librarySettingsService.getFineRules(resolveScope(req));
    return success(res, result, 'Fine rules retrieved', 200);
  });

  createFineRule = asyncHandler(async (req, res) => {
    const result = await librarySettingsService.createFineRule(req.body, resolveScope(req));
    return success(res, result, 'Fine rule created', 201);
  });

  updateFineRule = asyncHandler(async (req, res) => {
    const result = await librarySettingsService.updateFineRule(parseInt(req.params.id, 10), req.body, resolveScope(req));
    return success(res, result, 'Fine rule updated', 200);
  });

  deleteFineRule = asyncHandler(async (req, res) => {
    await librarySettingsService.deleteFineRule(parseInt(req.params.id, 10), resolveScope(req));
    return success(res, null, 'Fine rule deleted', 200);
  });
}

module.exports = new LibrarySettingsController();
