const hostelRepository = require('../repositories/hostel.repository');

class HostelService {
    /**
     * List all rooms
     */
    async listRooms(schoolId) {
        return await hostelRepository.findAllRooms(schoolId);
    }

    /**
     * Add a room
     */
    async addRoom(roomData, schoolId) {
        return await hostelRepository.createRoom(roomData, schoolId);
    }

    /**
     * Delete a room
     */
    async deleteRoom(id) {
        return await hostelRepository.deleteRoom(id);
    }
}

module.exports = new HostelService();
