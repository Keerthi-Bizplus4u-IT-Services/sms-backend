const { Holiday } = require('../../../models');

class HolidayRepository {
    /**
     * Find all holidays for a school
     * @param {number} schoolId 
     * @returns {Promise<Array>}
     */
    async findAll(schoolId) {
        const holidays = await Holiday.findAll({
            where: { school_id: schoolId },
            order: [['start_date', 'ASC']]
        });

        // Transform to match frontend expectations: id, hname, sdate, edate
        return holidays.map(holiday => ({
            id: holiday.id,
            hname: holiday.name,
            sdate: holiday.start_date,
            edate: holiday.end_date
        }));
    }

    /**
     * Create a new holiday
     * @param {Object} holidayData 
     * @returns {Promise<Object>}
     */
    async create(holidayData) {
        const holiday = await Holiday.create({
            school_id: holidayData.school_id,
            name: holidayData.hname, // Mapping hname to name
            start_date: holidayData.sdate, // Mapping sdate to start_date
            end_date: holidayData.edate // Mapping edate to end_date
        });

        return {
            id: holiday.id,
            hname: holiday.name,
            sdate: holiday.start_date,
            edate: holiday.end_date
        };
    }

    /**
     * Delete a holiday
     * @param {number} id 
     * @param {number} schoolId 
     * @returns {Promise<boolean>}
     */
    async delete(id, schoolId) {
        const deleted = await Holiday.destroy({
            where: { id, school_id: schoolId }
        });
        return deleted > 0;
    }
}

module.exports = new HolidayRepository();
