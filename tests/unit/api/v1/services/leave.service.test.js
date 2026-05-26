jest.mock('../../../../../src/api/v1/repositories/leave-policy.repository');
jest.mock('../../../../../src/api/v1/repositories/leave-request.repository');
jest.mock('../../../../../src/api/v1/repositories/leave-period-assignment.repository');

const leaveService = require('../../../../../src/api/v1/services/leave.service');
const leavePolicyRepository = require('../../../../../src/api/v1/repositories/leave-policy.repository');
const leaveRequestRepository = require('../../../../../src/api/v1/repositories/leave-request.repository');
const leavePeriodAssignmentRepository = require('../../../../../src/api/v1/repositories/leave-period-assignment.repository');

describe('LeaveService applyLeave coverage mapping', () => {
  const context = { schoolId: 1, userId: 99 };

  beforeEach(() => {
    jest.clearAllMocks();

    leavePolicyRepository.findByYear.mockResolvedValue({
      id: 12,
      year: 2026,
      casual_leaves: 12,
      sick_leaves: 12,
      special_leaves: 3,
    });

    leaveRequestRepository.sumApprovedByType.mockResolvedValue([]);
  });

  it('creates leave for non-teacher user without period mapping', async () => {
    leaveRequestRepository.findTeacherByUserId.mockResolvedValue(null);
    leaveRequestRepository.create.mockResolvedValue({
      id: 500,
      toJSON: () => ({ id: 500, status: 'pending' }),
    });

    const result = await leaveService.applyLeave(
      {
        startDate: '2026-04-06',
        endDate: '2026-04-06',
        reason: 'Medical consultation',
        leaveType: 'sick',
      },
      context
    );

    expect(leaveRequestRepository.create).toHaveBeenCalled();
    expect(leavePeriodAssignmentRepository.bulkCreate).not.toHaveBeenCalled();
    expect(result.coverage.affectedPeriodsCount).toBe(0);
    expect(result.coverage.mappedPeriodsCount).toBe(0);
  });

  it('rejects teacher leave when affected periods are not mapped', async () => {
    leaveRequestRepository.findTeacherByUserId.mockResolvedValue({ id: 41 });
    leaveRequestRepository.findTeacherTimetableByDays.mockResolvedValue([
      {
        id: 1001,
        class_id: 5,
        section_id: 2,
        period_id: 11,
        subject_id: 21,
        day_of_week: 'monday',
        effective_from: null,
        effective_to: null,
        period: {
          period_number: 2,
          period_name: 'P2',
          start_time: '09:00:00',
          end_time: '09:45:00',
          is_break: false,
        },
        subject: {
          id: 21,
          name: 'Mathematics',
        },
      },
    ]);

    await expect(
      leaveService.applyLeave(
        {
          startDate: '2026-04-06',
          endDate: '2026-04-06',
          reason: 'Urgent personal work',
          leaveType: 'casual',
        },
        context
      )
    ).rejects.toThrow('Period mappings are required for all affected periods in teacher leave requests');

    expect(leaveRequestRepository.create).not.toHaveBeenCalled();
  });

  it('creates period assignments when teacher mappings are provided', async () => {
    leaveRequestRepository.findTeacherByUserId.mockResolvedValue({ id: 41 });
    leaveRequestRepository.findTeacherTimetableByDays.mockResolvedValue([
      {
        id: 1001,
        class_id: 5,
        section_id: 2,
        period_id: 11,
        subject_id: 21,
        day_of_week: 'monday',
        effective_from: null,
        effective_to: null,
        period: {
          period_number: 2,
          period_name: 'P2',
          start_time: '09:00:00',
          end_time: '09:45:00',
          is_break: false,
        },
        subject: {
          id: 21,
          name: 'Mathematics',
        },
      },
    ]);

    leaveRequestRepository.create.mockResolvedValue({
      id: 900,
      toJSON: () => ({ id: 900, status: 'pending' }),
    });

    const result = await leaveService.applyLeave(
      {
        startDate: '2026-04-06',
        endDate: '2026-04-06',
        reason: 'Family function',
        leaveType: 'casual',
        leaveDurationType: 'full_day',
        periodMappings: [
          {
            date: '2026-04-06',
            timetableId: 1001,
            substituteTeacherId: 55,
            substituteSubjectId: 31,
            notes: 'Handled by science team',
          },
        ],
      },
      context
    );

    expect(leaveRequestRepository.create).toHaveBeenCalled();
    expect(leavePeriodAssignmentRepository.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          leave_request_id: 900,
          timetable_id: 1001,
          substitute_teacher_id: 55,
          substitute_subject_id: 31,
          assignment_type: 'teacher_substitution',
        }),
      ])
    );
    expect(result.coverage.affectedPeriodsCount).toBe(1);
    expect(result.coverage.mappedPeriodsCount).toBe(1);
  });
});
