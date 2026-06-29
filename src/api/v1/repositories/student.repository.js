const { Student, Person, User, Class, Section, AcademicYear, SchoolBranch } = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');
const { Op, QueryTypes } = require('sequelize');
const { resolveTableName, getTableColumns } = require('./helpers/schema.utils');

const wrapIdentifier = (value) => `"${String(value).replace(/"/g, '')}"`;

const getSequelizeInstance = () => {
  if (Student.sequelize && typeof Student.sequelize.transaction === 'function') {
    return Student.sequelize;
  }

  return {
    transaction: async (callback) => {
      const transaction = {
        commit: async () => {},
        rollback: async () => {}
      };

      if (typeof callback === 'function') {
        return callback(transaction);
      }

      return transaction;
    }
  };
};

/**
 * Student Repository
 * Database operations for students
 */

class StudentRepository {
  async resolveStudentParentsRelation() {
    const tableName = await resolveTableName(['student_parents']);
    if (!tableName) {
      return null;
    }

    const columns = await getTableColumns(tableName);
    const parentCol = columns.has('parent_id') ? 'parent_id' : columns.has('pid') ? 'pid' : null;
    const studentCol = columns.has('student_id') ? 'student_id' : columns.has('sid') ? 'sid' : null;

    if (!parentCol || !studentCol) {
      return null;
    }

    return {
      tableName,
      parentCol,
      studentCol
    };
  }

  async findLatestAdmissionNumber(options = {}) {
    const whereClause = {};

    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    const latestStudent = await Student.findOne({
      where: whereClause,
      attributes: ['admission_number'],
      order: [['id', 'DESC']]
    });

    return latestStudent?.admission_number || null;
  }

  async getSectionPlacementContext(classId, options = {}) {
    const classWhereClause = { id: classId };
    const classInclude = [];

    if (options.schoolId) {
      classInclude.push({
        model: SchoolBranch,
        as: 'branch',
        attributes: ['id', 'school_id'],
        where: { school_id: options.schoolId },
        required: true
      });
    }

    const classRecord = await Class.findOne({
      where: classWhereClause,
      attributes: ['id', 'branch_id'],
      include: classInclude
    });

    if (!classRecord) {
      throw new AppError('Class not found', 404);
    }

    const sections = await Section.findAll({
      where: { class_id: classId },
      attributes: ['id', 'name', 'max_students'],
      order: [['name', 'ASC']]
    });

    const sectionIds = sections.map((section) => section.id);
    const studentWhereClause = {
      section_id: {
        [Op.in]: sectionIds
      },
      status: 'active'
    };

    if (options.schoolId) {
      studentWhereClause.school_id = options.schoolId;
    }

    const counts = sectionIds.length
      ? await Student.findAll({
          where: studentWhereClause,
          attributes: [
            'section_id',
            [Student.sequelize.fn('COUNT', Student.sequelize.col('id')), 'total']
          ],
          group: ['section_id'],
          raw: true
        })
      : [];

    const countBySectionId = new Map();
    counts.forEach((item) => {
      const sectionId = Number.parseInt(String(item.section_id), 10);
      const total = Number.parseInt(String(item.total), 10);
      if (!Number.isNaN(sectionId)) {
        countBySectionId.set(sectionId, Number.isNaN(total) ? 0 : total);
      }
    });

    return sections.map((section) => {
      const capacity = Number.parseInt(String(section.max_students), 10);
      const currentStrength = countBySectionId.get(section.id) || 0;
      const normalizedCapacity = Number.isNaN(capacity) || capacity <= 0 ? null : capacity;

      return {
        id: section.id,
        name: section.name,
        max_students: normalizedCapacity,
        current_strength: currentStrength,
        has_capacity: normalizedCapacity === null ? true : currentStrength < normalizedCapacity
      };
    });
  }

  async getSectionRollNumbers(sectionId, options = {}) {
    const whereClause = {
      section_id: sectionId,
      roll_number: {
        [Op.not]: null
      }
    };

    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    if (options.classId) {
      whereClause.class_id = options.classId;
    }

    const students = await Student.findAll({
      where: whereClause,
      attributes: ['roll_number'],
      raw: true
    });

    return students
      .map((student) => student.roll_number)
      .filter((rollNumber) => typeof rollNumber === 'string' && rollNumber.trim().length > 0);
  }

