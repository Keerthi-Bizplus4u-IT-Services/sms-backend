const hostelService = require('../services/hostel.service');
const { success, error } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');

class HostelController {
    /**
     * Get hostel rooms
     */
    getHostelRooms = asyncHandler(async (req, res) => {
        const schoolId = req.user?.schoolId || req.session?.schoolId || 1;
        const result = await hostelService.listRooms(schoolId);
        return success(res, result, 'Hostel rooms retrieved successfully', 200);
    });

    /**
     * Add hostel room
     */
    addRoom = asyncHandler(async (req, res) => {
        const schoolId = req.user?.schoolId || req.session?.schoolId || 1;
        await hostelService.addRoom(req.body, schoolId);
        return success(res, null, 'Room added successfully', 201);
    });

    /**
     * Delete hostel room
     */
    deleteRoom = asyncHandler(async (req, res) => {
        const { id } = req.params;
        await hostelService.deleteRoom(id);
        return success(res, null, 'Room deleted successfully', 200);
    });
}

module.exports = new HostelController();
