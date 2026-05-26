jest.mock('../../../../../src/api/v1/repositories/exam.repository', () => ({
  findAll: jest.fn()
}));

jest.mock('../../../../../src/models', () => ({
  AcademicYear: {
    findOne: jest.fn()
  }
}));

const examService = require('../../../../../src/api/v1/services/exam.service');
const examRepository = require('../../../../../src/api/v1/repositories/exam.repository');
const { AcademicYear } = require('../../../../../src/models');

describe('ExamService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prefer the current academic year when none is provided', async () => {
    AcademicYear.findOne.mockResolvedValue({ id: 12 });
    examRepository.findAll.mockResolvedValue([
      { eid: 'Mid Term', ename: 'Mid Term' },
      { eid: 'Final Exam', ename: 'Final Exam' }
    ]);

    const result = await examService.getExams({}, { schoolId: 5 });

    expect(AcademicYear.findOne).toHaveBeenCalledWith({
      where: {
        school_id: 5,
        is_current: true
      },
      attributes: ['id']
    });
    expect(examRepository.findAll).toHaveBeenCalledWith({ schoolId: 5, academicYearId: 12 });
    expect(result).toEqual([
      { eid: 'Mid Term', ename: 'Mid Term' },
      { eid: 'Final Exam', ename: 'Final Exam' }
    ]);
  });

  it('should deduplicate duplicate exam names when falling back to all school exams', async () => {
    AcademicYear.findOne.mockResolvedValue(null);
    examRepository.findAll.mockResolvedValue([
      { id: 1, eid: 'Mid Term', ename: 'Mid Term', academicYearId: 1 },
      { id: 2, eid: ' mid term ', ename: ' mid term ', academicYearId: 2 },
      { id: 3, eid: 'Final Exam', ename: 'Final Exam', academicYearId: 2 }
    ]);

    const result = await examService.getExams({}, { schoolId: 9 });

    expect(examRepository.findAll).toHaveBeenCalledWith({ schoolId: 9, academicYearId: null });
    expect(result).toEqual([
      { id: 1, eid: 'Mid Term', ename: 'Mid Term', academicYearId: 1 },
      { id: 3, eid: 'Final Exam', ename: 'Final Exam', academicYearId: 2 }
    ]);
  });

  it('should use the requested academic year without looking up the current year', async () => {
    examRepository.findAll.mockResolvedValue([{ eid: 'Unit Test 1', ename: 'Unit Test 1' }]);

    const result = await examService.getExams({ academicYearId: '17' }, { schoolId: 4 });

    expect(AcademicYear.findOne).not.toHaveBeenCalled();
    expect(examRepository.findAll).toHaveBeenCalledWith({ schoolId: 4, academicYearId: 17 });
    expect(result).toEqual([{ eid: 'Unit Test 1', ename: 'Unit Test 1' }]);
  });
});