  /**
   * Get all students with pagination and filters
   */
  async findAll(filters = {}) {
    const {
      page = 1,
      limit = 10,
      classId,
      sectionId,
      status,
      search,
      schoolId,
      branchId
    } = filters;

    const offset = (page - 1) * limit;
    const dialect = Student.sequelize?.getDialect?.();
    const textMatchOp = dialect === 'postgres' ? Op.iLike : Op.like;

    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (classId) {
      whereClause.class_id = classId;
    }

    if (sectionId) {
      whereClause.section_id = sectionId;
    }

    if (schoolId) {
      whereClause.school_id = schoolId;
    }

    if (branchId) {
      whereClause.branch_id = branchId;
    }

    if (search) {
      const searchTokens = String(search)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      if (searchTokens.length > 0) {
        whereClause[Op.and] = searchTokens.map((token) => ({
          [Op.or]: [
            { admission_number: { [textMatchOp]: `%${token}%` } },
            { roll_number: { [textMatchOp]: `%${token}%` } },
            { '$person.first_name$': { [textMatchOp]: `%${token}%` } },
            { '$person.last_name$': { [textMatchOp]: `%${token}%` } },
            { '$person.phone$': { [textMatchOp]: `%${token}%` } }
          ]
        }));
      }
    }

    const { rows: students, count: total } = await Student.findAndCountAll({
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
          ],
          attributes: { exclude: ['created_at', 'updated_at', 'deleted_at'] }
        },
        {
          model: SchoolBranch,
          as: 'branch',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Class,
          as: 'class',
          include: [
            {
              model: AcademicYear,
              as: 'academicYear',
              attributes: ['id', 'name', 'is_current']
            }
          ]
        },
        {
          model: Section,
          as: 'section',
          attributes: ['id', 'name', 'room_number']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      subQuery: false,
      distinct: true,
      order: [['admission_number', 'DESC']]
    });

    return {
      students,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Find student by ID
   */
  async findById(id, options = {}) {
    const whereClause = { id };

    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    const queryOptions = {
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
        },
        {
          model: Class,
          as: 'class',
          include: [
            {
              model: AcademicYear,
              as: 'academicYear'
            }
          ]
        },
        {
          model: Section,
          as: 'section'
        }
      ]
    };

    if (options.transaction) {
      queryOptions.transaction = options.transaction;
    }

    const student = await Student.findOne(queryOptions);

    if (!student) {
      return null;
    }

