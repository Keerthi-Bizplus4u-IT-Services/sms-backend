/**
 * Unit Tests for Student Repository
 * Tests database operations with mocked Sequelize models
 */

// Mock all models before loading the repository
jest.mock('../../../../../src/models');

const studentRepository = require('../../../../../src/api/v1/repositories/student.repository');
const { Student, Person, User, Class, Section, AcademicYear } = require('../../../../../src/models');
const { AppError } = require('../../../../../src/middleware/error.middleware');
const { Op } = require('sequelize');

describe('StudentRepository', () => {
  let mockStudent;
  let mockPerson;
  let mockClass;
  let mockAcademicYear;
  let mockSection;

  beforeEach(() => {
    jest.clearAllMocks();
    Student.sequelize = undefined;

    mockPerson = {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      gender: 'male',
      date_of_birth: '2010-05-15',
      email: 'john.doe@example.com',
      phone: '1234567890'
    };

    mockAcademicYear = {
      id: 1,
      name: '2024-2025',
      is_current: true
    };

    mockSection = {
      id: 1,
      name: 'A',
      room_number: 'R-101'
    };

    mockClass = {
      id: 1,
      name: 'Class 10',
      section_id: 1,
      academic_year_id: 1,
      academicYear: mockAcademicYear
    };

    mockStudent = {
      id: 1,
      person_id: 1,
      admission_number: 'ADM001',
      admission_date: '2024-04-01',
      roll_number: 15,
      class_id: 1,
      section_id: 1,
      status: 'active',
      person: mockPerson,
      class: mockClass,
      section: mockSection
    };
  });

  describe('findAll', () => {
    it('should retrieve all students with default pagination', async () => {
      const mockResult = {
        rows: [mockStudent],
        count: 1
      };
      Student.findAndCountAll = jest.fn().mockResolvedValue(mockResult);

      const result = await studentRepository.findAll({ page: 1, limit: 10 });

      expect(Student.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
          distinct: true,
          order: [['admission_number', 'DESC']]
        })
      );
      expect(result.students).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter students by class', async () => {
      const mockResult = {
        rows: [mockStudent],
        count: 1
      };
      Student.findAndCountAll = jest.fn().mockResolvedValue(mockResult);

      await studentRepository.findAll({ classId: 1 });

      expect(Student.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ class_id: 1 })
        })
      );
    });

    it('should filter students by section', async () => {
      const mockResult = {
        rows: [mockStudent],
        count: 1
      };
      Student.findAndCountAll = jest.fn().mockResolvedValue(mockResult);

      await studentRepository.findAll({ sectionId: 1 });

      expect(Student.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ section_id: 1 })
        })
      );
    });

    it('should filter students by status', async () => {
      const mockResult = {
        rows: [mockStudent],
        count: 1
      };
      Student.findAndCountAll = jest.fn().mockResolvedValue(mockResult);

      await studentRepository.findAll({ status: 'active' });

      expect(Student.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active' })
        })
      );
    });

    it('should search students by student and person fields', async () => {
      const mockResult = {
        rows: [mockStudent],
        count: 1
      };
      Student.findAndCountAll = jest.fn().mockResolvedValue(mockResult);

      await studentRepository.findAll({ search: 'John' });

      const callArg = Student.findAndCountAll.mock.calls[0][0];
      const tokenFilters = callArg.where[Op.and];
      const firstTokenOr = tokenFilters[0][Op.or];

      expect(Student.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({
              model: Person,
              as: 'person'
            })
          ])
        })
      );

      expect(Array.isArray(tokenFilters)).toBe(true);
      expect(firstTokenOr).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ admission_number: expect.any(Object) }),
          expect.objectContaining({ roll_number: expect.any(Object) }),
          expect.objectContaining({ '$person.first_name$': expect.any(Object) }),
          expect.objectContaining({ '$person.last_name$': expect.any(Object) }),
          expect.objectContaining({ '$person.phone$': expect.any(Object) })
        ])
      );
    });

    it('should calculate correct pagination', async () => {
      const mockResult = {
        rows: [mockStudent],
        count: 25
      };
      Student.findAndCountAll = jest.fn().mockResolvedValue(mockResult);

      const result = await studentRepository.findAll({ page: 2, limit: 10 });

      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
      expect(Student.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 10
        })
      );
    });

    it('should include Person, Class, Section associations', async () => {
      const mockResult = {
        rows: [mockStudent],
        count: 1
      };
      Student.findAndCountAll = jest.fn().mockResolvedValue(mockResult);

      await studentRepository.findAll({});

      expect(Student.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({ model: Person, as: 'person' }),
            expect.objectContaining({ model: Class, as: 'class' }),
            expect.objectContaining({ model: Section, as: 'section' })
          ])
        })
      );
    });
  });

  describe('findById', () => {
    it('should retrieve student by ID with associations', async () => {
      Student.findOne = jest.fn().mockResolvedValue(mockStudent);

      const result = await studentRepository.findById(1);

      expect(Student.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          include: expect.any(Array)
        })
      );
      expect(result).toEqual(mockStudent);
    });

    it('should return null when student not found', async () => {
      Student.findOne = jest.fn().mockResolvedValue(null);

      const result = await studentRepository.findById(999);

      expect(result).toBeNull();
    });

    it('should include nested Person and User data', async () => {
      Student.findOne = jest.fn().mockResolvedValue(mockStudent);

      await studentRepository.findById(1);

      expect(Student.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          include: expect.arrayContaining([
            expect.objectContaining({
              model: Person,
              as: 'person',
              include: expect.arrayContaining([
                expect.objectContaining({ model: User, as: 'user' })
              ])
            })
          ])
        })
      );
    });
  });

  describe('findByAdmissionNumber', () => {
    it('should find student by admission number', async () => {
      Student.findOne = jest.fn().mockResolvedValue(mockStudent);

      const result = await studentRepository.findByAdmissionNumber('ADM001');

      expect(Student.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { admission_number: 'ADM001' }
        })
      );
      expect(result).toEqual(mockStudent);
    });

    it('should return null when admission number not found', async () => {
      Student.findOne = jest.fn().mockResolvedValue(null);

      const result = await studentRepository.findByAdmissionNumber('INVALID');

      expect(result).toBeNull();
    });
  });

  describe('findByClass', () => {
    it('should return paginated students for a class with filters', async () => {
      const mockRows = [mockStudent, { ...mockStudent, id: 2, roll_number: 16 }];
      const repositoryResult = {
        rows: mockRows,
        count: 30
      };

      Student.findAndCountAll = jest.fn().mockResolvedValue(repositoryResult);

      const result = await studentRepository.findByClass(1, {
        schoolId: 5,
        page: 2,
        limit: 10,
        status: 'inactive',
        search: 'john'
      });

      expect(Student.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            class_id: 1,
            status: 'inactive',
            school_id: 5
          }),
          limit: 10,
          offset: 10,
          distinct: true
        })
      );

      const queryWhere = Student.findAndCountAll.mock.calls[0][0].where;
      expect(queryWhere[Op.and]).toBeDefined();

      expect(result.students).toHaveLength(2);
      expect(result.total).toBe(30);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
    });

    it('should use default pagination when options are missing', async () => {
      Student.findAndCountAll = jest.fn().mockResolvedValue({
        rows: [],
        count: 0
      });

      const result = await studentRepository.findByClass(999);

      expect(Student.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 25,
          offset: 0
        })
      );
      expect(result).toEqual({
        students: [],
        total: 0,
        page: 1,
        totalPages: 0
      });
    });
  });

  describe('findBySection', () => {
    it('should return paginated students for a section', async () => {
      const mockRows = [mockStudent];
      Student.findAndCountAll = jest.fn().mockResolvedValue({
        rows: mockRows,
        count: 1
      });

      const result = await studentRepository.findBySection(1, 1, {
        page: 3,
        limit: 5,
        status: 'active'
      });

      expect(Student.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            class_id: 1,
            section_id: 1,
            status: 'active'
          }),
          limit: 5,
          offset: 10
        })
      );
      expect(result.students).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(3);
    });
  });

  describe('create', () => {
    it('should create student with person and user', async () => {
      const studentData = {
        admission_number: 'ADM002',
        class_id: 1,
        section_id: 1,
        school_id: 1,
        branch_id: 1
      };
      const personData = {
        first_name: 'Jane',
        last_name: 'Smith',
        gender: 'female',
        date_of_birth: '2011-08-20'
      };
      const userData = {
        email: 'jane@example.com',
        password: 'hashed_password',
        role_id: 2
      };

      const mockCreatedPerson = { id: 2, ...personData };
      const mockCreatedUser = { id: 2, ...userData, person_id: 2 };
      const mockCreatedStudent = { id: 2, ...studentData, person_id: 2 };

      const mockSequelize = {
        transaction: jest.fn().mockImplementation(async (callback) => {
          const mockTransaction = {
            commit: jest.fn(),
            rollback: jest.fn()
          };
          await callback(mockTransaction);
          return mockTransaction;
        })
      };

      Person.create = jest.fn().mockResolvedValue(mockCreatedPerson);
      User.create = jest.fn().mockResolvedValue(mockCreatedUser);
      Student.create = jest.fn().mockResolvedValue(mockCreatedStudent);
      Student.findOne = jest.fn().mockResolvedValue({
        ...mockCreatedStudent,
        person: mockCreatedPerson
      });
      
      // Mock sequelize instance
      Student.sequelize = mockSequelize;

      const result = await studentRepository.create(studentData, personData, userData);

      expect(Person.create).toHaveBeenCalled();
      expect(User.create).toHaveBeenCalled();
      expect(Student.create).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const studentData = { admission_number: 'ADM003', school_id: 1, branch_id: 1 };
      const personData = { first_name: 'Test', last_name: 'User' };

      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn()
      };

      const mockSequelize = {
        transaction: jest.fn().mockImplementation(async (callback) => {
          try {
            await callback(mockTransaction);
          } catch (error) {
            await mockTransaction.rollback();
            throw error;
          }
        })
      };

      Person.create = jest.fn().mockRejectedValue(new Error('Create failed'));
      Student.sequelize = mockSequelize;

      await expect(studentRepository.create(studentData, personData))
        .rejects
        .toThrow('Create failed');
    });
  });

  describe('update', () => {
    it('should update student and person data', async () => {
      const updateStudentData = { roll_number: 20 };
      const updatePersonData = { phone: '9999999999' };

      const mockUpdatedStudent = {
        ...mockStudent,
        ...updateStudentData,
        update: jest.fn(),
        person: {
          ...mockPerson,
          update: jest.fn()
        }
      };

      Student.findOne = jest.fn().mockResolvedValue(mockUpdatedStudent);

      const result = await studentRepository.update(1, updateStudentData, updatePersonData);

      expect(Student.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 1 },
        include: expect.any(Array),
        transaction: expect.any(Object)
      }));
      expect(mockUpdatedStudent.update).toHaveBeenCalledWith(
        updateStudentData,
        expect.objectContaining({ transaction: expect.any(Object) })
      );
      expect(mockUpdatedStudent.person.update).toHaveBeenCalledWith(
        updatePersonData,
        expect.objectContaining({ transaction: expect.any(Object) })
      );
    });

    it('should throw error when student not found', async () => {
      Student.findOne = jest.fn().mockResolvedValue(null);

      await expect(studentRepository.update(999, {}))
        .rejects
        .toThrow(new AppError('Student not found', 404));
    });
  });

  describe('delete', () => {
    it('should soft delete student', async () => {
      const mockStudentWithDelete = {
        ...mockStudent,
        destroy: jest.fn().mockResolvedValue(true)
      };

      Student.findOne = jest.fn().mockResolvedValue(mockStudentWithDelete);

      const result = await studentRepository.delete(1);

      expect(Student.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
      expect(mockStudentWithDelete.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when student not found', async () => {
      Student.findOne = jest.fn().mockResolvedValue(null);

      const result = await studentRepository.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors in findAll', async () => {
      Student.findAndCountAll = jest.fn().mockRejectedValue(new Error('DB Error'));

      await expect(studentRepository.findAll({}))
        .rejects
        .toThrow('DB Error');
    });

    it('should handle database errors in findById', async () => {
      Student.findOne = jest.fn().mockRejectedValue(new Error('DB Error'));

      await expect(studentRepository.findById(1))
        .rejects
        .toThrow('DB Error');
    });
  });
});
