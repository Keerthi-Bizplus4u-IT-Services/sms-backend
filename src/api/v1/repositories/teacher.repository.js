const { Teacher, Person, User, Role, SchoolBranch } = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');
const { Op } = require('sequelize');

/**
 * Teacher Repository
 */

class TeacherRepository {
  async findAll(filters = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      designation,
      schoolId,
      branchId
    } = filters;

    const offset = (page - 1) * limit;
    const dialect = Teacher.sequelize?.getDialect?.();
    const textMatchOp = dialect === 'postgres' ? Op.iLike : Op.like;
    const whereClause = {};
    const personWhereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (schoolId) {
      whereClause.school_id = schoolId;
    }

    if (branchId) {
      whereClause.branch_id = branchId;
    }

    if (designation) {
      whereClause.designation = { [textMatchOp]: `%${designation}%` };
    }

    if (search) {
      const searchTokens = String(search)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      if (searchTokens.length > 0) {
        personWhereClause[Op.and] = searchTokens.map((token) => ({
          [Op.or]: [
                  { first_name: { [textMatchOp]: `%${token}%` } },
                  { last_name: { [textMatchOp]: `%${token}%` } },
                  { phone: { [textMatchOp]: `%${token}%` } }
          ]
        }));
      }
    }

    const hasPersonFilters =
      Object.keys(personWhereClause).length > 0 ||
      Object.getOwnPropertySymbols(personWhereClause).length > 0;

    const { rows: teachers, count: total } = await Teacher.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: SchoolBranch,
          as: 'branch',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Person,
          as: 'person',
          where: hasPersonFilters ? personWhereClause : undefined,
          attributes: { exclude: ['created_at', 'updated_at', 'deleted_at'] },
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'email', 'is_active'],
              required: false
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
      order: [['employee_id', 'DESC']]
    });

    return {
      teachers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  async findById(id, options = {}) {
    const whereClause = { id };

    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    const teacher = await Teacher.findOne({
      where: whereClause,
      include: [
        {
          model: Person,
          as: 'person',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'email', 'is_active']
            }
          ]
        },
        {
          model: SchoolBranch,
          as: 'branch',
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }

    return teacher;
  }

  async findByEmployeeId(employeeId, options = {}) {
    const whereClause = { employee_id: employeeId };
    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    return await Teacher.findOne({
      where: whereClause,
      include: [{ model: Person, as: 'person' }]
    });
  }

  async create(teacherData, personData, userData = null) {
    if (!teacherData.school_id) {
      throw new AppError('Teacher creation requires school_id to be set', 400);
    }

    const { sequelize } = require('../../../config/database');
    const transaction = await sequelize.transaction();

    try {
      let user = null;
      if (userData) {
        user = await User.create(userData, { transaction });
      }

      const person = await Person.create({
        ...personData,
        user_id: user?.id
      }, { transaction });

      const teacher = await Teacher.create({
        ...teacherData,
        person_id: person.id
      }, { transaction });

      await transaction.commit();
      return await this.findById(teacher.id, { schoolId: teacherData.school_id });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(id, teacherData, personData, options = {}) {
    const { sequelize } = require('../../../config/database');
    const transaction = await sequelize.transaction();

    try {
      const whereClause = { id };
      if (options.schoolId) {
        whereClause.school_id = options.schoolId;
      }

      const teacher = await Teacher.findOne({
        where: whereClause,
        include: [{ model: Person, as: 'person' }],
        transaction
      });

      if (!teacher) {
        throw new AppError('Teacher not found', 404);
      }

      await teacher.update(teacherData, { transaction });

      if (personData && teacher.person) {
        const { email: personEmail, ...personPayload } = personData;

        if (Object.keys(personPayload).length > 0) {
          await teacher.person.update(personPayload, { transaction });
        }

        if (typeof personEmail !== 'undefined' && teacher.person.user_id) {
          await User.update(
            { email: personEmail || null },
            {
              where: { id: teacher.person.user_id },
              transaction
            }
          );
        }
      }

      await transaction.commit();
      return await this.findById(id, options);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async delete(id, options = {}) {
    const whereClause = { id };
    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    const teacher = await Teacher.findOne({ where: whereClause });

    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }

    await teacher.destroy();
    return { message: 'Teacher deleted successfully' };
  }
}

module.exports = new TeacherRepository();
