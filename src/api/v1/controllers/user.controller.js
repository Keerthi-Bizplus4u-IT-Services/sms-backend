const userRepository = require('../repositories/user.repository');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');

class UserController {
    /**
     * GET /api/v1/users
     * Returns all users with names and role types for messaging
     */
    getUsers = asyncHandler(async (req, res) => {
        const users = await userRepository.findAllForMessaging();
        return success(res, users, 'Users retrieved successfully', 200);
    });

}

module.exports = new UserController();
