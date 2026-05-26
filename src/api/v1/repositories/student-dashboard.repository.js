const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { Person, Student, Class, Section, User } = require('../../../models');
const { resolveTableName, getTableColumns } = require('./helpers/schema.utils');

const wrapIdentifier = (value) => `"${String(value).replace(/"/g, '')}"`;

class StudentDashboardRepository {
  async findUserById(userId) {
    return User.findByPk(userId, {
      attributes: ['id', 'email']
    });
  }

  /**
   * Find student record by user id (User -> Person -> Student)
   */
  async findStudentByUserId(userId) {
    const person = await Person.findOne({
      where: { user_id: userId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'email'] },
        {
          model: Student,
          as: 'student',
          required: true,
          include: [
            { model: Class, as: 'class', attributes: ['id', 'name', 'numeric_grade'] },
            { model: Section, as: 'section', attributes: ['id', 'name'] }
          ]
        }
      ]
    });
    return person?.student || null;
  }

  /**
   * Get person with student for a given user id (for full profile including user email)
   */
  async findPersonWithStudentByUserId(userId) {
    const person = await Person.findOne({
      where: { user_id: userId },
      include: [
        { model: User, as: 'user', attributes: ['id', 'email'] },
        {
          model: Student,
          as: 'student',
          required: true,
          include: [
            { model: Class, as: 'class', attributes: ['id', 'name', 'numeric_grade'] },
            { model: Section, as: 'section', attributes: ['id', 'name'] }
          ]
        }
      ]
    });
    return person;
  }

  /**
   * Get notices for dashboard
   */
  async getNotices(limit = 20) {
    const table = await resolveTableName(['notices', 'notice']);
    if (!table) return [];

    const columns = await getTableColumns(table);
    const hasDeleted = columns.has('deleted_at');
    const hasPublished = columns.has('is_published');
    const dateCol = columns.has('date') ? 'date' : columns.has('created_at') ? 'created_at' : 'date';
    const titleCol = columns.has('title') ? 'title' : 'title';
    const contentCol = columns.has('content') ? 'content' : columns.has('body') ? 'body' : 'posted';

    const where = [];
    if (hasDeleted) where.push('deleted_at IS NULL');
    if (hasPublished) where.push('(is_published = true OR is_published IS NULL)');
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await sequelize.query(
      `SELECT ${wrapIdentifier(dateCol)} AS date, ${wrapIdentifier(titleCol)} AS title, COALESCE(${wrapIdentifier(contentCol)}, '') AS posted FROM ${wrapIdentifier(table)} ${whereClause} ORDER BY ${wrapIdentifier(dateCol)} DESC LIMIT ${parseInt(limit, 10) || 20}`,
      { type: QueryTypes.SELECT }
    );
    return rows;
  }

  /**
   * Get event count (postevent or events table)
   */
  async getEventCount() {
    const table = await resolveTableName(['postevent', 'events', 'event']);
    if (!table) return 0;
    const columns = await getTableColumns(table);
    const dateCol = columns.has('sdate') ? 'sdate' : columns.has('date') ? 'date' : columns.has('created_at') ? 'created_at' : null;
    const where = [];
    if (columns.has('deleted_at')) where.push('deleted_at IS NULL');
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await sequelize.query(
      `SELECT COUNT(*) AS total FROM ${wrapIdentifier(table)} ${whereClause}`,
      { type: QueryTypes.SELECT }
    );
    return rows?.[0]?.total != null ? Number(rows[0].total) : 0;
  }
}

module.exports = new StudentDashboardRepository();
