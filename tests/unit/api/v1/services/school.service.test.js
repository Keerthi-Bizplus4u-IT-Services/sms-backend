jest.mock('../../../../../src/api/v1/repositories/school.repository', () => ({
  schoolRepository: {
    findById: jest.fn()
  },
  schoolBranchRepository: {},
  schoolSettingsRepository: {}
}));

jest.mock('../../../../../src/models', () => ({
  sequelize: {
    transaction: jest.fn()
  },
  SchoolBranch: {
    findOne: jest.fn(),
    create: jest.fn()
  },
  AcademicYear: {
    findOrCreate: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn()
  },
  Class: {
    findOrCreate: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn()
  },
  Section: {
    findOrCreate: jest.fn(),
    destroy: jest.fn()
  },
  Student: {
    count: jest.fn()
  },
  Subject: {
    findOrCreate: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn()
  },
  Exam: {
    findOrCreate: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn()
  },
  ExamSchedule: {
    findOrCreate: jest.fn(),
    destroy: jest.fn()
  },
  GradingScale: {
    findOrCreate: jest.fn(),
    destroy: jest.fn()
  },
  SessionHour: {
    findOrCreate: jest.fn(),
    destroy: jest.fn()
  },
  Holiday: {
    findOrCreate: jest.fn(),
    destroy: jest.fn()
  }
}));

const { schoolService } = require('../../../../../src/api/v1/services/school.service');
const { schoolRepository } = require('../../../../../src/api/v1/repositories/school.repository');
const {
  sequelize,
  SchoolBranch,
  AcademicYear,
  Class,
  Section,
  Subject,
  Exam,
  ExamSchedule,
  GradingScale,
  SessionHour,
  Holiday
} = require('../../../../../src/models');

describe('SchoolService dummy data lifecycle', () => {
  const school = { id: 1, code: 'SCH', name: 'Test School' };

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(async (callback) => callback({}));
  });

  it('imports at least 10 records for each dummy dataset table', async () => {
    schoolRepository.findById.mockResolvedValue(school);
    SchoolBranch.findOne.mockResolvedValue({ id: 11 });

    let academicYearId = 100;
    let classId = 200;
    let subjectId = 300;
    let examId = 400;

    AcademicYear.findOrCreate.mockImplementation(async ({ where }) => [{ id: academicYearId++, ...where }, true]);
    Class.findOrCreate.mockImplementation(async ({ where }) => [{ id: classId++, ...where }, true]);
    Section.findOrCreate.mockResolvedValue([{ id: 1 }, true]);
    Subject.findOrCreate.mockImplementation(async ({ where }) => [{ id: subjectId++, ...where }, true]);
    Exam.findOrCreate.mockImplementation(async ({ where }) => [{ id: examId++, ...where }, true]);
    ExamSchedule.findOrCreate.mockResolvedValue([{ id: 1 }, true]);
    GradingScale.findOrCreate.mockResolvedValue([{ id: 1 }, true]);
    SessionHour.findOrCreate.mockResolvedValue([{ id: 1 }, true]);
    Holiday.findOrCreate.mockResolvedValue([{ id: 1 }, true]);

    const result = await schoolService.importDummyData(school.id);

    expect(result.school_id).toBe(school.id);
    expect(result.imported.school_branches).toBe(1);
    expect(result.imported.academic_years).toBe(10);
    expect(result.imported.classes).toBe(10);
    expect(result.imported.sections).toBe(10);
    expect(result.imported.subjects).toBe(10);
    expect(result.imported.exams).toBe(10);
    expect(result.imported.exam_schedules).toBe(10);
    expect(result.imported.grading_scales).toBe(10);
    expect(result.imported.holidays).toBe(10);
    expect(result.imported.session_hours).toBe(10);

    expect(AcademicYear.findOrCreate).toHaveBeenCalledTimes(10);
    expect(Class.findOrCreate).toHaveBeenCalledTimes(10);
    expect(Section.findOrCreate).toHaveBeenCalledTimes(10);
    expect(Subject.findOrCreate).toHaveBeenCalledTimes(10);
    expect(Exam.findOrCreate).toHaveBeenCalledTimes(10);
    expect(ExamSchedule.findOrCreate).toHaveBeenCalledTimes(10);
    expect(GradingScale.findOrCreate).toHaveBeenCalledTimes(10);
    expect(Holiday.findOrCreate).toHaveBeenCalledTimes(10);
    expect(SessionHour.findOrCreate).toHaveBeenCalledTimes(10);
  });

  it('deletes previously imported dummy records only', async () => {
    schoolRepository.findById.mockResolvedValue(school);

    AcademicYear.findAll.mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })));
    Class.findAll.mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({ id: i + 101 })));
    Subject.findAll.mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({ id: i + 201 })));
    Exam.findAll.mockResolvedValue(Array.from({ length: 10 }, (_, i) => ({ id: i + 301 })));

    SessionHour.destroy.mockResolvedValue(10);
    Holiday.destroy.mockResolvedValue(10);
    GradingScale.destroy.mockResolvedValue(10);
    ExamSchedule.destroy.mockResolvedValue(10);
    Exam.destroy.mockResolvedValue(10);
    Subject.destroy.mockResolvedValue(10);
    Section.destroy.mockResolvedValue(10);
    Class.destroy.mockResolvedValue(10);
    AcademicYear.destroy.mockResolvedValue(10);

    const result = await schoolService.deleteDummyData(school.id);

    expect(result.deleted.session_hours).toBe(10);
    expect(result.deleted.holidays).toBe(10);
    expect(result.deleted.grading_scales).toBe(10);
    expect(result.deleted.exam_schedules).toBe(10);
    expect(result.deleted.exams).toBe(10);
    expect(result.deleted.subjects).toBe(10);
    expect(result.deleted.sections).toBe(10);
    expect(result.deleted.classes).toBe(10);
    expect(result.deleted.academic_years).toBe(10);

    expect(AcademicYear.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ school_id: school.id })
    }));
    expect(Section.destroy).toHaveBeenCalled();
    expect(ExamSchedule.destroy).toHaveBeenCalled();
  });
});