    return student;
  }

  /**
   * Find student by user ID (for logged-in student viewing own profile)
   */
  async findByUserId(userId) {
    const person = await Person.findOne({ where: { user_id: userId } });
    if (!person) return null;

    return await Student.findOne({
      where: { person_id: person.id },
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
        },
        {
          model: Class,
          as: 'class',
          include: [
            {
              model: AcademicYear,
              as: 'academicYear'
            }
          ]
        },
        {
          model: Section,
          as: 'section'
        }
      ]
    });
  }

  /**
   * Find student by admission number
   */
  async findByAdmissionNumber(admissionNumber, options = {}) {
    const whereClause = { admission_number: admissionNumber };

    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    return await Student.findOne({
      where: whereClause,
      include: [
        {
          model: Person,
          as: 'person'
        },
        {
          model: SchoolBranch,
          as: 'branch',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Class,
          as: 'class'
        },
        {
          model: Section,
          as: 'section'
        }
      ]
    });
  }

  /**
   * Find student by roll number
   */
  async findByRollNumber(rollNumber, options = {}) {
    const whereClause = { roll_number: rollNumber };

    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    return await Student.findOne({
      where: whereClause,
      include: [
        {
          model: Person,
          as: 'person'
        },
        {
          model: SchoolBranch,
          as: 'branch',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Class,
          as: 'class'
        },
        {
          model: Section,
          as: 'section'
        }
      ]
    });
  }

  /**
   * Create new student
   */
  async create(studentData, personData, userData = null) {
    if (!studentData.school_id) {
      throw new AppError('Student creation requires school_id to be set', 400);
    }

    if (!studentData.branch_id) {
      throw new AppError('Student creation requires branch_id to be set', 400);
    }

    const sequelizeInstance = getSequelizeInstance();

    return await sequelizeInstance.transaction(async (transaction) => {
      let user = null;
      if (userData) {
        user = await User.create(userData, { transaction });
      }

      const person = await Person.create(
        {
          ...personData,
          user_id: user?.id
        },
        { transaction }
      );

      const student = await Student.create(
        {
          ...studentData,
          person_id: person.id
        },
        { transaction }
      );

      return await this.findById(student.id, { schoolId: studentData.school_id, transaction });
    });
  }

  /**
   * Update student
   */
  async update(id, studentData, personData, options = {}) {
    const sequelizeInstance = getSequelizeInstance();

    return await sequelizeInstance.transaction(async (transaction) => {
      const whereClause = { id };
      if (options.schoolId) {
        whereClause.school_id = options.schoolId;
      }

      const student = await Student.findOne({
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
          }
        ],
        transaction
      });

      if (!student) {
        throw new AppError('Student not found', 404);
      }

      const normalizedPersonData = personData ? { ...personData } : null;
      const requestedEmail = normalizedPersonData && Object.prototype.hasOwnProperty.call(normalizedPersonData, 'email')
        ? String(normalizedPersonData.email || '').trim()
        : undefined;

      if (normalizedPersonData && Object.prototype.hasOwnProperty.call(normalizedPersonData, 'email')) {
        normalizedPersonData.email = requestedEmail || null;
      }

      await student.update(studentData, { transaction });

      if (normalizedPersonData && student.person) {
        await student.person.update(normalizedPersonData, { transaction });
      }

      if (requestedEmail !== undefined && requestedEmail && student.person?.user_id) {
        await User.update(
          { email: requestedEmail },
          {
            where: { id: student.person.user_id },
            transaction
          }
        );
      }

      return await this.findById(id, options);
    });
  }

  /**
   * Delete student (soft delete)
   */
  async delete(id, options = {}) {
    const whereClause = { id };

    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    const student = await Student.findOne({ where: whereClause });

    if (!student) {
      return false;
    }

    const sequelize = getSequelizeInstance();

    await sequelize.transaction(async (transaction) => {
      const queryRunner = Student.sequelize && typeof Student.sequelize.query === 'function'
        ? Student.sequelize
        : null;
      const relation = queryRunner ? await this.resolveStudentParentsRelation() : null;

      let linkedParentIds = [];
      if (relation && queryRunner) {
        const parentRows = await queryRunner.query(
          `SELECT DISTINCT ${wrapIdentifier(relation.parentCol)} AS parent_id FROM ${wrapIdentifier(relation.tableName)} WHERE ${wrapIdentifier(relation.studentCol)} = :studentId`,
          {
            replacements: { studentId: id },
            type: QueryTypes.SELECT,
            transaction
          }
        );

        linkedParentIds = parentRows
          .map((row) => Number(row.parent_id))
          .filter((parentId) => Number.isInteger(parentId) && parentId > 0);
      }

      await student.destroy({ transaction }); // Soft delete (paranoid: true)

      if (linkedParentIds.length && relation && queryRunner) {
        const parentUserRows = await queryRunner.query(
          `SELECT DISTINCT p.user_id AS user_id
           FROM ${wrapIdentifier('parents')} pr
           INNER JOIN ${wrapIdentifier('persons')} p ON p.id = pr.person_id
           WHERE pr.id IN (:parentIds)
             AND pr.deleted_at IS NULL
             AND p.deleted_at IS NULL
             AND p.user_id IS NOT NULL
             AND NOT EXISTS (
               SELECT 1
               FROM ${wrapIdentifier(relation.tableName)} sp
               INNER JOIN ${wrapIdentifier('students')} s ON s.id = sp.${wrapIdentifier(relation.studentCol)}
               WHERE sp.${wrapIdentifier(relation.parentCol)} = pr.id
                 AND s.deleted_at IS NULL
                 AND s.status = 'active'
             )`,
          {
            replacements: { parentIds: linkedParentIds },
            type: QueryTypes.SELECT,
            transaction
          }
        );

        const parentUserIds = parentUserRows
          .map((row) => Number(row.user_id))
          .filter((userId) => Number.isInteger(userId) && userId > 0);

        if (parentUserIds.length) {
          await User.update(
            { is_active: false },
            {
              where: {
                id: { [Op.in]: parentUserIds }
              },
              transaction
            }
          );
        }
      }
    });

    return true;
  }

  /**
   * Get students by class
   */
  async findByClass(classId, options = {}) {
    const {
      page = 1,
      limit = 25,
      schoolId,
      status,
      search
    } = options;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
    const offset = (parsedPage - 1) * parsedLimit;
    const dialect = Student.sequelize?.getDialect?.();
    const textMatchOp = dialect === 'postgres' ? Op.iLike : Op.like;
    const whereClause = {
      class_id: classId
    };

    if (schoolId) {
      whereClause.school_id = schoolId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      const searchTokens = String(search)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      if (searchTokens.length > 0) {
        whereClause[Op.and] = searchTokens.map((token) => ({
          [Op.or]: [
            { admission_number: { [textMatchOp]: `%${token}%` } },
            { roll_number: { [textMatchOp]: `%${token}%` } },
            { '$person.first_name$': { [textMatchOp]: `%${token}%` } },
            { '$person.last_name$': { [textMatchOp]: `%${token}%` } },
            { '$person.phone$': { [textMatchOp]: `%${token}%` } }
          ]
        }));
      }
    }

    const { rows: students, count: total } = await Student.findAndCountAll({
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
          ],
          attributes: { exclude: ['created_at', 'updated_at', 'deleted_at'] }
        },
        {
          model: SchoolBranch,
          as: 'branch',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Class,
          as: 'class',
          include: [
            {
              model: AcademicYear,
              as: 'academicYear',
              attributes: ['id', 'name', 'is_current']
            }
          ]
        },
        {
          model: Section,
          as: 'section',
          attributes: ['id', 'name', 'room_number']
        }
      ],
      limit: parsedLimit,
      offset,
      subQuery: false,
      distinct: true,
      order: [['roll_number', 'ASC']]
    });

    return {
      students,
      total,
      page: parsedPage,
      totalPages: total === 0 ? 0 : Math.ceil(total / parsedLimit)
    };
  }

  /**
   * Get students by section
   */
  async findBySection(classId, sectionId, options = {}) {
    const {
      page = 1,
      limit = 25,
      schoolId,
      status,
      search
    } = options;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
    const offset = (parsedPage - 1) * parsedLimit;
    const dialect = Student.sequelize?.getDialect?.();
    const textMatchOp = dialect === 'postgres' ? Op.iLike : Op.like;
    const whereClause = {
      class_id: classId,
      section_id: sectionId
    };

    if (schoolId) {
      whereClause.school_id = schoolId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      const searchTokens = String(search)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      if (searchTokens.length > 0) {
        whereClause[Op.and] = searchTokens.map((token) => ({
          [Op.or]: [
            { admission_number: { [textMatchOp]: `%${token}%` } },
            { roll_number: { [textMatchOp]: `%${token}%` } },
            { '$person.first_name$': { [textMatchOp]: `%${token}%` } },
            { '$person.last_name$': { [textMatchOp]: `%${token}%` } },
            { '$person.phone$': { [textMatchOp]: `%${token}%` } }
          ]
        }));
      }
    }

    const { rows: students, count: total } = await Student.findAndCountAll({
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
          ],
          attributes: { exclude: ['created_at', 'updated_at', 'deleted_at'] }
        },
        {
          model: SchoolBranch,
          as: 'branch',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Class,
          as: 'class',
          include: [
            {
              model: AcademicYear,
              as: 'academicYear',
              attributes: ['id', 'name', 'is_current']
            }
          ]
        },
        {
          model: Section,
          as: 'section',
          attributes: ['id', 'name', 'room_number']
        }
      ],
      limit: parsedLimit,
      offset,
      subQuery: false,
      distinct: true,
      order: [['roll_number', 'ASC']]
    });

    return {
      students,
      total,
      page: parsedPage,
      totalPages: total === 0 ? 0 : Math.ceil(total / parsedLimit)
    };
  }

  /**
   * Get active students for promotion workflow
   */
  async findActiveByClassForPromotion(classId, studentIds = [], options = {}) {
    const whereClause = {
      class_id: classId,
      status: 'active'
    };

    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    if (Array.isArray(studentIds) && studentIds.length > 0) {
      whereClause.id = {
        [Op.in]: studentIds
      };
    }

    return Student.findAll({
      where: whereClause,
      include: [
        {
          model: Section,
          as: 'section',
          attributes: ['id', 'name', 'class_id']
        }
      ],
      order: [['id', 'ASC']]
    });
  }

  /**
   * Bulk update class and section assignments
   */
  async bulkUpdateClassAndSection(studentIds, classId, sectionId, schoolId, transaction) {
    if (!studentIds || studentIds.length === 0) {
      return 0;
    }

    if (!schoolId) {
      throw new AppError('School scope is required for bulk student updates', 400);
    }

    return Student.update(
      {
        class_id: classId,
        section_id: sectionId
      },
      {
        where: {
          school_id: schoolId,
          id: {
            [Op.in]: studentIds
          }
        },
        transaction
      }
    );
  }
}

module.exports = new StudentRepository();
