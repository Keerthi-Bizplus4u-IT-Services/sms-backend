const { SessionHour, Class, Section } = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');

class SessionHourRepository {
  async findAll(filters = {}) {
    const {
      schoolId,
      scope,
      classId,
      sectionId,
      orderBy = 'start_time',
      sort = 'ASC'
    } = filters;

    const allowedOrderFields = ['start_time', 'end_time', 'scope', 'period_label'];
    const normalizedOrder = allowedOrderFields.includes(orderBy) ? orderBy : 'start_time';
    const normalizedSort = ['ASC', 'DESC'].includes(String(sort).toUpperCase()) ? String(sort).toUpperCase() : 'ASC';

    const whereClause = { school_id: schoolId };

    if (scope) {
      whereClause.scope = scope;
    }

    if (classId) {
      whereClause.class_id = classId;
    }

    if (sectionId) {
      whereClause.section_id = sectionId;
    }

    const data = await SessionHour.findAll({
      where: whereClause,
      include: [
        { model: Class, as: 'class', attributes: ['id', 'name'] },
        { model: Section, as: 'section', attributes: ['id', 'name'] }
      ],
      order: [[normalizedOrder, normalizedSort]]
    });

    return data;
  }

  async findById(id, schoolId) {
    const sessionHour = await SessionHour.findOne({
      where: {
        id,
        school_id: schoolId
      },
      include: [
        { model: Class, as: 'class', attributes: ['id', 'name'] },
        { model: Section, as: 'section', attributes: ['id', 'name'] }
      ]
    });

    if (!sessionHour) {
      throw new AppError('Session hour not found', 404);
    }

    return sessionHour;
  }

  async findEffective({ schoolId, sectionId, classId }) {
    const priorityQueries = [];

    if (sectionId) {
      priorityQueries.push({
        where: { school_id: schoolId, scope: 'SECTION', section_id: sectionId }
      });
    }

    if (classId) {
      priorityQueries.push({
        where: { school_id: schoolId, scope: 'CLASS', class_id: classId }
      });
    }

    priorityQueries.push({
      where: { school_id: schoolId, scope: 'SCHOOL' }
    });

    for (const query of priorityQueries) {
      const result = await SessionHour.findAll({
        where: query.where,
        include: [
          { model: Class, as: 'class', attributes: ['id', 'name'] },
          { model: Section, as: 'section', attributes: ['id', 'name'] }
        ],
        order: [['start_time', 'ASC']]
      });

      if (result.length > 0) {
        return result;
      }
    }

    return [];
  }

  async create(data) {
    const sessionHour = await SessionHour.create(data);
    return this.findById(sessionHour.id, data.school_id);
  }

  async update(id, data, schoolId) {
    const sessionHour = await this.findById(id, schoolId);
    await sessionHour.update(data);
    return this.findById(id, schoolId);
  }

  async delete(id, schoolId) {
    const sessionHour = await this.findById(id, schoolId);
    await sessionHour.destroy();
    return { deleted: true };
  }
}

module.exports = new SessionHourRepository();
