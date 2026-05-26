const {
  LeaveRequest,
  LeavePolicy,
  User,
  Teacher,
  Person,
  ClassTimetable,
  TimetablePeriod,
  Subject,
} = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');
const { fn, col } = require('sequelize');

class LeaveRequestRepository {
  async findByUser(userId, filters = {}) {
    if (!userId) {
      throw new AppError('User context is required to fetch leave requests', 400);
    }

    const { schoolId, page = 1, limit = 25, status } = filters;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
    const offset = (parsedPage - 1) * parsedLimit;

    const whereClause = { user_id: userId };
    if (schoolId) {
      whereClause.school_id = schoolId;
    }
    if (status) {
      whereClause.status = status;
    }

    const { rows: leaves, count: total } = await LeaveRequest.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: LeavePolicy,
          as: 'policy',
          attributes: ['id', 'year'],
        },
      ],
      limit: parsedLimit,
      offset,
      order: [
        ['start_date', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    return {
      leaves,
      total,
      page: parsedPage,
      totalPages: total === 0 ? 0 : Math.ceil(total / parsedLimit),
    };
  }

  async create(data) {
    return LeaveRequest.create(data);
  }

  async findByIdScoped(id, schoolId) {
    return LeaveRequest.findOne({
      where: {
        id,
        school_id: schoolId,
      },
      include: [
        {
          model: LeavePolicy,
          as: 'policy',
          attributes: ['id', 'year'],
          required: false,
        },
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'email'],
          required: false,
          include: [
            {
              model: Person,
              as: 'person',
              attributes: ['id', 'first_name', 'last_name'],
              required: false,
            },
          ],
        },
      ],
    });
  }

  async findForApproval(filters = {}) {
    const { schoolId, status = 'pending', page = 1, limit = 25 } = filters;
    if (!schoolId) {
      throw new AppError('School context is required to fetch leave approvals', 400);
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
    const offset = (parsedPage - 1) * parsedLimit;

    const whereClause = { school_id: schoolId };
    if (status) {
      whereClause.status = status;
    }

    const { rows: leaves, count: total } = await LeaveRequest.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: LeavePolicy,
          as: 'policy',
          attributes: ['id', 'year'],
          required: false,
        },
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'email'],
          required: false,
          include: [
            {
              model: Person,
              as: 'person',
              attributes: ['id', 'first_name', 'last_name'],
              required: false,
            },
          ],
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'email'],
          required: false,
          include: [
            {
              model: Person,
              as: 'person',
              attributes: ['id', 'first_name', 'last_name'],
              required: false,
            },
          ],
        },
      ],
      limit: parsedLimit,
      offset,
      order: [
        ['created_at', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    return {
      leaves,
      total,
      page: parsedPage,
      totalPages: total === 0 ? 0 : Math.ceil(total / parsedLimit),
    };
  }

  async updateDecision(id, schoolId, data = {}) {
    const leaveRequest = await this.findByIdScoped(id, schoolId);
    if (!leaveRequest) {
      throw new AppError('Leave request not found', 404);
    }

    await leaveRequest.update(data);
    return leaveRequest;
  }

  async sumApprovedByType({ userId, schoolId, year }) {
    if (!userId || !schoolId) {
      throw new AppError('School and user context are required to compute leave usage', 400);
    }

    const whereClause = {
      user_id: userId,
      school_id: schoolId,
      status: 'approved',
    };

    const include = [
      {
        model: LeavePolicy,
        as: 'policy',
        attributes: [],
      },
    ];

    if (year) {
      include[0].where = { year };
    }

    return LeaveRequest.findAll({
      attributes: [
        'leave_type',
        [fn('COALESCE', fn('SUM', col('total_days')), 0), 'total'],
      ],
      where: whereClause,
      include,
      group: ['leave_type'],
    });
  }

  async findTeacherByUserId(userId, schoolId) {
    if (!userId || !schoolId) {
      throw new AppError('School and user context are required to resolve teacher profile', 400);
    }

    return Teacher.findOne({
      where: { school_id: schoolId },
      include: [
        {
          model: Person,
          as: 'person',
          where: { user_id: userId },
          attributes: ['id', 'user_id', 'first_name', 'last_name'],
        },
      ],
    });
  }

  async findTeacherTimetableByDays({ teacherId, schoolId, dayNames = [] }) {
    if (!teacherId || !schoolId) {
      throw new AppError('School and teacher context are required to fetch timetable slots', 400);
    }

    if (!Array.isArray(dayNames) || dayNames.length === 0) {
      return [];
    }

    return ClassTimetable.findAll({
      where: {
        teacher_id: teacherId,
        day_of_week: dayNames,
        is_active: true,
      },
      include: [
        {
          model: TimetablePeriod,
          as: 'period',
          attributes: ['id', 'period_number', 'period_name', 'start_time', 'end_time', 'is_break'],
          required: true,
          where: { is_active: true },
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [[{ model: TimetablePeriod, as: 'period' }, 'period_number', 'ASC']],
    });
  }
}

module.exports = new LeaveRequestRepository();
