const { HostelRoom, HostelBuilding, sequelize } = require('../../../models');

class HostelRepository {
    /**
     * Get all hostel rooms for a school
     * @param {number} schoolId 
     * @returns {Promise<Array>}
     */
    async findAllRooms(schoolId) {
        const rooms = await HostelRoom.findAll({
            include: [{
                model: HostelBuilding,
                as: 'building',
                where: { school_id: schoolId }
            }]
        });

        // Map to frontend format
        return rooms.map(room => ({
            id: room.id,
            hname: room.building.building_name,
            rno: room.room_number,
            bedno: room.capacity,
            cost: room.monthly_rent,
            available: room.capacity - room.occupied_beds
        }));
    }

    /**
     * Create a new hostel room
     * @param {Object} roomData 
     * @param {number} schoolId 
     */
    async createRoom(roomData, schoolId) {
        const { hname, rno, bedno, cost } = roomData;

        return await sequelize.transaction(async (t) => {
            // Find or create building
            let [building] = await HostelBuilding.findOrCreate({
                where: { building_name: hname, school_id: schoolId },
                defaults: { building_type: 'co_ed' },
                transaction: t
            });

            // Create room
            return await HostelRoom.create({
                building_id: building.id,
                room_number: rno,
                capacity: parseInt(bedno) || 1,
                monthly_rent: parseFloat(cost) || 0.00
            }, { transaction: t });
        });
    }

    /**
     * Delete a hostel room
     * @param {number} id 
     */
    async deleteRoom(id) {
        return await HostelRoom.destroy({
            where: { id }
        });
    }
}

module.exports = new HostelRepository();
