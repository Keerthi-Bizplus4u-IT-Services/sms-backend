const timetableRepository = require('../repositories/timetable.repository');
const { AppError } = require('../../../middleware/error.middleware');

class TimetableService {
    async getSchedule(filters = {}, user = {}) {
        return timetableRepository.findAll({
            ...filters,
            schoolId: user.schoolId || null,
            roleName: user.roleName,
            userId: user.id
        });
    }

    async searchSchedule(searchParams = {}, user = {}) {
        return timetableRepository.search({
            ...searchParams,
            schoolId: user.schoolId || null,
            roleName: user.roleName,
            userId: user.id
        });
    }

    async getMySchedule(user = {}) {
        if (user.roleName === 'student') {
            return timetableRepository.findStudentScheduleByUserId(user.id, user.schoolId || null);
        }

        if (user.roleName === 'teacher') {
            return timetableRepository.findAll({
                schoolId: user.schoolId || null,
                roleName: 'teacher',
                userId: user.id
            });
        }

        throw new AppError('Only students and teachers can access this endpoint', 403);
    }
}

module.exports = new TimetableService();
