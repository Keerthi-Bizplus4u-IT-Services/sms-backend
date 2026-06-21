const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { Person, Student, Class, Section, User } = require('../../../models');
const { resolveTableName, getTableColumns } = require('./helpers/schema.utils');

const wrapIdentifier = (value) => `"${String(value).replace(/"/g, '')}"`;

class TeacherDashboardRepository {
  /**
   * Get total active student count
   */
  async getTotalStudentCount() {
    const count = await Student.count({ where: {} });
    return count;
  }

  /**
   * Get graduated student count (current_status = 'graduated')
   */
  async getGraduateStudentCount() {
    const { Op } = require('sequelize');
    const count = await Student.count({
      where: { status: 'graduated' }
    });
    return count;
  }

  /**
   * Get student gender stats (male, female, other)
   */
  async getStudentGenderStats() {
    const students = await resolveTableName(['students']);
    const persons = await resolveTableName(['persons']);
    if (!students || !persons) return { male: 0, female: 0, other: 0 };

    const cols = await getTableColumns(students);
    const pcols = await getTableColumns(persons);
    const where = [];
    if (cols.has('deleted_at')) where.push('s.deleted_at IS NULL');
    if (pcols.has('deleted_at')) where.push('p.deleted_at IS NULL');
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await sequelize.query(
      `SELECT LOWER(COALESCE(CAST(p.gender AS TEXT), 'other')) AS label, COUNT(*) AS cnt
       FROM ${wrapIdentifier(students)} s
       INNER JOIN ${wrapIdentifier(persons)} p ON p.id = s.person_id
       ${whereClause}
       GROUP BY label`,
      { type: QueryTypes.SELECT }
    );
    const map = { male: 0, female: 0, other: 0 };
    for (const r of rows) {
      const k = r.label === 'female' ? 'female' : r.label === 'male' ? 'male' : 'other';
      map[k] = Number(r.cnt) || 0;
    }
    return map;
  }

  /**
   * Get list of students with person, class, section (for dashboard table)
   */
  async getStudentsList(limit = 20) {
    const students = await Student.findAll({
      limit: Math.min(parseInt(limit, 10) || 20, 100),
      include: [
        {
          model: Person,
          as: 'person',
          attributes: ['first_name', 'last_name', 'gender', 'date_of_birth', 'phone'],
          include: [{ model: User, as: 'user', attributes: ['email'], required: false }]
        },
        { model: Class, as: 'class', attributes: ['id', 'name', 'numeric_grade'] },
        { model: Section, as: 'section', attributes: ['id', 'name'] }
      ],
      order: [['id', 'ASC']]
    });
    return students;
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
}

module.exports = new TeacherDashboardRepository();
