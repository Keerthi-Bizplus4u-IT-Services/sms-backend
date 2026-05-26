const holidayRepository = require('../repositories/holiday.repository');
const academicYearRepository = require('../repositories/academic-year.repository');
const { AppError } = require('../../../middleware/error.middleware');

const toDateOnly = (value) => {
    if (!value) {
        return null;
    }

    return String(value).slice(0, 10);
};

class HolidayService {
    /**
     * List all holidays for a school
     * @param {number} schoolId 
     * @returns {Promise<Array>}
     */
    async listHolidays(schoolId) {
        return await holidayRepository.findAll(schoolId);
    }

    /**
     * Create a new holiday
     * @param {Object} holidayData 
     * @returns {Promise<Object>}
     */
    async createHoliday(holidayData) {
        const schoolId = holidayData.school_id;
        const currentAcademicYear = await academicYearRepository.findCurrent({ schoolId });

        if (!currentAcademicYear) {
            throw new AppError('Current academic year is not configured', 404);
        }

        const holidayStartDate = toDateOnly(holidayData.sdate);
        const holidayEndDate = toDateOnly(holidayData.edate);
        const academicYearStart = toDateOnly(currentAcademicYear.start_date);
        const academicYearEnd = toDateOnly(currentAcademicYear.end_date);

        const isOutsideCurrentAcademicYear =
            holidayStartDate < academicYearStart ||
            holidayStartDate > academicYearEnd ||
            holidayEndDate < academicYearStart ||
            holidayEndDate > academicYearEnd;

        if (isOutsideCurrentAcademicYear) {
            throw new AppError(
                `Holiday dates must be within the current academic year (${academicYearStart} to ${academicYearEnd})`,
                400
            );
        }

        return await holidayRepository.create(holidayData);
    }

    /**
     * Delete a holiday
     * @param {number} id 
     * @param {number} schoolId 
     * @returns {Promise<boolean>}
     */
    async deleteHoliday(id, schoolId) {
        return await holidayRepository.delete(id, schoolId);
    }
}

module.exports = new HolidayService();
