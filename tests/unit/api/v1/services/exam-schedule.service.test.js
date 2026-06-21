jest.mock('../../../../../src/api/v1/repositories/exam-schedule.repository', () => ({
  findAll: jest.fn(),
  findExamByName: jest.fn(),
  findClassById: jest.fn(),
  findSubjectByName: jest.fn(),
  findByKeys: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  deleteById: jest.fn()
}));

jest.mock('../../../../../src/models', () => ({
  AcademicYear: {
    findOne: jest.fn()
  }
}));

const examScheduleService = require('../../../../../src/api/v1/services/exam-schedule.service');
const examScheduleRepository = require('../../../../../src/api/v1/repositories/exam-schedule.repository');
const { AcademicYear } = require('../../../../../src/models');

describe('ExamScheduleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list exam schedules for the current academic year by default', async () => {
    AcademicYear.findOne.mockResolvedValue({ id: 7 });
    examScheduleRepository.findAll.mockResolvedValue([{ id: 1, ename: 'Mid Term' }]);

    const result = await examScheduleService.getExamSchedules({}, { schoolId: 3 });

    expect(examScheduleRepository.findAll).toHaveBeenCalledWith({ schoolId: 3, academicYearId: 7 });
    expect(result).toEqual([{ id: 1, ename: 'Mid Term' }]);
  });

  it('should translate the legacy payload into normalized schedule fields', async () => {
    examScheduleRepository.findExamByName.mockResolvedValue({ id: 11, exam_type: 'mid_term' });
    examScheduleRepository.findClassById.mockResolvedValue({ id: 22, name: 'Grade 8' });
    examScheduleRepository.findSubjectByName.mockResolvedValue({ id: 33, name: 'Mathematics' });
    examScheduleRepository.findByKeys.mockResolvedValue(null);
    examScheduleRepository.create.mockResolvedValue({ id: 99, ename: 'Mid Term Exam' });

    const result = await examScheduleService.createLegacySchedule({
      eid: 'Mid Term Exam',
      subject: 'Mathematics',
      sclass: '22',
      date: '2026-04-14',
      time: '09:00 AM - 12:00 PM',
      duration: '3 hours'
    }, { schoolId: 5 });

    expect(examScheduleRepository.create).toHaveBeenCalledWith({
      exam_id: 11,
      class_id: 22,
      subject_id: 33,
      exam_date: '2026-04-14',
      start_time: '09:00:00',
      end_time: '12:00:00',
      max_marks: 50,
      passing_marks: 17,
      room_number: null
    });
    expect(result).toEqual({ id: 99, ename: 'Mid Term Exam' });
  });

  it('should update an existing schedule instead of creating a duplicate', async () => {
    examScheduleRepository.findExamByName.mockResolvedValue({ id: 11, exam_type: 'unit_test' });
    examScheduleRepository.findClassById.mockResolvedValue({ id: 22, name: 'Grade 8' });
    examScheduleRepository.findSubjectByName.mockResolvedValue({ id: 33, name: 'Mathematics' });
    examScheduleRepository.findByKeys.mockResolvedValue({ id: 44 });
    examScheduleRepository.update.mockResolvedValue({ id: 44, ename: 'Unit Test 1' });

    const result = await examScheduleService.createLegacySchedule({
      eid: 'Unit Test 1',
      subject: 'Mathematics',
      sclass: '22',
      date: '2026-04-14',
      time: '09:30',
      duration: '1 hour 30 minutes'
    }, { schoolId: 5 });

    expect(examScheduleRepository.update).toHaveBeenCalledWith(44, {
      exam_id: 11,
      class_id: 22,
      subject_id: 33,
      exam_date: '2026-04-14',
      start_time: '09:30:00',
      end_time: '11:00:00',
      max_marks: 25,
      passing_marks: 8,
      room_number: null
    });
    expect(result).toEqual({ id: 44, ename: 'Unit Test 1' });
  });

  it('should delete a schedule within the current school scope', async () => {
    examScheduleRepository.deleteById.mockResolvedValue(true);

    const result = await examScheduleService.deleteLegacySchedule('14', { schoolId: 8 });

    expect(examScheduleRepository.deleteById).toHaveBeenCalledWith(14, 8);
    expect(result).toEqual({ deleted: true });
  });
});