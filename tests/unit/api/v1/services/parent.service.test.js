/**
 * Unit Tests for Parent Service
 * Tests parent CRUD operations, validation, and business logic
 */

// Mock the repository before loading dependent modules
jest.mock('../../../../../src/api/v1/repositories/parent.repository');

const parentService = require('../../../../../src/api/v1/services/parent.service');
const parentRepository = require('../../../../../src/api/v1/repositories/parent.repository');
const { AppError } = require('../../../../../src/middleware/error.middleware');

describe('ParentService', () => {
  let mockParent;
  let mockPerson;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPerson = {
      id: 1,
      first_name: 'Robert',
      last_name: 'Williams',
      gender: 'male',
      date_of_birth: '1980-11-05',
      email: 'robert.williams@example.com',
      phone: '9123456780',
      address: '789 Family Lane',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001'
    };

    mockParent = {
      id: 1,
      person_id: 1,
      relationship_type: 'father',
      occupation: 'Software Engineer',
      annual_income: 1200000,
      emergency_contact: '9876543210',
      person: mockPerson
    };
  });

  describe('getParents', () => {
    it('should retrieve all parents with filters', async () => {
      const filters = { page: 1, limit: 10 };
      const mockResult = {
        parents: [mockParent],
        total: 1,
        page: 1,
        totalPages: 1
      };
      parentRepository.findAll.mockResolvedValue(mockResult);

      const result = await parentService.getParents(filters);

      expect(parentRepository.findAll).toHaveBeenCalledWith(filters);
      expect(result.total).toBe(1);
      expect(result.parents).toHaveLength(1);
    });

    it('should retrieve parents with relationship filter', async () => {
      const filters = { relationship_type: 'father', page: 1, limit: 10 };
      const mockResult = {
        parents: [mockParent],
        total: 1,
        page: 1,
        totalPages: 1
      };
      parentRepository.findAll.mockResolvedValue(mockResult);

      const result = await parentService.getParents(filters);

      expect(parentRepository.findAll).toHaveBeenCalledWith(filters);
      expect(result.parents[0].relationshipType).toBe('father');
    });

    it('should handle empty results', async () => {
      const mockResult = {
        parents: [],
        total: 0,
        page: 1,
        totalPages: 0
      };
      parentRepository.findAll.mockResolvedValue(mockResult);

      const result = await parentService.getParents({});

      expect(result.parents).toHaveLength(0);
    });

    it('should handle pagination', async () => {
      const filters = { page: 2, limit: 15 };
      const mockResult = {
        parents: [mockParent],
        total: 30,
        page: 2,
        totalPages: 2
      };
      parentRepository.findAll.mockResolvedValue(mockResult);

      const result = await parentService.getParents(filters);

      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(2);
    });
  });

  describe('getParentById', () => {
    it('should retrieve parent by valid ID', async () => {
      parentRepository.findById.mockResolvedValue(mockParent);

      const result = await parentService.getParentById(1);

      expect(parentRepository.findById).toHaveBeenCalledWith(1);
      expect(result.relationshipType).toBe('father');
      expect(result.firstName).toBe('Robert');
    });

    it('should return null when parent not found', async () => {
      parentRepository.findById.mockResolvedValue(null);

      const result = await parentService.getParentById(999);

      expect(result).toBeNull();
    });

    it('should include normalized person details', async () => {
      parentRepository.findById.mockResolvedValue(mockParent);

      const result = await parentService.getParentById(1);

      expect(result.email).toBe(mockPerson.email);
      expect(result.city).toBe(mockPerson.city);
    });

    it('should fall back to office phone when person phone missing', async () => {
      const parentWithOfficePhone = {
        ...mockParent,
        person: { ...mockPerson, phone: null },
        office_phone: '1234567890'
      };
      parentRepository.findById.mockResolvedValue(parentWithOfficePhone);

      const result = await parentService.getParentById(1);

      expect(result.phone).toBe('1234567890');
    });
  });

  describe('createParent', () => {
    const validData = {
      person: {
        first_name: 'Mary',
        last_name: 'Johnson',
        gender: 'female',
        date_of_birth: '1982-04-18',
        email: 'mary@example.com',
        phone: '9876543211'
      },
      parent: {
        relationship_type: 'mother',
        occupation: 'Teacher',
        annual_income: 800000
      }
    };

    it('should successfully create parent with valid data', async () => {
      parentRepository.create.mockResolvedValue({ ...mockParent, id: 2 });

      const result = await parentService.createParent(validData);

      expect(parentRepository.create).toHaveBeenCalledWith(
        validData.parent,
        validData.person,
        undefined
      );
      expect(result.id).toBe(2);
    });

    it('should throw error when person first name is missing', async () => {
      const invalidData = {
        ...validData,
        person: { ...validData.person, first_name: '' }
      };

      await expect(parentService.createParent(invalidData))
        .rejects
        .toThrow(new AppError('Person details are incomplete', 400));
    });

    it('should throw error when person last name is missing', async () => {
      const invalidData = {
        ...validData,
        person: { ...validData.person, last_name: null }
      };

      await expect(parentService.createParent(invalidData))
        .rejects
        .toThrow(new AppError('Person details are incomplete', 400));
    });

    it('should throw error when date of birth is missing', async () => {
      const invalidData = {
        ...validData,
        person: { ...validData.person, date_of_birth: undefined }
      };

      await expect(parentService.createParent(invalidData))
        .rejects
        .toThrow(new AppError('Person details are incomplete', 400));
    });

    it('should throw error when gender is missing', async () => {
      const invalidData = {
        ...validData,
        person: { ...validData.person, gender: '' }
      };

      await expect(parentService.createParent(invalidData))
        .rejects
        .toThrow(new AppError('Person details are incomplete', 400));
    });

    it('should throw error when relationship type is missing', async () => {
      const invalidData = {
        ...validData,
        parent: { ...validData.parent, relationship_type: '' }
      };

      await expect(parentService.createParent(invalidData))
        .rejects
        .toThrow(new AppError('Relationship type is required', 400));
    });

    it('should create parent with valid relationship types', async () => {
      const relationships = ['father', 'mother', 'guardian'];
      
      for (const relationship of relationships) {
        const data = {
          ...validData,
          parent: { ...validData.parent, relationship_type: relationship }
        };
        parentRepository.create.mockResolvedValue({ ...mockParent, relationship_type: relationship });

        const result = await parentService.createParent(data);

      expect(result.relationshipType).toBe(relationship);
      }
    });

    it('should create parent with optional user data', async () => {
      const dataWithUser = {
        ...validData,
        user: {
          email: 'mary@example.com',
          password: 'Password123!',
          role_id: 3
        }
      };
      parentRepository.create.mockResolvedValue(mockParent);

      await parentService.createParent(dataWithUser);

      expect(parentRepository.create).toHaveBeenCalledWith(
        dataWithUser.parent,
        dataWithUser.person,
        dataWithUser.user
      );
    });

    it('should create parent with optional fields', async () => {
      const dataWithOptional = {
        ...validData,
        parent: {
          ...validData.parent,
          emergency_contact: '9999999999',
          annual_income: 1500000
        }
      };
      parentRepository.create.mockResolvedValue(mockParent);

      const result = await parentService.createParent(dataWithOptional);

      expect(result).toBeDefined();
    });
  });

  describe('updateParent', () => {
    const updateData = {
      parent: {
        occupation: 'Business Owner',
        annual_income: 2000000
      },
      person: {
        phone: '8888888888',
        email: 'updated@example.com'
      }
    };

    it('should successfully update parent', async () => {
      const updatedParent = { ...mockParent, ...updateData.parent };
      parentRepository.update.mockResolvedValue(updatedParent);

      const result = await parentService.updateParent(1, updateData);

      expect(parentRepository.update).toHaveBeenCalledWith(1, updateData.parent, updateData.person);
      expect(result.occupation).toBe('Business Owner');
      expect(result.annualIncome).toBe(2000000);
    });

    it('should update only parent data', async () => {
      const parentOnlyData = {
        parent: { occupation: 'Engineer' }
      };
      parentRepository.update.mockResolvedValue(mockParent);

      await parentService.updateParent(1, parentOnlyData);

      expect(parentRepository.update).toHaveBeenCalledWith(1, parentOnlyData.parent, undefined);
    });

    it('should update only person data', async () => {
      const personOnlyData = {
        person: { phone: '7777777777' }
      };
      parentRepository.update.mockResolvedValue(mockParent);

      await parentService.updateParent(1, personOnlyData);

      expect(parentRepository.update).toHaveBeenCalledWith(1, undefined, personOnlyData.person);
    });

    it('should update relationship type', async () => {
      const updateRelationship = {
        parent: { relationship_type: 'guardian' }
      };
      const updatedParent = { ...mockParent, relationship_type: 'guardian' };
      parentRepository.update.mockResolvedValue(updatedParent);

      const result = await parentService.updateParent(1, updateRelationship);

      expect(result.relationshipType).toBe('guardian');
    });
  });

  describe('linkStudentToParent', () => {
    it('should normalize and link a student to an existing parent', async () => {
      const linkedParent = {
        ...mockParent,
        student_names: ['Kid One', 'Kid Two']
      };
      parentRepository.linkStudent.mockResolvedValue(linkedParent);

      const result = await parentService.linkStudentToParent(
        1,
        6,
        {
          relationshipType: 'father',
          isPrimaryContact: 'true',
          isEmergencyContact: 'false'
        },
        { schoolId: 1 }
      );

      expect(parentRepository.linkStudent).toHaveBeenCalledWith(
        1,
        6,
        {
          relationship_type: 'father',
          is_primary_contact: true,
          is_emergency_contact: false
        },
        { schoolId: 1 }
      );
      expect(result.studentNames).toEqual(['Kid One', 'Kid Two']);
    });

    it('should require relationship type when linking a student', async () => {
      await expect(parentService.linkStudentToParent(1, 6, {}, { schoolId: 1 }))
        .rejects
        .toThrow(new AppError('Relationship type is required', 400));
    });
  });

  describe('deleteParent', () => {
    it('should successfully delete parent', async () => {
      parentRepository.delete.mockResolvedValue(true);

      const result = await parentService.deleteParent(1);

      expect(parentRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should return false when parent not found', async () => {
      parentRepository.delete.mockResolvedValue(false);

      const result = await parentService.deleteParent(999);

      expect(result).toBe(false);
    });

    it('should perform soft delete', async () => {
      parentRepository.delete.mockResolvedValue(true);

      await parentService.deleteParent(1);

      expect(parentRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('Error handling', () => {
    it('should propagate repository errors', async () => {
      const dbError = new Error('Database connection failed');
      parentRepository.findAll.mockRejectedValue(dbError);

      await expect(parentService.getParents({}))
        .rejects
        .toThrow('Database connection failed');
    });

    it('should handle repository errors during create', async () => {
      const validData = {
        person: {
          first_name: 'Test',
          last_name: 'User',
          gender: 'male',
          date_of_birth: '1980-01-01'
        },
        parent: {
          relationship_type: 'father'
        }
      };
      parentRepository.create.mockRejectedValue(new Error('Create failed'));

      await expect(parentService.createParent(validData))
        .rejects
        .toThrow('Create failed');
    });

    it('should handle repository errors during update', async () => {
      const updateData = {
        parent: { occupation: 'Test' }
      };
      parentRepository.update.mockRejectedValue(new Error('Update failed'));

      await expect(parentService.updateParent(1, updateData))
        .rejects
        .toThrow('Update failed');
    });
  });
});
