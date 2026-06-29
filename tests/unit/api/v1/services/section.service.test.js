jest.mock('../../../../../src/api/v1/repositories/section.repository', () => ({
  findById: jest.fn(),
  findAllByClass: jest.fn(),
  findByClassAndName: jest.fn(),
  create: jest.fn(),
  updateScoped: jest.fn(),
  deleteScoped: jest.fn()
}));

jest.mock('../../../../../src/models', () => ({
  Class: { findOne: jest.fn() },
  AcademicYear: {},
  SchoolBranch: {},
  Teacher: { findOne: jest.fn() }
}));

const sectionService = require('../../../../../src/api/v1/services/section.service');
const sectionRepository = require('../../../../../src/api/v1/repositories/section.repository');
const { Class, Teacher } = require('../../../../../src/models');

describe('SectionService scoped repository usage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses scoped repository update by id + class', async () => {
    Class.findOne.mockResolvedValue({ id: 10, branch: { school_id: 3 } });
    Teacher.findOne.mockResolvedValue({ id: 9, school_id: 3 });
    sectionRepository.findById.mockResolvedValue({ id: 5, class_id: 10, name: 'A' });
    sectionRepository.findByClassAndName.mockResolvedValue(null);
    sectionRepository.updateScoped.mockResolvedValue({ id: 5, name: 'B' });

    await sectionService.updateSection(5, { name: 'B', class_teacher_id: 9 }, { schoolId: 3 });

    expect(sectionRepository.updateScoped).toHaveBeenCalledWith(5, 10, {
      name: 'B',
      class_teacher_id: 9
    });
  });

  it('uses scoped repository delete by id + class', async () => {
    Class.findOne.mockResolvedValue({ id: 10, branch: { school_id: 3 } });
    sectionRepository.findById.mockResolvedValue({ id: 5, class_id: 10, name: 'A' });
    sectionRepository.deleteScoped.mockResolvedValue(true);

    const result = await sectionService.deleteSection(5, { schoolId: 3 });

    expect(sectionRepository.deleteScoped).toHaveBeenCalledWith(5, 10);
    expect(result).toBe(true);
  });
});
