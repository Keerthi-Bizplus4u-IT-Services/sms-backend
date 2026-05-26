const examRepository = require('../repositories/exam.repository');
const { AppError } = require('../../../middleware/error.middleware');
const { AcademicYear } = require('../../../models');

const parsePositiveInt = (value) => {
  if (typeof value === 'undefined' || value === null || value === '') {
    return null;
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
};

class ExamService {
  async getExams(filters = {}, context = {}) {
    const schoolId = parsePositiveInt(context.schoolId);

    if (!schoolId) {
      throw new AppError('School context is required to fetch exams', 400);
    }

    let academicYearId = parsePositiveInt(filters.academicYearId);

    if (!academicYearId) {
      const currentYear = await AcademicYear.findOne({
        where: {
          school_id: schoolId,
          is_current: true
        },
        attributes: ['id']
      });

      academicYearId = currentYear?.id || null;
    }

    const exams = await examRepository.findAll({ schoolId, academicYearId });
    const seenExamNames = new Set();

    return exams.filter((exam) => {
      const examKey = String(exam?.ename || exam?.eid || '')
        .trim()
        .toLowerCase();

      if (!examKey || seenExamNames.has(examKey)) {
        return false;
      }

      seenExamNames.add(examKey);
      return true;
    });
  }
}

module.exports = new ExamService();