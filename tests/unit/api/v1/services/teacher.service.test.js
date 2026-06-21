/**
 * Unit Tests for Teacher Service
 * Tests teacher CRUD operations, validation, and business logic
 */

// Mock the repository before requiring modules that depend on it
jest.mock('../../../../../src/api/v1/repositories/teacher.repository');

const teacherService = require('../../../../../src/api/v1/services/teacher.service');
const teacherRepository = require('../../../../../src/api/v1/repositories/teacher.repository');
const { AppError } = require('../../../../../src/middleware/error.middleware');

describe('TeacherService', () => {
  const defaultContext = { schoolId: 1 };
  let mockTeacher;
  let mockPerson;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPerson = {
      id: 1,
      first_name: 'Sarah',
      last_name: 'Johnson',
      gender: 'female',
      date_of_birth: '1985-03-20',
      email: 'sarah.johnson@school.com',
      phone: '9876543210',
      address: '456 School Rd',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001'
    };

    mockTeacher = {
      id: 1,
      person_id: 1,
      employee_id: 'EMP001',
      join_date: '2020-06-15',
      qualification: 'M.Ed',
      specialization: 'Mathematics',
      experience_years: 5,
      salary: 50000,
      department: 'Secondary',
      designation: 'Senior Teacher',
      status: 'active',
      person: mockPerson
    };
  });

  describe('getTeachers', () => {
    it('should retrieve all teachers with filters', async () => {
      const filters = { page: 1, limit: 10 };
      const mockResult = {
        teachers: [mockTeacher],
        total: 1,
        page: 1,
        totalPages: 1
      };
      teacherRepository.findAll.mockResolvedValue(mockResult);

      const result = await teacherService.getTeachers(filters, defaultContext);

      expect(teacherRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          ...filters,
          schoolId: defaultContext.schoolId
        })
      );
      expect(result.total).toBe(1);
      expect(result.teachers).toHaveLength(1);
      expect(result.limit).toBe(10);
    });

    it('should retrieve teachers with department filter', async () => {
      const filters = { department: 'Secondary', page: 1, limit: 10 };
      const mockResult = {
        teachers: [mockTeacher],
        total: 1,
        page: 1,
        totalPages: 1
      };
      teacherRepository.findAll.mockResolvedValue(mockResult);

      const result = await teacherService.getTeachers(filters, defaultContext);

      expect(teacherRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          ...filters,
          schoolId: defaultContext.schoolId
        })
      );
      expect(result.teachers[0].designation).toBeDefined();
      expect(result.teachers[0].firstName).toBeTruthy();
    });

    it('should handle empty results', async () => {
      const mockResult = {
        teachers: [],
        total: 0,
        page: 1,
        totalPages: 0
      };
      teacherRepository.findAll.mockResolvedValue(mockResult);

      const result = await teacherService.getTeachers({}, defaultContext);

      expect(result.teachers).toHaveLength(0);
    });
  });

  describe('getTeacherById', () => {
    it('should retrieve teacher by valid ID', async () => {
      teacherRepository.findById.mockResolvedValue(mockTeacher);

      const result = await teacherService.getTeacherById(1, defaultContext);

      expect(teacherRepository.findById).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ schoolId: defaultContext.schoolId })
      );
      expect(result.employeeId).toBe(mockTeacher.employee_id);
      expect(result.firstName).toBe(mockTeacher.person.first_name);
    });

    it('should return null when teacher not found', async () => {
      teacherRepository.findById.mockResolvedValue(null);

      const result = await teacherService.getTeacherById(999, defaultContext);

      expect(result).toBeNull();
    });

    it('should include person details', async () => {
      teacherRepository.findById.mockResolvedValue(mockTeacher);

      const result = await teacherService.getTeacherById(1, defaultContext);

      expect(result.firstName).toBe('Sarah');
      expect(result.lastName).toBe('Johnson');
    });
  });

  describe('getTeacherByEmployeeId', () => {
    it('should retrieve teacher by employee ID', async () => {
      teacherRepository.findByEmployeeId.mockResolvedValue(mockTeacher);

      const result = await teacherService.getTeacherByEmployeeId('EMP001', defaultContext);

      expect(teacherRepository.findByEmployeeId).toHaveBeenCalledWith(
        'EMP001',
        expect.objectContaining({ schoolId: defaultContext.schoolId })
      );
      expect(result).toEqual(mockTeacher);
    });

    it('should throw error when teacher not found', async () => {
      teacherRepository.findByEmployeeId.mockResolvedValue(null);

      await expect(teacherService.getTeacherByEmployeeId('INVALID', defaultContext))
        .rejects
        .toThrow(new AppError('Teacher not found', 404));
    });
  });

  describe('createTeacher', () => {
    const validData = {
      person: {
        first_name: 'Michael',
        last_name: 'Brown',
        gender: 'male',
        date_of_birth: '1990-07-12',
        email: 'michael@school.com',
        phone: '8765432109'
      },
        teacher: {
          employee_id: 'EMP002',
          join_date: '2023-01-15',
          qualification: 'B.Ed',
          specialization: 'English',
          branch_id: 1
        }
      };

    it('should successfully create teacher with valid data', async () => {
      teacherRepository.findByEmployeeId.mockResolvedValue(null);
      teacherRepository.create.mockResolvedValue({ ...mockTeacher, employee_id: 'EMP002' });

      const result = await teacherService.createTeacher(validData, defaultContext);

      expect(teacherRepository.findByEmployeeId).toHaveBeenCalledWith(
        'EMP002',
        expect.objectContaining({ schoolId: defaultContext.schoolId })
      );
      expect(teacherRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validData.teacher,
          school_id: expect.any(Number)
        }),
        validData.person,
        null
      );
      expect(result.employeeId).toBe('EMP002');
    });

    it('should throw error when employee ID already exists', async () => {
      teacherRepository.findByEmployeeId.mockResolvedValue(mockTeacher);

      await expect(teacherService.createTeacher(validData, defaultContext))
        .rejects
        .toThrow(new AppError('Employee ID already exists', 409));
      
      expect(teacherRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when person first name is missing', async () => {
      const invalidData = {
        ...validData,
        person: { ...validData.person, first_name: '' }
      };
      teacherRepository.findByEmployeeId.mockResolvedValue(null);

      await expect(teacherService.createTeacher(invalidData, defaultContext))
        .rejects
        .toThrow(new AppError('Person details are incomplete', 400));
    });

    it('should throw error when person last name is missing', async () => {
      const invalidData = {
        ...validData,
        person: { ...validData.person, last_name: null }
      };
      teacherRepository.findByEmployeeId.mockResolvedValue(null);

      await expect(teacherService.createTeacher(invalidData, defaultContext))
        .rejects
        .toThrow(new AppError('Person details are incomplete', 400));
    });

    it('should throw error when date of birth is missing', async () => {
      const invalidData = {
        ...validData,
        person: { ...validData.person, date_of_birth: undefined }
      };
      teacherRepository.findByEmployeeId.mockResolvedValue(null);

      await expect(teacherService.createTeacher(invalidData, defaultContext))
        .rejects
        .toThrow(new AppError('Person details are incomplete', 400));
    });

    it('should throw error when gender is missing', async () => {
      const invalidData = {
        ...validData,
        person: { ...validData.person, gender: '' }
      };
      teacherRepository.findByEmployeeId.mockResolvedValue(null);

      await expect(teacherService.createTeacher(invalidData, defaultContext))
        .rejects
        .toThrow(new AppError('Person details are incomplete', 400));
    });

    it('should throw error when join_date is missing', async () => {
      const invalidData = {
        ...validData,
        teacher: { ...validData.teacher, join_date: '' }
      };
      teacherRepository.findByEmployeeId.mockResolvedValue(null);

      await expect(teacherService.createTeacher(invalidData, defaultContext))
        .rejects
        .toThrow(new AppError('Teacher details are incomplete', 400));
    });

    it('should create teacher with optional user data', async () => {
      const dataWithUser = {
        ...validData,
        user: {
          email: 'michael@school.com',
          password: 'Password123!',
          role_id: 4
        }
      };
      teacherRepository.findByEmployeeId.mockResolvedValue(null);
      teacherRepository.create.mockResolvedValue(mockTeacher);

      await teacherService.createTeacher(dataWithUser, defaultContext);

      expect(teacherRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...dataWithUser.teacher,
          school_id: expect.any(Number)
        }),
        dataWithUser.person,
        expect.objectContaining({ school_id: expect.any(Number) })
      );
    });
  });

  describe('updateTeacher', () => {
    const updateData = {
      teacher: {
        salary: 60000,
        designation: 'Head Teacher'
      },
      person: {
        phone: '9999999999'
      }
    };

    it('should successfully update teacher', async () => {
      const updatedTeacher = { ...mockTeacher, ...updateData.teacher };
      teacherRepository.update.mockResolvedValue(updatedTeacher);

      const result = await teacherService.updateTeacher(1, updateData, defaultContext);

      expect(teacherRepository.update).toHaveBeenCalledWith(
        1,
        updateData.teacher,
        updateData.person,
        expect.objectContaining({ schoolId: defaultContext.schoolId })
      );
      expect(result.salary).toBe(60000);
    });

    it('should check employee ID uniqueness when updating', async () => {
      const dataWithEmployeeId = {
        teacher: { employee_id: 'EMP003' },
        person: {}
      };
      teacherRepository.findByEmployeeId.mockResolvedValue(null);
      teacherRepository.update.mockResolvedValue(mockTeacher);

      await teacherService.updateTeacher(1, dataWithEmployeeId, defaultContext);

      expect(teacherRepository.findByEmployeeId).toHaveBeenCalledWith(
        'EMP003',
        expect.objectContaining({ schoolId: defaultContext.schoolId })
      );
    });

    it('should throw error when new employee ID already exists', async () => {
      const dataWithEmployeeId = {
        teacher: { employee_id: 'EMP002' },
        person: {}
      };
      const existingTeacher = { ...mockTeacher, id: 2, employee_id: 'EMP002' };
      teacherRepository.findByEmployeeId.mockResolvedValue(existingTeacher);

      await expect(teacherService.updateTeacher(1, dataWithEmployeeId, defaultContext))
        .rejects
        .toThrow(new AppError('Employee ID already exists', 409));
    });

    it('should allow updating same teacher with same employee ID', async () => {
      const dataWithEmployeeId = {
        teacher: { employee_id: 'EMP001' },
        person: {}
      };
      teacherRepository.findByEmployeeId.mockResolvedValue(mockTeacher);
      teacherRepository.update.mockResolvedValue(mockTeacher);

      const result = await teacherService.updateTeacher(1, dataWithEmployeeId, defaultContext);

      expect(result).toBeDefined();
    });
  });

  describe('deleteTeacher', () => {
    it('should successfully delete teacher', async () => {
      teacherRepository.delete.mockResolvedValue(true);

      const result = await teacherService.deleteTeacher(1, defaultContext);

      expect(teacherRepository.delete).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ schoolId: defaultContext.schoolId })
      );
      expect(result).toBe(true);
    });

    it('should return false when teacher not found', async () => {
      teacherRepository.delete.mockResolvedValue(false);

      const result = await teacherService.deleteTeacher(999, defaultContext);

      expect(result).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should propagate repository errors', async () => {
      const dbError = new Error('Database error');
      teacherRepository.findAll.mockRejectedValue(dbError);

      await expect(teacherService.getTeachers({}, defaultContext))
        .rejects
        .toThrow('Database error');
    });
  });
});
