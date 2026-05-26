const timetableService = require('../services/timetable.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');

class TimetableController {
    /**
     * GET /api/v1/all-class
     * Get all class schedules
     */
    getSchedule = asyncHandler(async (req, res) => {
        const results = await timetableService.getSchedule({}, req.user);
        return success(res, { userData: results }, 'Timetable retrieved successfully', 200);
    });

    /**
     * GET /api/v1/my-timetable
     * Get timetable for the current student
     */
    getMySchedule = asyncHandler(async (req, res) => {
        const results = await timetableService.getMySchedule(req.user);
        return success(res, { userData: results }, 'Timetable retrieved successfully', 200);
    });

    /**
     * POST /api/v1/allclasssearch
     * Search class schedules
     */
    searchSchedule = asyncHandler(async (req, res) => {
        const { 'allclass-id': id, 'allclass-name': name, 'allclass-class': className } = req.body;
        const results = await timetableService.searchSchedule({ id, name, className }, req.user);
        return success(res, { userData: results }, 'Timetable search results retrieved', 200);
    });
}

module.exports = new TimetableController();
