const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { resolveTableName } = require('./helpers/schema.utils');
const { Class, Section, AcademicYear, Subject, SchoolBranch, Teacher, Person } = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');

const sectionClassTeacherInclude = {
  model: Teacher,
  as: 'classTeacher',
  required: false,
  attributes: ['id', 'employee_id', 'person_id'],
  include: [
    {
      model: Person,
      as: 'person',
      attributes: ['first_name', 'last_name', 'middle_name']
    }
  ]
};

class ClassRepository {
  async findAll(filters = {}) {
    const { page = 1, limit = 50, academicYearId, schoolId, branchId } = filters;
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (academicYearId) whereClause.academic_year_id = academicYearId;
    if (branchId) whereClause.branch_id = branchId;

    const { rows: classes, count: total } = await Class.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: AcademicYear,
          as: 'academicYear',
          attributes: ['id', 'name', 'is_current']
        },
        {
          model: SchoolBranch,
          as: 'branch',
          attributes: ['id', 'name', 'code'],
          where: schoolId ? { school_id: schoolId } : undefined,
          required: !!schoolId
        },
        {
          model: Section,
          as: 'sections',
          attributes: ['id', 'name', 'max_students', 'room_number', 'class_teacher_id'],
          include: [sectionClassTeacherInclude]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['numeric_grade', 'ASC'], ['display_order', 'ASC']]
    });

    return { classes, total, page: parseInt(page), totalPages: Math.ceil(total / limit) };
  }

  async findById(id, options = {}) {
    const whereClause = { id };
    if (options.branchId) {
      whereClause.branch_id = options.branchId;
    }

    const classData = await Class.findOne({
      where: whereClause,
      include: [
        {
          model: AcademicYear,
          as: 'academicYear'
        },
        {
          model: SchoolBranch,
          as: 'branch',
          attributes: ['id', 'name', 'code'],
          where: options.schoolId ? { school_id: options.schoolId } : undefined,
          required: !!options.schoolId
        },
        {
          model: Section,
          as: 'sections',
          include: [sectionClassTeacherInclude]
        }
      ]
    });

    if (!classData) throw new AppError('Class not found', 404);
    return classData;
  }

  async create(data, options = {}) {
    const classData = await Class.create(data);
    return this.findById(classData.id, options);
  }

  async update(id, data, options = {}) {
    const whereClause = { id };
    if (options.branchId) {
      whereClause.branch_id = options.branchId;
    }

    const classData = await Class.findOne({
      where: whereClause,
      include: [
        {
          model: AcademicYear,
          as: 'academicYear'
        },
        {
          model: SchoolBranch,
          as: 'branch',
          where: options.schoolId ? { school_id: options.schoolId } : undefined,
          required: !!options.schoolId
        }
      ]
    });
    if (!classData) throw new AppError('Class not found', 404);
    await classData.update(data);
    return this.findById(id, options);
  }

  async delete(id, options = {}) {
    const whereClause = { id };
    if (options.branchId) {
      whereClause.branch_id = options.branchId;
    }

    const classData = await Class.findOne({
      where: whereClause,
      include: [
        {
          model: AcademicYear,
          as: 'academicYear'
        },
        {
          model: SchoolBranch,
          as: 'branch',
          where: options.schoolId ? { school_id: options.schoolId } : undefined,
          required: !!options.schoolId
        }
      ]
    });
    if (!classData) throw new AppError('Class not found', 404);
    await classData.destroy();
    return { message: 'Class deleted successfully' };
  }
}

class SubjectRepository {
  async findAll(filters = {}) {
    const { page = 1, limit = 50, type, schoolId, classId } = filters;
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (type) whereClause.type = type;
    if (schoolId) whereClause.school_id = schoolId;

    if (classId) {
      const classSubjectTable = await resolveTableName(['class_subjects']);

      if (classSubjectTable) {
        const rows = await sequelize.query(
          `SELECT subject_id FROM ${classSubjectTable} WHERE class_id = :classId`,
          {
            replacements: { classId },
            type: QueryTypes.SELECT
          }
        );

        const subjectIds = rows
          .map((row) => row.subject_id || row.subjectId)
          .filter(Boolean);

        if (subjectIds.length === 0) {
          return { subjects: [], total: 0, page: parseInt(page, 10), totalPages: 0 };
        }

        whereClause.id = subjectIds;
      }
    }

    const { rows: subjects, count: total } = await Subject.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    return { subjects, total, page: parseInt(page), totalPages: Math.ceil(total / limit) };
  }

  async findById(id, options = {}) {
    const whereClause = { id };
    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    const subject = await Subject.findOne({ where: whereClause });
    if (!subject) throw new AppError('Subject not found', 404);
    return subject;
  }

  async create(data, options = {}) {
    if (!data.school_id) {
      throw new AppError('Subject creation requires school_id', 400);
    }

    const subject = await Subject.create(data);
    return this.findById(subject.id, { schoolId: data.school_id });
  }

  async update(id, data, options = {}) {
    const whereClause = { id };
    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    const subject = await Subject.findOne({ where: whereClause });
    if (!subject) throw new AppError('Subject not found', 404);
    await subject.update(data);
    return this.findById(id, options);
  }

  async delete(id, options = {}) {
    const whereClause = { id };
    if (options.schoolId) {
      whereClause.school_id = options.schoolId;
    }

    const subject = await Subject.findOne({ where: whereClause });
    if (!subject) throw new AppError('Subject not found', 404);
    await subject.destroy();
    return { message: 'Subject deleted successfully' };
  }
}

module.exports = {
  classRepository: new ClassRepository(),
  subjectRepository: new SubjectRepository()
};
