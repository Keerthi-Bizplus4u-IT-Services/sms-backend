const { classRepository, subjectRepository } = require('../repositories/class.repository');
const { AcademicYear } = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');

class ClassService {
  async getClasses(filters = {}, context = {}) {
    const schoolId = context.schoolId ?? filters.schoolId;

    if (!schoolId) {
      throw new AppError('School context is required to fetch classes', 400);
    }

    return await classRepository.findAll({
      ...filters,
      schoolId
    });
  }

  async getClassesByAcademicYear(academicYearId, context = {}) {
    const { schoolId, page, limit } = context;

    if (!schoolId) {
      throw new AppError('School context is required to fetch classes', 400);
    }

    return await classRepository.findAll({
      academicYearId,
      page: page ?? 1,
      limit: limit ?? 50,
      schoolId
    });
  }

  async getClassById(id, context = {}) {
    return await classRepository.findById(id, context);
  }

  async createClass(data, context = {}) {
    const schoolId = context.schoolId ?? data.schoolId;

    if (!schoolId) {
      throw new AppError('School context is required to create classes', 400);
    }

    if (!data?.branch_id) {
      throw new AppError('branch_id is required', 400);
    }

    if (!data?.academic_year_id) {
      throw new AppError('academic_year_id is required', 400);
    }

    const academicYear = await AcademicYear.findByPk(data.academic_year_id);

    if (!academicYear) {
      throw new AppError('Academic year not found', 404);
    }

    if (academicYear.school_id !== schoolId) {
      throw new AppError('Academic year does not belong to your school', 403);
    }

    return await classRepository.create(
      {
        ...data
      },
      { schoolId }
    );
  }

  async updateClass(id, data, context = {}) {
    const schoolId = context.schoolId ?? data.schoolId;

    if (!schoolId) {
      throw new AppError('School context is required to update classes', 400);
    }

    if (data?.academic_year_id) {
      const academicYear = await AcademicYear.findByPk(data.academic_year_id);

      if (!academicYear) {
        throw new AppError('Academic year not found', 404);
      }

      if (academicYear.school_id !== schoolId) {
        throw new AppError('Academic year does not belong to your school', 403);
      }
    }

    return await classRepository.update(id, data, { schoolId });
  }

  async deleteClass(id, context = {}) {
    const schoolId = context.schoolId;

    if (!schoolId) {
      throw new AppError('School context is required to delete classes', 400);
    }

    return await classRepository.delete(id, { schoolId });
  }
}

class SubjectService {
  async getSubjects(filters = {}, context = {}) {
    const schoolId = context.schoolId ?? filters.schoolId;

    if (!schoolId) {
      throw new AppError('School context is required to fetch subjects', 400);
    }

    return await subjectRepository.findAll({
      ...filters,
      schoolId
    });
  }

  async getSubjectById(id, context = {}) {
    return await subjectRepository.findById(id, context);
  }

  async createSubject(data, context = {}) {
    const schoolId = context.schoolId ?? data.school_id;

    if (!schoolId) {
      throw new AppError('School context is required to create subjects', 400);
    }

    return await subjectRepository.create(
      {
        ...data,
        school_id: schoolId
      },
      { schoolId }
    );
  }

  async updateSubject(id, data, context = {}) {
    const schoolId = context.schoolId ?? data.school_id;

    if (!schoolId) {
      throw new AppError('School context is required to update subjects', 400);
    }

    return await subjectRepository.update(id, data, { schoolId });
  }

  async deleteSubject(id, context = {}) {
    if (!context.schoolId) {
      throw new AppError('School context is required to delete subjects', 400);
    }
    return await subjectRepository.delete(id, { schoolId: context.schoolId });
  }
}

module.exports = {
  classService: new ClassService(),
  subjectService: new SubjectService()
};
