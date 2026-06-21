const sessionHourService = require('../services/session-hour.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { ensureSchoolContext, parsePositiveInt } = require('../utils/context');

class SessionHourController {
  getSessionHours = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const filters = {
      scope: req.query.scope ? String(req.query.scope).toUpperCase() : undefined,
      classId: parsePositiveInt(req.query.classId),
      sectionId: parsePositiveInt(req.query.sectionId)
    };

    const data = await sessionHourService.listSessionHours(filters, { schoolId });
    return success(res, data, 'Session hours retrieved successfully');
  });

  getEffectiveSessionHours = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const params = {
      classId: parsePositiveInt(req.query.classId),
      sectionId: parsePositiveInt(req.query.sectionId)
    };

    const data = await sessionHourService.getEffectiveSessionHours(params, { schoolId });
    return success(res, data, 'Applicable session hours retrieved successfully');
  });

  createSessionHour = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const data = await sessionHourService.createSessionHour(req.body, { schoolId });
    return success(res, data, 'Session hour created successfully', 201);
  });

  updateSessionHour = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const data = await sessionHourService.updateSessionHour(req.params.id, req.body, { schoolId });
    return success(res, data, 'Session hour updated successfully');
  });

  deleteSessionHour = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    await sessionHourService.deleteSessionHour(req.params.id, { schoolId });
    return success(res, null, 'Session hour deleted successfully');
  });
}

module.exports = new SessionHourController();
