const { AcademicYear } = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');

class AcademicYearRepository {
  async findAll(filters = {}) {
    const { page = 1, limit = 25, schoolId, isCurrent } = filters;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
    const offset = (parsedPage - 1) * parsedLimit;

    const whereClause = {};

    if (schoolId) {
      whereClause.school_id = schoolId;
    }

    if (typeof isCurrent === 'boolean') {
      whereClause.is_current = isCurrent;
    }

    const { rows: academicYears, count: total } = await AcademicYear.findAndCountAll({
      where: whereClause,
      limit: parsedLimit,
      offset,
      order: [
        ['start_date', 'DESC'],
        ['id', 'DESC']
      ]
    });

    return {
      academicYears,
      total,
      page: parsedPage,
      totalPages: total === 0 ? 0 : Math.ceil(total / parsedLimit)
    };
  }

  async findById(id, options = {}) {
    const whereClause = { id };

    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    const academicYear = await AcademicYear.findOne({ where: whereClause });
    if (!academicYear) {
      throw new AppError('Academic year not found', 404);
    }
    return academicYear;
  }

  async findCurrent(options = {}) {
    const whereClause = { is_current: true };
    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    return AcademicYear.findOne({ where: whereClause });
  }

  async create(data) {
    if (!data.school_id) {
      throw new AppError('school_id is required', 400);
    }

    return AcademicYear.create(data);
  }

  async update(id, data, options = {}) {
    const academicYear = await this.findById(id, options);
    return academicYear.update(data);
  }

  async setCurrent(id, options = {}) {
    if (!options.schoolId) {
      throw new AppError('School context is required', 400);
    }

    const academicYear = await this.findById(id, options);

    if (academicYear.is_current) {
      return academicYear;
    }

    await AcademicYear.update(
      { is_current: false },
      { where: { is_current: true, school_id: options.schoolId } }
    );

    await academicYear.update({ is_current: true });
    return academicYear;
  }

  async findByName(name, options = {}) {
    const whereClause = { name };
    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    return AcademicYear.findOne({ where: whereClause });
  }
}

module.exports = new AcademicYearRepository();
