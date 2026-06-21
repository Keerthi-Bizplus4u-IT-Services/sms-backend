/**
 * Unit Tests for Student Service
 * Tests student CRUD operations, validation, and business logic
 */

// Mock dependencies before requiring the service
jest.mock('../../../../../src/api/v1/repositories/student.repository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByAdmissionNumber: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByClass: jest.fn(),
  findBySection: jest.fn(),
  findActiveByClassForPromotion: jest.fn(),
  bulkUpdateClassAndSection: jest.fn()
}));

jest.mock('../../../../../src/models', () => ({
  AcademicYear: {
    findByPk: jest.fn(),
    findOne: jest.fn()
  },
  Class: {
    findByPk: jest.fn()
  },
  Section: {
    findAll: jest.fn()
  },
  sequelize: {
    transaction: jest.fn(),
    query: jest.fn()
  }
}));

const studentService = require('../../../../../src/api/v1/services/student.service');
const studentRepository = require('../../../../../src/api/v1/repositories/student.repository');
const { AcademicYear, Class, Section, sequelize } = require('../../../../../src/models');
const { AppError } = require('../../../../../src/middleware/error.middleware');

describe('StudentService', () => {
  let mockStudent;
  let mockPerson;
  let mockClass;
  let mockSection;
  let mockBranch;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(async (callback) => callback({}));
    sequelize.query.mockResolvedValue();

    // Mock person data
    mockPerson = {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      gender: 'male',
      date_of_birth: '2010-05-15',
      email: 'john.doe@example.com',
      phone: '1234567890',
      address: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001'
    };

    // Mock class data
    mockClass = {
      id: 1,
      name: 'Class 5',
      section_id: 1,
      academic_year_id: 1
    };

    mockSection = {
      id: 1,
      name: 'A',
      room_number: '101'
    };

    mockBranch = {
      id: 1,
      name: 'Main Campus',
      code: 'MAIN'
    };

    // Mock student data
    mockStudent = {
      id: 1,
      person_id: 1,
      admission_number: 'ADM001',
      admission_date: '2024-04-01',
      roll_number: 15,
      class_id: 1,
      section_id: 1,
      academic_year_id: 1,
      parent_id: null,
      blood_group: 'O+',
      status: 'active',
      person: mockPerson,
      class: mockClass,
      section: mockSection,
      branch: mockBranch
    };
  });

  describe('getStudents', () => {
    it('should retrieve all students with default filters', async () => {
      // Arrange
      const filters = { page: 1, limit: 10 };
      const mockResult = {
        students: [mockStudent],
        total: 1,
        page: 1,
        totalPages: 1
      };
      studentRepository.findAll.mockResolvedValue(mockResult);

      // Act
      const result = await studentService.getStudents(filters);

      // Assert
      expect(studentRepository.findAll).toHaveBeenCalledWith(expect.objectContaining(filters));
      expect(result.total).toBe(1);
      expect(result.students).toHaveLength(1);
      expect(result.students[0]).toHaveProperty('admissionNumber');
    });

    it('should retrieve students with class filter', async () => {
      // Arrange
      const filters = { class_id: 1, page: 1, limit: 10 };
      const mockResult = {
        students: [mockStudent],
        total: 1,
        page: 1,
        totalPages: 1
      };
      studentRepository.findAll.mockResolvedValue(mockResult);

      // Act
      const result = await studentService.getStudents(filters);

      // Assert
      expect(studentRepository.findAll).toHaveBeenCalledWith(expect.objectContaining(filters));
      expect(result.students[0].classId).toBeDefined();
    });

    it('should retrieve students with search query', async () => {
      // Arrange
      const filters = { search: 'John', page: 1, limit: 10 };
      const mockResult = {
        students: [mockStudent],
        total: 1,
        page: 1,
        totalPages: 1
      };
      studentRepository.findAll.mockResolvedValue(mockResult);

      // Act
      const result = await studentService.getStudents(filters);

      // Assert
      expect(studentRepository.findAll).toHaveBeenCalledWith(expect.objectContaining(filters));
    });

    it('should handle empty results', async () => {
      // Arrange
      const filters = { page: 1, limit: 10 };
      const mockResult = {
        students: [],
        total: 0,
        page: 1,
        totalPages: 0
      };
      studentRepository.findAll.mockResolvedValue(mockResult);

      // Act
      const result = await studentService.getStudents(filters);

      // Assert
      expect(result.students).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const filters = { page: 2, limit: 20 };
      const mockResult = {
        students: [mockStudent],
        total: 50,
        page: 2,
        totalPages: 3
      };
      studentRepository.findAll.mockResolvedValue(mockResult);

      // Act
      const result = await studentService.getStudents(filters);

      // Assert
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
    });
  });

  describe('getStudentById', () => {
    it('should retrieve student by valid ID', async () => {
      // Arrange
      studentRepository.findById.mockResolvedValue(mockStudent);

      // Act
      const result = await studentService.getStudentById(1);
      const serializedStudent = studentService.serializeStudent(mockStudent);

      // Assert
      expect(studentRepository.findById).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ schoolId: expect.any(Number) })
      );
      expect(result).toEqual(serializedStudent);
      expect(result.id).toBe(1);
      expect(result.branch).toBe(mockBranch.name);
    });

    it('should return null when student not found', async () => {
      // Arrange
      studentRepository.findById.mockResolvedValue(null);

      // Act
      const result = await studentService.getStudentById(999);

      // Assert
      expect(result).toBeNull();
    });

    it('should include flattened person, class, section and branch details', async () => {
      // Arrange
      studentRepository.findById.mockResolvedValue(mockStudent);

      // Act
      const result = await studentService.getStudentById(1);

      // Assert
      expect(result.firstName).toBe(mockPerson.first_name);
      expect(result.className).toBe(mockClass.name);
      expect(result.sectionName).toBe(mockSection.name);
      expect(result.branch).toBe(mockBranch.name);
    });
  });

  describe('getStudentByAdmissionNumber', () => {
    it('should retrieve student by admission number', async () => {
      // Arrange
      studentRepository.findByAdmissionNumber.mockResolvedValue(mockStudent);

      // Act
      const result = await studentService.getStudentByAdmissionNumber('ADM001');
      const serializedStudent = studentService.serializeStudent(mockStudent);

      // Assert
      expect(studentRepository.findByAdmissionNumber).toHaveBeenCalledWith(
        'ADM001',
        expect.objectContaining({ schoolId: expect.any(Number) })
      );
      expect(result).toEqual(serializedStudent);
      expect(result.admissionNumber).toBe('ADM001');
    });

    it('should throw error when student not found', async () => {
      // Arrange
      studentRepository.findByAdmissionNumber.mockResolvedValue(null);

      // Act & Assert
      await expect(studentService.getStudentByAdmissionNumber('INVALID'))
        .rejects
        .toThrow(new AppError('Student not found', 404));
    });

    it('should handle case-sensitive admission numbers', async () => {
      // Arrange
      studentRepository.findByAdmissionNumber.mockResolvedValue(mockStudent);

      // Act
      const result = await studentService.getStudentByAdmissionNumber('ADM001');

      // Assert
      expect(result.admissionNumber).toBe('ADM001');
    });
  });

  describe('createStudent', () => {
    const validData = {
      person: {
        first_name: 'Jane',
        last_name: 'Smith',
        gender: 'female',
        date_of_birth: '2011-08-20',
        email: 'jane.smith@example.com',
        phone: '9876543210'
      },
      student: {
        admission_number: 'ADM002',
        admission_date: '2024-04-01',
        class_id: 1,
        section_id: 1,
        roll_number: 20
      }
    };

    it('should successfully create student with valid data', async () => {
      // Arrange
      studentRepository.findByAdmissionNumber.mockResolvedValue(null);
      studentRepository.create.mockResolvedValue({ ...mockStudent, admission_number: 'ADM002' });

      // Act
      const result = await studentService.createStudent(validData);

      // Assert
      expect(studentRepository.findByAdmissionNumber).toHaveBeenCalledWith(
        'ADM002',
        expect.objectContaining({ schoolId: expect.any(Number) })
      );
      expect(studentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validData.student,
          school_id: expect.any(Number),
          branch_id: expect.any(Number)
        }),
        validData.person,
        null
      );
      expect(result.admissionNumber).toBe('ADM002');
    });

    it('should throw error when admission number already exists', async () => {
      // Arrange
      studentRepository.findByAdmissionNumber.mockResolvedValue(mockStudent);

      // Act & Assert
      await expect(studentService.createStudent(validData))
        .rejects
        .toThrow(new AppError('Admission number already exists', 409));
      
      expect(studentRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when person first name is missing', async () => {
      // Arrange
      const invalidData = {
        ...validData,
        person: { ...validData.person, first_name: '' }
      };
      studentRepository.findByAdmissionNumber.mockResolvedValue(null);

      // Act & Assert
      await expect(studentService.createStudent(invalidData))
        .rejects
        .toThrow(new AppError('Person details are incomplete', 400));
    });

    it('should throw error when person last name is missing', async () => {
      // Arrange
      const invalidData = {
        ...validData,
        person: { ...validData.person, last_name: null }
      };
      studentRepository.findByAdmissionNumber.mockResolvedValue(null);

      // Act & Assert
      await expect(studentService.createStudent(invalidData))
        .rejects
        .toThrow(new AppError('Person details are incomplete', 400));
    });

    it('should throw error when date of birth is missing', async () => {
      // Arrange
      const invalidData = {
        ...validData,
        person: { ...validData.person, date_of_birth: undefined }
      };
      studentRepository.findByAdmissionNumber.mockResolvedValue(null);

      // Act & Assert
      await expect(studentService.createStudent(invalidData))
        .rejects
        .toThrow(new AppError('Person details are incomplete', 400));
    });

    it('should throw error when gender is missing', async () => {
      // Arrange
      const invalidData = {
        ...validData,
        person: { ...validData.person, gender: '' }
      };
      studentRepository.findByAdmissionNumber.mockResolvedValue(null);

      // Act & Assert
      await expect(studentService.createStudent(invalidData))
        .rejects
        .toThrow(new AppError('Person details are incomplete', 400));
    });

    it('should throw error when class_id is missing', async () => {
      // Arrange
      const invalidData = {
        ...validData,
        student: { ...validData.student, class_id: null }
      };
      studentRepository.findByAdmissionNumber.mockResolvedValue(null);

      // Act & Assert
      await expect(studentService.createStudent(invalidData))
        .rejects
        .toThrow(new AppError('Student details are incomplete', 400));
    });

    it('should throw error when section_id is missing', async () => {
      // Arrange
      const invalidData = {
        ...validData,
        student: { ...validData.student, section_id: undefined }
      };
      studentRepository.findByAdmissionNumber.mockResolvedValue(null);

      // Act & Assert
      await expect(studentService.createStudent(invalidData))
        .rejects
        .toThrow(new AppError('Student details are incomplete', 400));
    });

    it('should throw error when admission_date is missing', async () => {
      // Arrange
      const invalidData = {
        ...validData,
        student: { ...validData.student, admission_date: '' }
      };
      studentRepository.findByAdmissionNumber.mockResolvedValue(null);

      // Act & Assert
      await expect(studentService.createStudent(invalidData))
        .rejects
        .toThrow(new AppError('Student details are incomplete', 400));
    });

    it('should create student with optional user data', async () => {
      // Arrange
      const dataWithUser = {
        ...validData,
        user: {
          email: 'jane@example.com',
          password: 'Password123!',
          role_id: 2
        }
      };
      studentRepository.findByAdmissionNumber.mockResolvedValue(null);
      studentRepository.create.mockResolvedValue(mockStudent);

      // Act
      await studentService.createStudent(dataWithUser);

      // Assert
      expect(studentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...dataWithUser.student,
          school_id: expect.any(Number),
          branch_id: expect.any(Number)
        }),
        dataWithUser.person,
        expect.objectContaining({
          ...dataWithUser.user,
          school_id: expect.any(Number)
        })
      );
    });
  });

  describe('updateStudent', () => {
    const updateData = {
      student: {
        roll_number: 25,
        blood_group: 'A+'
      },
      person: {
        phone: '9999999999',
        email: 'updated@example.com'
      }
    };

    it('should successfully update student', async () => {
      // Arrange
      const updatedStudent = { ...mockStudent, ...updateData.student };
      studentRepository.update.mockResolvedValue(updatedStudent);

      // Act
      const result = await studentService.updateStudent(1, updateData);

      // Assert
      expect(studentRepository.update).toHaveBeenCalledWith(
        1,
        updateData.student,
        updateData.person,
        expect.objectContaining({ schoolId: expect.any(Number) })
      );
      expect(result.rollNumber).toBe(25);
    });

    it('should check admission number uniqueness when updating', async () => {
      // Arrange
      const dataWithAdmission = {
        student: { admission_number: 'ADM003' },
        person: {}
      };
      studentRepository.findByAdmissionNumber.mockResolvedValue(null);
      studentRepository.update.mockResolvedValue(mockStudent);

      // Act
      await studentService.updateStudent(1, dataWithAdmission);

      // Assert
      expect(studentRepository.findByAdmissionNumber).toHaveBeenCalledWith(
        'ADM003',
        expect.objectContaining({ schoolId: expect.any(Number) })
      );
    });

    it('should throw error when new admission number already exists', async () => {
      // Arrange
      const dataWithAdmission = {
        student: { admission_number: 'ADM002' },
        person: {}
      };
      const existingStudent = { ...mockStudent, id: 2, admission_number: 'ADM002' };
      studentRepository.findByAdmissionNumber.mockResolvedValue(existingStudent);

      // Act & Assert
      await expect(studentService.updateStudent(1, dataWithAdmission))
        .rejects
        .toThrow(new AppError('Admission number already exists', 409));
    });

    it('should allow updating same student with same admission number', async () => {
      // Arrange
      const dataWithAdmission = {
        student: { admission_number: 'ADM001' },
        person: {}
      };
      studentRepository.findByAdmissionNumber.mockResolvedValue(mockStudent);
      studentRepository.update.mockResolvedValue(mockStudent);

      // Act
      const result = await studentService.updateStudent(1, dataWithAdmission);

      // Assert
      expect(result).toBeDefined();
      expect(studentRepository.update).toHaveBeenCalled();
    });

    it('should update only person data', async () => {
      // Arrange
      const personOnlyData = {
        person: { phone: '8888888888' }
      };
      studentRepository.update.mockResolvedValue(mockStudent);

      // Act
      await studentService.updateStudent(1, personOnlyData);

      // Assert
      expect(studentRepository.update).toHaveBeenCalledWith(
        1,
        undefined,
        personOnlyData.person,
        expect.objectContaining({ schoolId: expect.any(Number) })
      );
    });

    it('should update only student data', async () => {
      // Arrange
      const studentOnlyData = {
        student: { roll_number: 30 }
      };
      studentRepository.update.mockResolvedValue(mockStudent);

      // Act
      await studentService.updateStudent(1, studentOnlyData);

      // Assert
      expect(studentRepository.update).toHaveBeenCalledWith(
        1,
        studentOnlyData.student,
        undefined,
        expect.objectContaining({ schoolId: expect.any(Number) })
      );
    });
  });

  describe('deleteStudent', () => {
    it('should successfully delete student', async () => {
      // Arrange
      studentRepository.delete.mockResolvedValue(true);

      // Act
      const result = await studentService.deleteStudent(1);

      // Assert
      expect(studentRepository.delete).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ schoolId: expect.any(Number) })
      );
      expect(result).toBe(true);
    });

    it('should return false when student not found', async () => {
      // Arrange
      studentRepository.delete.mockResolvedValue(false);

      // Act
      const result = await studentService.deleteStudent(999);

      // Assert
      expect(result).toBe(false);
    });

    it('should perform soft delete (paranoid)', async () => {
      // Arrange
      studentRepository.delete.mockResolvedValue(true);

      // Act
      await studentService.deleteStudent(1);

      // Assert
      expect(studentRepository.delete).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ schoolId: expect.any(Number) })
      );
    });
  });

  describe('getStudentsByClass', () => {
    it('should retrieve all students in a class', async () => {
      // Arrange
      const classStudents = [mockStudent, { ...mockStudent, id: 2 }];
      studentRepository.findByClass.mockResolvedValue({
        students: classStudents,
        total: 25,
        page: 2,
        totalPages: 5
      });

      // Act
      const result = await studentService.getStudentsByClass(1, { schoolId: 99, page: 2 });

      // Assert
      expect(studentRepository.findByClass).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          schoolId: 99,
          page: 2
        })
      );
      expect(result.students).toHaveLength(2);
      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.students[0]).toHaveProperty('admissionNumber');
    });

    it('should return empty array when no students in class', async () => {
      // Arrange
      studentRepository.findByClass.mockResolvedValue({
        students: [],
        total: 0,
        page: 1,
        totalPages: 0
      });

      // Act
      const result = await studentService.getStudentsByClass(999, { schoolId: 1 });

      // Assert
      expect(result.students).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getStudentsBySection', () => {
    it('should retrieve students by class and section', async () => {
      // Arrange
      const sectionStudents = [mockStudent];
      studentRepository.findBySection.mockResolvedValue({
        students: sectionStudents,
        total: 10,
        page: 1,
        totalPages: 1
      });

      // Act
      const result = await studentService.getStudentsBySection(1, 1, { schoolId: 7, status: 'active' });

      // Assert
      expect(studentRepository.findBySection).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({ schoolId: 7, status: 'active' })
      );
      expect(result.students).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(result.students[0].sectionId).toBe(1);
    });

    it('should return empty array when no students in section', async () => {
      // Arrange
      studentRepository.findBySection.mockResolvedValue({
        students: [],
        total: 0,
        page: 1,
        totalPages: 0
      });

      // Act
      const result = await studentService.getStudentsBySection(1, 999, { schoolId: 1 });

      // Assert
      expect(result.students).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('promoteStudents', () => {
    const basePayload = {
      fromAcademicYearId: 1,
      toAcademicYearId: 2,
      fromClassId: 10,
      toClassId: 20
    };

    const fromYear = { id: 1, name: '2023-2024', school_id: 1 };
    const toYear = { id: 2, name: '2024-2025', school_id: 1 };
    const fromClass = { id: 10, name: 'Class 5', academic_year_id: 1 };
    const toClass = { id: 20, name: 'Class 6', academic_year_id: 2 };
    const sections = [
      { id: 100, name: 'A', class_id: 20 },
      { id: 101, name: 'B', class_id: 20 }
    ];
    const studentsForPromotion = [
      { id: 501, section: { name: 'A' } },
      { id: 502, section: { name: 'B' } }
    ];

    const primeSuccessMocks = () => {
      AcademicYear.findByPk
        .mockResolvedValueOnce(fromYear)
        .mockResolvedValueOnce(toYear);

      Class.findByPk
        .mockResolvedValueOnce(fromClass)
        .mockResolvedValueOnce(toClass);

      Section.findAll.mockResolvedValue(sections);
      studentRepository.findActiveByClassForPromotion.mockResolvedValue(studentsForPromotion);
      studentRepository.bulkUpdateClassAndSection.mockResolvedValue([2]);
    };

    it('should throw when payload is incomplete', async () => {
      await expect(studentService.promoteStudents({})).rejects.toThrow(
        'Incomplete promotion payload'
      );
    });

    it('should throw when academic years are identical', async () => {
      await expect(
        studentService.promoteStudents({
          ...basePayload,
          toAcademicYearId: basePayload.fromAcademicYearId
        })
      ).rejects.toThrow('From and to academic years cannot be the same');
    });

    it('should throw when classes are identical', async () => {
      await expect(
        studentService.promoteStudents({
          ...basePayload,
          toClassId: basePayload.fromClassId
        })
      ).rejects.toThrow('From and to classes cannot be the same');
    });

    it('should throw when source academic year is missing', async () => {
      AcademicYear.findByPk.mockResolvedValueOnce(null);
      AcademicYear.findByPk.mockResolvedValueOnce(toYear);

      await expect(studentService.promoteStudents(basePayload)).rejects.toThrow(
        'Source academic year not found'
      );
    });

    it('should throw when no active students found', async () => {
      AcademicYear.findByPk
        .mockResolvedValueOnce(fromYear)
        .mockResolvedValueOnce(toYear);
      Class.findByPk
        .mockResolvedValueOnce(fromClass)
        .mockResolvedValueOnce(toClass);
      studentRepository.findActiveByClassForPromotion.mockResolvedValue([]);

      await expect(studentService.promoteStudents(basePayload)).rejects.toThrow(
        'No active students found in the source class'
      );
    });

    it('should throw when destination class has no sections', async () => {
      AcademicYear.findByPk
        .mockResolvedValueOnce(fromYear)
        .mockResolvedValueOnce(toYear);
      Class.findByPk
        .mockResolvedValueOnce(fromClass)
        .mockResolvedValueOnce(toClass);
      Section.findAll.mockResolvedValue([]);
      studentRepository.findActiveByClassForPromotion.mockResolvedValue(studentsForPromotion);

      await expect(studentService.promoteStudents(basePayload)).rejects.toThrow(
        'Destination class does not have any sections configured'
      );
    });

    it('should throw when requested student IDs are missing from source class', async () => {
      AcademicYear.findByPk
        .mockResolvedValueOnce(fromYear)
        .mockResolvedValueOnce(toYear);
      Class.findByPk
        .mockResolvedValueOnce(fromClass)
        .mockResolvedValueOnce(toClass);
      Section.findAll.mockResolvedValue(sections);
      studentRepository.findActiveByClassForPromotion.mockResolvedValue([studentsForPromotion[0]]);

      await expect(
        studentService.promoteStudents({
          ...basePayload,
          studentIds: [studentsForPromotion[0].id, 999]
        })
      ).rejects.toThrow('Some students were not found in the source class: 999');
    });

    it('should promote students and return summary', async () => {
      primeSuccessMocks();

      const result = await studentService.promoteStudents(basePayload, { userId: 42 });

      expect(studentRepository.findActiveByClassForPromotion).toHaveBeenCalledWith(
        basePayload.fromClassId,
        [],
        expect.objectContaining({ schoolId: expect.any(Number) })
      );
      expect(studentRepository.bulkUpdateClassAndSection).toHaveBeenCalledTimes(2);
      expect(studentRepository.bulkUpdateClassAndSection).toHaveBeenCalledWith(
        [studentsForPromotion[0].id],
        basePayload.toClassId,
        sections[0].id,
        expect.any(Object)
      );
      expect(sequelize.query).toHaveBeenCalled();
      expect(result).toEqual({
        promotedCount: studentsForPromotion.length,
        fromAcademicYear: { id: fromYear.id, name: fromYear.name },
        toAcademicYear: { id: toYear.id, name: toYear.name },
        fromClass: { id: fromClass.id, name: fromClass.name },
        toClass: { id: toClass.id, name: toClass.name }
      });
    });
  });

  describe('Error handling', () => {
    it('should propagate repository errors', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      studentRepository.findAll.mockRejectedValue(dbError);

      // Act & Assert
      await expect(studentService.getStudents({}))
        .rejects
        .toThrow('Database connection failed');
    });

    it('should handle repository errors during create', async () => {
      // Arrange
      const validData = {
        person: {
          first_name: 'Test',
          last_name: 'User',
          gender: 'male',
          date_of_birth: '2010-01-01'
        },
        student: {
          admission_number: 'ADM999',
          admission_date: '2024-01-01',
          class_id: 1,
          section_id: 1
        }
      };
      studentRepository.findByAdmissionNumber.mockResolvedValue(null);
      studentRepository.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(studentService.createStudent(validData))
        .rejects
        .toThrow('Database error');
    });
  });
});
