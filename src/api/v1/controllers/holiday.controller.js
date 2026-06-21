const holidayService = require('../services/holiday.service');
const { success, error } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { ensureSchoolContext } = require('../utils/context');

class HolidayController {
    /**
     * Get all holidays
     */
    getHolidays = asyncHandler(async (req, res) => {
        const schoolId = ensureSchoolContext(req);

        const result = await holidayService.listHolidays(schoolId);
        return success(res, result, 'Holidays retrieved successfully', 200);
    });

    /**
     * Create a holiday
     */
    createHoliday = asyncHandler(async (req, res) => {
        const schoolId = ensureSchoolContext(req);

        const holidayData = {
            ...req.body,
            school_id: schoolId
        };

        const result = await holidayService.createHoliday(holidayData);
        return success(res, result, 'Holiday added successfully', 201);
    });

    /**
     * Delete a holiday
     */
    deleteHoliday = asyncHandler(async (req, res) => {
        const schoolId = ensureSchoolContext(req);
        const { id } = req.params;

        const deleted = await holidayService.deleteHoliday(id, schoolId);

        if (!deleted) {
            return error(res, 'Holiday not found or unauthorized', 404);
        }

        return success(res, null, 'Holiday deleted successfully', 200);
    });
}

module.exports = new HolidayController();
