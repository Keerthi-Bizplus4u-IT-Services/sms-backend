const { LeavePolicy } = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');

class LeavePolicyRepository {
  async findAll(filters = {}) {
    const { schoolId, year, includeInactive = false } = filters;

    if (!schoolId) {
      throw new AppError('School context is required to fetch leave policies', 400);
    }

    const whereClause = { school_id: schoolId };

    if (typeof year !== 'undefined' && year !== null) {
      whereClause.year = parseInt(year, 10);
    }

    if (!includeInactive) {
      whereClause.is_active = true;
    }

    return LeavePolicy.findAll({
      where: whereClause,
      order: [
        ['year', 'DESC'],
        ['id', 'DESC'],
      ],
    });
  }

  async findById(id, options = {}) {
    const whereClause = { id };

    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    const policy = await LeavePolicy.findOne({ where: whereClause });
    if (!policy) {
      throw new AppError('Leave policy not found', 404);
    }
    return policy;
  }

  async findByYear(year, options = {}) {
    if (!options.schoolId) {
      throw new AppError('School context is required to fetch leave policies', 400);
    }

    return LeavePolicy.findOne({
      where: {
        school_id: options.schoolId,
        year: parseInt(year, 10),
      },
      order: [
        ['is_active', 'DESC'],
        ['id', 'DESC'],
      ],
    });
  }

  async create(data) {
    return LeavePolicy.create(data);
  }

  async update(id, data, options = {}) {
    const policy = await this.findById(id, options);
    return policy.update(data);
  }
}

module.exports = new LeavePolicyRepository();
