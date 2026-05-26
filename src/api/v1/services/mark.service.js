const markRepository = require('../repositories/mark.repository');
const parentDashboardRepository = require('../repositories/parent-dashboard.repository');
const { AppError } = require('../../../middleware/error.middleware');
const { AcademicYear } = require('../../../models');

const normalizeRoleName = (roleName) => {
    if (!roleName || typeof roleName !== 'string') {
        return '';
    }

    return roleName.trim().toLowerCase();
};

class MarkService {
    async resolveAcademicYearId(schoolId, requestedAcademicYearId = null) {
        const parsedRequested = requestedAcademicYearId ? parseInt(requestedAcademicYearId, 10) : null;
        if (Number.isInteger(parsedRequested) && parsedRequested > 0) {
            return parsedRequested;
        }

        const currentYear = await AcademicYear.findOne({
            where: {
                school_id: schoolId,
                is_current: true
            },
            attributes: ['id']
        });

        if (!currentYear) {
            throw new AppError('Current academic year not found', 404);
        }

        return currentYear.id;
    }

    /**
     * Get marks based on search criteria
     * @param {Object} formData 
     * @param {number} schoolId 
     * @returns {Promise<Array>}
     */
    async getMarks(formData, context = {}) {
        const schoolId = context.schoolId;
        const userId = context.userId;
        const roleName = normalizeRoleName(context.roleName);
        let studentId = formData?.studentId || null;

        if (roleName === 'parent') {
            const parent = await parentDashboardRepository.findParentByUserId(userId);
            if (!parent) {
                throw new AppError('Parent record not found', 404);
            }

            const studentIds = await parentDashboardRepository.getStudentIdsByParentId(parent.id);
            if (!studentIds.length) {
                return [];
            }

            const parsedStudentId = parseInt(studentId, 10);
            const selectedStudentId = Number.isInteger(parsedStudentId) && parsedStudentId > 0
                ? parsedStudentId
                : studentIds[0];

            const hasAccess = studentIds.some((id) => Number(id) === Number(selectedStudentId));
            if (!hasAccess) {
                throw new AppError('You do not have access to this child', 403);
            }

            studentId = selectedStudentId;
        }

        return await markRepository.findMarks({
            ...formData,
            school_id: schoolId,
            studentId
        });
    }

    async upsertMarks(payload = {}, context = {}) {
        const schoolId = context.schoolId;
        const enteredBy = context.userId || null;

        const marks = payload?.marks || {};
        if (!marks || typeof marks !== 'object' || !Object.keys(marks).length) {
            throw new AppError('Marks payload is required', 400);
        }

        return markRepository.upsertMarks({
            schoolId,
            enteredBy,
            examId: payload.examId,
            examName: payload.exam,
            classId: payload.classId || payload.sclass,
            sectionId: payload.sectionId || payload.section,
            subjectId: payload.subjectId,
            subjectName: payload.subject,
            marks
        });
    }

    async listGrades(filters = {}, context = {}) {
        const academicYearId = await this.resolveAcademicYearId(context.schoolId, filters.academicYearId);
        return markRepository.findGrades({ academicYearId });
    }

    async getGradeById(id, context = {}) {
        const grade = await markRepository.findGradeById(id);
        const academicYearId = await this.resolveAcademicYearId(context.schoolId);

        if (Number(grade.academic_year_id) !== Number(academicYearId)) {
            throw new AppError('Grade not found', 404);
        }

        return {
            id: grade.id,
            gradeName: grade.grade_name,
            gradePoint: Number(grade.grade_point || 0),
            percentFrom: Number(grade.min_percentage),
            percentUpto: Number(grade.max_percentage),
            comment: grade.description || ''
        };
    }

    async createGrade(payload = {}, context = {}) {
        const academicYearId = await this.resolveAcademicYearId(context.schoolId, payload.academicYearId);
        return markRepository.createGrade({
            academicYearId,
            gradeName: payload.gname,
            gradePoint: payload.gpoint,
            percentFrom: payload.pform,
            percentTo: payload.pto,
            description: payload.comment
        });
    }

    async updateGrade(id, payload = {}, context = {}) {
        const existing = await markRepository.findGradeById(id);
        const academicYearId = await this.resolveAcademicYearId(context.schoolId);

        if (Number(existing.academic_year_id) !== Number(academicYearId)) {
            throw new AppError('Grade not found', 404);
        }

        return markRepository.updateGrade(id, {
            gradeName: payload.gname ?? payload.gradeName,
            gradePoint: payload.gpoint ?? payload.gradePoint,
            percentFrom: payload.pform ?? payload.percentFrom,
            percentTo: payload.pto ?? payload.percentUpto,
            description: payload.comment
        });
    }

    async deleteGrade(id, context = {}) {
        const existing = await markRepository.findGradeById(id);
        const academicYearId = await this.resolveAcademicYearId(context.schoolId);

        if (Number(existing.academic_year_id) !== Number(academicYearId)) {
            throw new AppError('Grade not found', 404);
        }

        return markRepository.deleteGrade(id);
    }
}

module.exports = new MarkService();
