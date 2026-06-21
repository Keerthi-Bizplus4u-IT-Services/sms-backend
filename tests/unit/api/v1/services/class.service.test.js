/**
 * Unit Tests for Class and Subject Services
 * Tests class and subject CRUD operations
 */

// Mock the repositories before requiring service modules
jest.mock('../../../../../src/api/v1/repositories/class.repository');
jest.mock('../../../../../src/models', () => ({
  AcademicYear: {
    findByPk: jest.fn()
  }
}));

const { classService, subjectService } = require('../../../../../src/api/v1/services/class.service');
const { classRepository, subjectRepository } = require('../../../../../src/api/v1/repositories/class.repository');
const { AcademicYear } = require('../../../../../src/models');

describe('ClassService', () => {
  const defaultContext = { schoolId: 1 };
  let mockClass;
  let mockAcademicYear;
  let mockSection;

  beforeEach(() => {
    jest.clearAllMocks();
    AcademicYear.findByPk.mockReset();

    mockAcademicYear = {
      id: 1,
      year: '2024-2025',
      start_date: '2024-04-01',
      end_date: '2025-03-31',
      is_current: true
    };

    mockSection = {
      id: 1,
      name: 'A',
      description: 'Section A'
    };

    mockClass = {
      id: 1,
      name: 'Class 10',
      academic_year_id: 1,
      section_id: 1,
      capacity: 40,
      room_number: 'R-101',
      academicYear: mockAcademicYear,
      section: mockSection
    };
  });

  describe('getClasses', () => {
    it('should retrieve all classes with filters', async () => {
      const filters = { page: 1, limit: 10 };
      const mockResult = {
        data: [mockClass],
        total: 1,
        page: 1,
        totalPages: 1
      };
      classRepository.findAll.mockResolvedValue(mockResult);

      const result = await classService.getClasses(filters, defaultContext);

      expect(classRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          ...filters,
          schoolId: defaultContext.schoolId
        })
      );
      expect(result).toEqual(mockResult);
      expect(result.data).toHaveLength(1);
    });

    it('should retrieve classes by academic year', async () => {
      const filters = { academic_year_id: 1 };
      const mockResult = {
        data: [mockClass],
        total: 1,
        page: 1,
        totalPages: 1
      };
      classRepository.findAll.mockResolvedValue(mockResult);

      const result = await classService.getClasses(filters, defaultContext);

      expect(result.data[0].academic_year_id).toBe(1);
    });

    it('should handle empty results', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        totalPages: 0
      };
      classRepository.findAll.mockResolvedValue(mockResult);

      const result = await classService.getClasses({}, defaultContext);

      expect(result.data).toHaveLength(0);
    });
  });

  describe('getClassById', () => {
    it('should retrieve class by valid ID', async () => {
      classRepository.findById.mockResolvedValue(mockClass);

      const result = await classService.getClassById(1, defaultContext);

      expect(classRepository.findById).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ schoolId: defaultContext.schoolId })
      );
      expect(result).toEqual(mockClass);
    });

    it('should return null when class not found', async () => {
      classRepository.findById.mockResolvedValue(null);

      const result = await classService.getClassById(999, defaultContext);

      expect(result).toBeNull();
    });

    it('should include academic year and section details', async () => {
      classRepository.findById.mockResolvedValue(mockClass);

      const result = await classService.getClassById(1, defaultContext);

      expect(result.academicYear).toBeDefined();
      expect(result.section).toBeDefined();
    });
  });

  describe('createClass', () => {
    const validData = {
      name: 'Class 11',
      academic_year_id: 1,
      section_id: 2,
      branch_id: 1,
      capacity: 35,
      room_number: 'R-201'
    };

    it('should successfully create class with valid data', async () => {
      AcademicYear.findByPk.mockResolvedValue({ id: 1, school_id: defaultContext.schoolId });
      classRepository.create.mockResolvedValue({ ...mockClass, ...validData });

      const result = await classService.createClass(validData, defaultContext);

      expect(classRepository.create).toHaveBeenCalledWith(
        expect.objectContaining(validData),
        expect.objectContaining({ schoolId: defaultContext.schoolId })
      );
      expect(result.name).toBe('Class 11');
    });

    it('should create class with minimum required fields', async () => {
      AcademicYear.findByPk.mockResolvedValue({ id: 1, school_id: defaultContext.schoolId });
      const minimalData = {
        name: 'Class 12',
        academic_year_id: 1,
        section_id: 1,
        branch_id: 1
      };
      classRepository.create.mockResolvedValue({ ...mockClass, ...minimalData });

      const result = await classService.createClass(minimalData, defaultContext);

      expect(result).toBeDefined();
    });
  });

  describe('updateClass', () => {
    const updateData = {
      capacity: 45,
      room_number: 'R-102'
    };

    it('should successfully update class', async () => {
      const updatedClass = { ...mockClass, ...updateData };
      classRepository.update.mockResolvedValue(updatedClass);

      const result = await classService.updateClass(1, updateData, defaultContext);

      expect(classRepository.update).toHaveBeenCalledWith(
        1,
        updateData,
        expect.objectContaining({ schoolId: defaultContext.schoolId })
      );
      expect(result.capacity).toBe(45);
      expect(result.room_number).toBe('R-102');
    });

    it('should update class name', async () => {
      const nameUpdate = { name: 'Class 10-A' };
      const updatedClass = { ...mockClass, ...nameUpdate };
      classRepository.update.mockResolvedValue(updatedClass);

      const result = await classService.updateClass(1, nameUpdate, defaultContext);

      expect(result.name).toBe('Class 10-A');
    });
  });

  describe('deleteClass', () => {
    it('should successfully delete class', async () => {
      classRepository.delete.mockResolvedValue(true);

      const result = await classService.deleteClass(1, defaultContext);

      expect(classRepository.delete).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ schoolId: defaultContext.schoolId })
      );
      expect(result).toBe(true);
    });

    it('should return false when class not found', async () => {
      classRepository.delete.mockResolvedValue(false);

      const result = await classService.deleteClass(999, defaultContext);

      expect(result).toBe(false);
    });
  });
});

