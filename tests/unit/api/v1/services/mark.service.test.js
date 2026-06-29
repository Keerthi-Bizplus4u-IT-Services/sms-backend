jest.mock('../../../../../src/api/v1/repositories/mark.repository', () => ({
  findMarks: jest.fn(),
  upsertMarks: jest.fn(),
  findGrades: jest.fn(),
  findGradeByIdScoped: jest.fn(),
  createGrade: jest.fn(),
  updateGradeScoped: jest.fn(),
  deleteGradeScoped: jest.fn()
}));

jest.mock('../../../../../src/api/v1/repositories/parent-dashboard.repository', () => ({
  findParentByUserId: jest.fn(),
  getStudentIdsByParentId: jest.fn()
}));

jest.mock('../../../../../src/models', () => ({
  AcademicYear: {
    findOne: jest.fn()
  }
}));

const markService = require('../../../../../src/api/v1/services/mark.service');
const markRepository = require('../../../../../src/api/v1/repositories/mark.repository');
const { AcademicYear } = require('../../../../../src/models');

describe('MarkService grade scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AcademicYear.findOne.mockResolvedValue({ id: 7 });
  });

  it('gets grade by id within resolved academic year scope', async () => {
    markRepository.findGradeByIdScoped.mockResolvedValue({
      id: 12,
      grade_name: 'A',
      grade_point: 4,
      min_percentage: 90,
      max_percentage: 100,
      description: 'Excellent'
    });

    await markService.getGradeById(12, { schoolId: 3 });

    expect(markRepository.findGradeByIdScoped).toHaveBeenCalledWith(12, 7);
  });

  it('updates grade using scoped repository method', async () => {
    markRepository.updateGradeScoped.mockResolvedValue({ id: 12 });

    await markService.updateGrade(12, {
      gname: 'A+',
      gpoint: 4,
      pform: 95,
      pto: 100,
      comment: 'Outstanding'
    }, { schoolId: 3 });

    expect(markRepository.updateGradeScoped).toHaveBeenCalledWith(12, 7, {
      gradeName: 'A+',
      gradePoint: 4,
      percentFrom: 95,
      percentTo: 100,
      description: 'Outstanding'
    });
  });

  it('deletes grade using scoped repository method', async () => {
    markRepository.deleteGradeScoped.mockResolvedValue({ id: 12 });

    await markService.deleteGrade(12, { schoolId: 3 });

    expect(markRepository.deleteGradeScoped).toHaveBeenCalledWith(12, 7);
  });
});
