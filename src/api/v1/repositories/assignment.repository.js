const { Op } = require('sequelize');
const {
  sequelize,
  Assignment,
  AssignmentSubmission,
  AcademicYear,
  Class,
  Section,
  Subject,
  Teacher,
  Student,
  Person,
  User
} = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');
const parentDashboardRepository = require('./parent-dashboard.repository');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const buildPagination = (page, limit) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE);
  const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || DEFAULT_LIMIT, MAX_LIMIT));

  return {
    page: parsedPage,
    limit: parsedLimit,
    offset: (parsedPage - 1) * parsedLimit
  };
};

const assignmentInclude = ({ schoolId } = {}) => ([
  {
    model: AcademicYear,
    as: 'academicYear',
    attributes: ['id', 'name', 'is_current', 'school_id'],
    required: true,
    where: schoolId ? { school_id: schoolId } : undefined
  },
  { model: Class, as: 'class', attributes: ['id', 'name', 'numeric_grade'] },
  { model: Section, as: 'section', attributes: ['id', 'name'] },
  { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
  {
    model: Teacher,
    as: 'teacher',
    attributes: ['id', 'employee_id'],
    include: [
      {
        model: Person,
        as: 'person',
        attributes: ['first_name', 'last_name']
      }
    ]
  }
]);

class AssignmentRepository {
  async findTeacherByUserId(userId, schoolId) {
    const person = await Person.findOne({
      where: { user_id: userId },
      include: [
        {
          model: Teacher,
          as: 'teacher',
          required: true,
          where: schoolId ? { school_id: schoolId } : undefined
        }
      ]
    });

    return person?.teacher || null;
  }

  async findStudentByUserId(userId, schoolId) {
    const person = await Person.findOne({
      where: { user_id: userId },
      include: [
        {
          model: Student,
          as: 'student',
          required: true,
          where: schoolId ? { school_id: schoolId } : undefined,
          include: [
            { model: Class, as: 'class', attributes: ['id', 'name', 'numeric_grade'] },
            { model: Section, as: 'section', attributes: ['id', 'name'] }
          ]
        }
      ]
    });

    return person?.student || null;
  }

  async findParentChildrenByUserId(userId, schoolId) {
    const parent = await parentDashboardRepository.findParentByUserId(userId);
    if (!parent) {
      return { parent: null, children: [] };
    }

    const studentIds = await parentDashboardRepository.getStudentIdsByParentId(parent.id);
    if (!studentIds.length) {
      return { parent, children: [] };
    }

    const children = await parentDashboardRepository.getStudentsByIds(studentIds);
    const scopedChildren = schoolId
      ? children.filter((student) => Number(student.school_id) === Number(schoolId))
      : children;

    return { parent, children: scopedChildren };
  }

  async findCurrentAcademicYear(schoolId) {
    return AcademicYear.findOne({
      where: {
        school_id: schoolId,
        is_current: true
      }
    });
  }

  async findClassForSchool(classId, schoolId) {
    return Class.findOne({
      where: { id: classId },
      include: [
        {
          model: AcademicYear,
          as: 'academicYear',
          attributes: ['id', 'school_id'],
          required: true,
          where: { school_id: schoolId }
        }
      ]
    });
  }

  async findSectionForClass(sectionId, classId) {
    return Section.findOne({
      where: {
        id: sectionId,
        class_id: classId
      }
    });
  }

  async findSubjectForSchool(subjectId, schoolId) {
    return Subject.findOne({
      where: {
        id: subjectId,
        school_id: schoolId
      }
    });
  }

  async findStudentsForClassSection({ schoolId, classId, sectionId, transaction }) {
    return Student.findAll({
      where: {
        school_id: schoolId,
        class_id: classId,
        section_id: sectionId,
        status: 'active'
      },
      attributes: ['id'],
      transaction
    });
  }

  async createAssignment(payload) {
    const { schoolId, ...assignmentPayload } = payload;

    return sequelize.transaction(async (transaction) => {
      const assignment = await Assignment.create(assignmentPayload, { transaction });

      const students = await this.findStudentsForClassSection({
        schoolId,
        classId: assignmentPayload.class_id,
        sectionId: assignmentPayload.section_id,
        transaction
      });

      if (students.length) {
        await AssignmentSubmission.bulkCreate(
          students.map((student) => ({
            assignment_id: assignment.id,
            student_id: student.id,
            status: 'pending'
          })),
          { transaction }
        );
      }

      return assignment;
    });
  }

  async updateAssignment(id, updates) {
    await Assignment.update(updates, {
      where: { id }
    });

    return Assignment.findByPk(id);
  }

  async softDeleteAssignment(id) {
    const [updatedCount] = await Assignment.update(
      { is_active: false },
      {
        where: { id, is_active: true }
      }
    );

    return updatedCount > 0;
  }

  async listTeacherAssignments({ teacherId, schoolId, page, limit, classId, sectionId }) {
    const pagination = buildPagination(page, limit);
    const where = {
      teacher_id: teacherId,
      is_active: true
    };

    if (classId) {
      where.class_id = classId;
    }
    if (sectionId) {
      where.section_id = sectionId;
    }

    const { rows, count } = await Assignment.findAndCountAll({
      where,
      include: assignmentInclude({ schoolId }),
      limit: pagination.limit,
      offset: pagination.offset,
      distinct: true,
      order: [['assigned_date', 'DESC'], ['id', 'DESC']]
    });

    return { assignments: rows, total: count, ...pagination, totalPages: count === 0 ? 0 : Math.ceil(count / pagination.limit) };
  }

  async listSchoolAssignments({ schoolId, page, limit, classId, sectionId }) {
    const pagination = buildPagination(page, limit);
    const where = {
      is_active: true
    };

    if (classId) {
      where.class_id = classId;
    }
    if (sectionId) {
      where.section_id = sectionId;
    }

    const { rows, count } = await Assignment.findAndCountAll({
      where,
      include: assignmentInclude({ schoolId }),
      limit: pagination.limit,
      offset: pagination.offset,
      distinct: true,
      order: [['assigned_date', 'DESC'], ['id', 'DESC']]
    });

    return { assignments: rows, total: count, ...pagination, totalPages: count === 0 ? 0 : Math.ceil(count / pagination.limit) };
  }

  async listAssignmentsForClassSections({ schoolId, classSections, page, limit }) {
    const pagination = buildPagination(page, limit);
    if (!classSections.length) {
      return { assignments: [], total: 0, ...pagination, totalPages: 0 };
    }

    const where = {
      is_active: true,
      [Op.or]: classSections.map((item) => ({
        class_id: item.class_id,
        section_id: item.section_id
      }))
    };

    const { rows, count } = await Assignment.findAndCountAll({
      where,
      include: assignmentInclude({ schoolId }),
      limit: pagination.limit,
      offset: pagination.offset,
      distinct: true,
      order: [['assigned_date', 'DESC'], ['id', 'DESC']]
    });

    return { assignments: rows, total: count, ...pagination, totalPages: count === 0 ? 0 : Math.ceil(count / pagination.limit) };
  }

  async findAssignmentById(id, schoolId) {
    return Assignment.findOne({
      where: {
        id,
        is_active: true
      },
      include: assignmentInclude({ schoolId })
    });
  }

  async findSubmissionSummaryByAssignmentIds(assignmentIds) {
    if (!assignmentIds.length) {
      return [];
    }

    return AssignmentSubmission.findAll({
      where: {
        assignment_id: {
          [Op.in]: assignmentIds
        }
      },
      attributes: ['assignment_id', 'status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['assignment_id', 'status'],
      raw: true
    });
  }

  async findSubmissionsForStudents({ assignmentIds, studentIds }) {
    if (!assignmentIds.length || !studentIds.length) {
      return [];
    }

    return AssignmentSubmission.findAll({
      where: {
        assignment_id: { [Op.in]: assignmentIds },
        student_id: { [Op.in]: studentIds }
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'roll_number'],
          include: [
            {
              model: Person,
              as: 'person',
              attributes: ['first_name', 'last_name']
            }
          ]
        },
        {
          model: User,
          as: 'grader',
          attributes: ['id', 'email'],
          required: false
        }
      ],
      order: [['updated_at', 'DESC']]
    });
  }

  async countStudentsForAssignment(assignmentId) {
    return AssignmentSubmission.count({
      where: { assignment_id: assignmentId }
    });
  }
}

module.exports = new AssignmentRepository();