describe('SubjectService', () => {
  const defaultContext = { schoolId: 1 };
  let mockSubject;
  let mockClass;
  let mockTeacher;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClass = {
      id: 1,
      name: 'Class 10',
      section_id: 1
    };

    mockTeacher = {
      id: 1,
      employee_id: 'EMP001',
      person: {
        first_name: 'John',
        last_name: 'Doe'
      }
    };

    mockSubject = {
      id: 1,
      name: 'Mathematics',
      code: 'MATH101',
      class_id: 1,
      teacher_id: 1,
      credits: 4,
      description: 'Advanced Mathematics',
      class: mockClass,
      teacher: mockTeacher
    };
  });

  describe('getSubjects', () => {
    it('should retrieve all subjects with filters', async () => {
      const filters = { page: 1, limit: 10 };
      const mockResult = {
        data: [mockSubject],
        total: 1,
        page: 1,
        totalPages: 1
      };
      subjectRepository.findAll.mockResolvedValue(mockResult);

      const result = await subjectService.getSubjects(filters, defaultContext);

      expect(subjectRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          ...filters,
          schoolId: defaultContext.schoolId
        })
      );
      expect(result).toEqual(mockResult);
      expect(result.data).toHaveLength(1);
    });

    it('should retrieve subjects by class', async () => {
      const filters = { class_id: 1 };
      const mockResult = {
        data: [mockSubject],
        total: 1,
        page: 1,
        totalPages: 1
      };
      subjectRepository.findAll.mockResolvedValue(mockResult);

      const result = await subjectService.getSubjects(filters, defaultContext);

      expect(result.data[0].class_id).toBe(1);
    });

    it('should retrieve subjects by teacher', async () => {
      const filters = { teacher_id: 1 };
      const mockResult = {
        data: [mockSubject],
        total: 1,
        page: 1,
        totalPages: 1
      };
      subjectRepository.findAll.mockResolvedValue(mockResult);

      const result = await subjectService.getSubjects(filters, defaultContext);

      expect(result.data[0].teacher_id).toBe(1);
    });

    it('should handle empty results', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        totalPages: 0
      };
      subjectRepository.findAll.mockResolvedValue(mockResult);

      const result = await subjectService.getSubjects({}, defaultContext);

      expect(result.data).toHaveLength(0);
    });
  });

  describe('getSubjectById', () => {
    it('should retrieve subject by valid ID', async () => {
      subjectRepository.findById.mockResolvedValue(mockSubject);

      const result = await subjectService.getSubjectById(1, defaultContext);

      expect(subjectRepository.findById).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ schoolId: defaultContext.schoolId })
      );
      expect(result).toEqual(mockSubject);
    });

    it('should return null when subject not found', async () => {
      subjectRepository.findById.mockResolvedValue(null);

      const result = await subjectService.getSubjectById(999, defaultContext);

      expect(result).toBeNull();
    });

    it('should include class and teacher details', async () => {
      subjectRepository.findById.mockResolvedValue(mockSubject);

      const result = await subjectService.getSubjectById(1, defaultContext);

      expect(result.class).toBeDefined();
      expect(result.teacher).toBeDefined();
    });
  });

  describe('createSubject', () => {
    const validData = {
      name: 'Physics',
      code: 'PHY101',
      class_id: 1,
      teacher_id: 1,
      credits: 4,
      description: 'Physics fundamentals'
    };

    it('should successfully create subject with valid data', async () => {
      subjectRepository.create.mockResolvedValue({ ...mockSubject, ...validData });

      const result = await subjectService.createSubject(validData, defaultContext);

      expect(subjectRepository.create).toHaveBeenCalledWith(
        expect.objectContaining(validData),
        expect.objectContaining({ schoolId: defaultContext.schoolId })
      );
      expect(result.name).toBe('Physics');
      expect(result.code).toBe('PHY101');
    });

    it('should create subject without teacher assignment', async () => {
      const dataWithoutTeacher = {
        name: 'Chemistry',
        code: 'CHEM101',
        class_id: 1,
        credits: 3
      };
      subjectRepository.create.mockResolvedValue({ ...mockSubject, ...dataWithoutTeacher, teacher_id: null });

      const result = await subjectService.createSubject(dataWithoutTeacher, defaultContext);

      expect(result.teacher_id).toBeNull();
    });

    it('should create subject with all fields', async () => {
      subjectRepository.create.mockResolvedValue(mockSubject);

      const result = await subjectService.createSubject(validData, defaultContext);

      expect(result.name).toBeDefined();
      expect(result.code).toBeDefined();
      expect(result.class_id).toBeDefined();
      expect(result.credits).toBeDefined();
    });
  });

  describe('updateSubject', () => {
    const updateData = {
      teacher_id: 2,
      credits: 5,
      description: 'Updated description'
    };

    it('should successfully update subject', async () => {
      const updatedSubject = { ...mockSubject, ...updateData };
      subjectRepository.update.mockResolvedValue(updatedSubject);

      const result = await subjectService.updateSubject(1, updateData, defaultContext);

      expect(subjectRepository.update).toHaveBeenCalledWith(
        1,
        updateData,
        expect.objectContaining({ schoolId: defaultContext.schoolId })
      );
      expect(result.teacher_id).toBe(2);
      expect(result.credits).toBe(5);
    });

    it('should update subject name and code', async () => {
      const nameCodeUpdate = {
        name: 'Advanced Mathematics',
        code: 'MATH201'
      };
      const updatedSubject = { ...mockSubject, ...nameCodeUpdate };
      subjectRepository.update.mockResolvedValue(updatedSubject);

      const result = await subjectService.updateSubject(1, nameCodeUpdate, defaultContext);

      expect(result.name).toBe('Advanced Mathematics');
      expect(result.code).toBe('MATH201');
    });

    it('should reassign teacher', async () => {
      const teacherUpdate = { teacher_id: 3 };
      const updatedSubject = { ...mockSubject, teacher_id: 3 };
      subjectRepository.update.mockResolvedValue(updatedSubject);

      const result = await subjectService.updateSubject(1, teacherUpdate, defaultContext);

      expect(result.teacher_id).toBe(3);
    });

    it('should unassign teacher', async () => {
      const unassignTeacher = { teacher_id: null };
      const updatedSubject = { ...mockSubject, teacher_id: null };
      subjectRepository.update.mockResolvedValue(updatedSubject);

      const result = await subjectService.updateSubject(1, unassignTeacher, defaultContext);

      expect(result.teacher_id).toBeNull();
    });
  });

  describe('deleteSubject', () => {
    it('should successfully delete subject', async () => {
      subjectRepository.delete.mockResolvedValue(true);

      const result = await subjectService.deleteSubject(1, defaultContext);

      expect(subjectRepository.delete).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ schoolId: defaultContext.schoolId })
      );
      expect(result).toBe(true);
    });

    it('should return false when subject not found', async () => {
      subjectRepository.delete.mockResolvedValue(false);

      const result = await subjectService.deleteSubject(999, defaultContext);

      expect(result).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should propagate repository errors for subjects', async () => {
      const dbError = new Error('Database error');
      subjectRepository.findAll.mockRejectedValue(dbError);

      await expect(subjectService.getSubjects({}, defaultContext))
        .rejects
        .toThrow('Database error');
    });

    it('should handle create errors', async () => {
      const validData = {
        name: 'Test Subject',
        code: 'TEST101',
        class_id: 1
      };
      subjectRepository.create.mockRejectedValue(new Error('Create failed'));

      await expect(subjectService.createSubject(validData, defaultContext))
        .rejects
        .toThrow('Create failed');
    });
  });
});
