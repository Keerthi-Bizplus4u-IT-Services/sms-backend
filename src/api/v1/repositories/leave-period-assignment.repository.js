const {
  LeavePeriodAssignment,
  TimetablePeriod,
  Subject,
  Teacher,
  Person,
  Class,
  Section,
} = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');

class LeavePeriodAssignmentRepository {
  async bulkCreate(assignments = []) {
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return [];
    }

    try {
      return await LeavePeriodAssignment.bulkCreate(assignments);
    } catch (error) {
      const message = String(error?.message || '');
      if (message.toLowerCase().includes('leave_period_assignments') && message.toLowerCase().includes('does not exist')) {
        throw new AppError('Leave period assignment table is missing. Run latest database migrations.', 500);
      }
      throw error;
    }
  }

  async findByLeaveRequestId(leaveRequestId, schoolId) {
    if (!leaveRequestId || !schoolId) {
      throw new AppError('Leave request and school context are required to fetch assignments', 400);
    }

    return LeavePeriodAssignment.findAll({
      where: {
        leave_request_id: leaveRequestId,
        school_id: schoolId,
      },
      include: [
        {
          model: TimetablePeriod,
          as: 'period',
          attributes: ['id', 'period_number', 'period_name', 'start_time', 'end_time'],
          required: false,
        },
        {
          model: Subject,
          as: 'substituteSubject',
          attributes: ['id', 'name'],
          required: false,
        },
        {
          model: Teacher,
          as: 'substituteTeacher',
          attributes: ['id', 'employee_id'],
          required: false,
          include: [
            {
              model: Person,
              as: 'person',
              attributes: ['first_name', 'last_name'],
              required: false,
            },
          ],
        },
        {
          model: Teacher,
          as: 'originalTeacher',
          attributes: ['id', 'employee_id'],
          required: false,
          include: [
            {
              model: Person,
              as: 'person',
              attributes: ['first_name', 'last_name'],
              required: false,
            },
          ],
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'numeric_grade'],
          required: false,
        },
        {
          model: Section,
          as: 'section',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [
        ['assignment_date', 'ASC'],
        [{ model: TimetablePeriod, as: 'period' }, 'period_number', 'ASC'],
        ['id', 'ASC'],
      ],
    });
  }

  async replaceByLeaveRequestId(leaveRequestId, schoolId, newRows = []) {
    if (!leaveRequestId || !schoolId) {
      throw new AppError('Leave request and school context are required to update assignments', 400);
    }

    await LeavePeriodAssignment.destroy({
      where: {
        leave_request_id: leaveRequestId,
        school_id: schoolId,
      },
      force: true,
    });

    if (!Array.isArray(newRows) || newRows.length === 0) {
      return [];
    }

    return this.bulkCreate(newRows);
  }
}

module.exports = new LeavePeriodAssignmentRepository();
