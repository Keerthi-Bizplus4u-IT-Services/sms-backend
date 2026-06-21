const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { StudentAchievement, Student, Person, Class, Section, School } = require('../../../models');
const { resolveTableName } = require('./helpers/schema.utils');

const wrapIdentifier = (value) => `"${String(value).replace(/"/g, '')}"`;

class AchievementRepository {
  /**
   * Get achievements for a list of student ids
   */
  async getAchievementsByStudentIds(studentIds, { page = 1, limit = 20 } = {}) {
    if (!studentIds || studentIds.length === 0) {
      return { achievements: [], total: 0 };
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await StudentAchievement.findAndCountAll({
      where: { student_id: studentIds },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'roll_number', 'admission_number'],
          include: [
            {
              model: Person,
              as: 'person',
              attributes: ['first_name', 'last_name']
            },
            {
              model: Class,
              as: 'class',
              attributes: ['id', 'name']
            },
            {
              model: Section,
              as: 'section',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [['awarded_date', 'DESC'], ['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      achievements: rows,
      total: count
    };
  }

  /**
   * Count achievements for a list of student ids
   */
  async countByStudentIds(studentIds) {
    if (!studentIds || studentIds.length === 0) return 0;
    return StudentAchievement.count({
      where: { student_id: studentIds }
    });
  }

  /**
   * Get a single achievement by id
   */
  async getById(id) {
    return StudentAchievement.findByPk(id, {
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'roll_number', 'admission_number'],
          include: [
            {
              model: Person,
              as: 'person',
              attributes: ['first_name', 'last_name']
            },
            {
              model: Class,
              as: 'class',
              attributes: ['id', 'name']
            },
            {
              model: Section,
              as: 'section',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });
  }

  /**
   * Create a new achievement
   */
  async create(data) {
    return StudentAchievement.create(data);
  }

  /**
   * Get achievements for a school
   */
  async getBySchoolId(schoolId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;

    const { count, rows } = await StudentAchievement.findAndCountAll({
      where: { school_id: schoolId },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'roll_number', 'admission_number'],
          include: [
            {
              model: Person,
              as: 'person',
              attributes: ['first_name', 'last_name']
            },
            {
              model: Class,
              as: 'class',
              attributes: ['id', 'name']
            },
            {
              model: Section,
              as: 'section',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [['awarded_date', 'DESC'], ['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      achievements: rows,
      total: count
    };
  }
}

module.exports = new AchievementRepository();
