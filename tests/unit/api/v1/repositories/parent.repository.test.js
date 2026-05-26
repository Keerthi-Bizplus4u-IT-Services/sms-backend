jest.mock('../../../../../src/models');
jest.mock('../../../../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn()
  }
}));
jest.mock('../../../../../src/api/v1/repositories/helpers/schema.utils', () => ({
  resolveTableName: jest.fn()
}));

const parentRepository = require('../../../../../src/api/v1/repositories/parent.repository');
const { Parent, Person, User, Student } = require('../../../../../src/models');
const { sequelize } = require('../../../../../src/config/database');
const { resolveTableName } = require('../../../../../src/api/v1/repositories/helpers/schema.utils');

describe('ParentRepository.create', () => {
  let transaction;

  beforeEach(() => {
    jest.clearAllMocks();

    transaction = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined)
    };

    sequelize.transaction.mockResolvedValue(transaction);
    sequelize.query = jest.fn();
    Parent.findOne = jest.fn();
    Parent.create = jest.fn();
    Parent.findByPk = jest.fn();
    Person.create = jest.fn();
    User.create = jest.fn();
    Student.findAll = jest.fn();
    Student.findOne = jest.fn();
  });

  it('reuses an existing parent when the same id_number is submitted', async () => {
    const existingParent = {
      id: 42,
      update: jest.fn().mockResolvedValue(undefined),
      person: {
        update: jest.fn().mockResolvedValue(undefined)
      }
    };
    const resolvedParent = { id: 42, person: { first_name: 'Mary' } };

    Parent.findOne.mockResolvedValue(existingParent);
    jest.spyOn(parentRepository, 'findById').mockResolvedValue(resolvedParent);

    const result = await parentRepository.create(
      { relationship_type: 'mother', occupation: 'Teacher' },
      {
        first_name: 'Mary',
        last_name: 'Johnson',
        date_of_birth: '1982-04-18',
        gender: 'female',
        phone: '9876543211',
        id_number: '123456789012'
      }
    );

    expect(Parent.findOne).toHaveBeenCalled();
    expect(Person.create).not.toHaveBeenCalled();
    expect(Parent.create).not.toHaveBeenCalled();
    expect(existingParent.update).toHaveBeenCalledWith(
      expect.objectContaining({ relationship_type: 'mother', occupation: 'Teacher' }),
      { transaction }
    );
    expect(existingParent.person.update).toHaveBeenCalledWith(
      expect.objectContaining({ id_number: '123456789012', phone: '9876543211' }),
      { transaction }
    );
    expect(transaction.commit).toHaveBeenCalled();
    expect(result).toBe(resolvedParent);
  });

  it('creates a new parent when no existing identity matches', async () => {
    const createdParent = { id: 7 };
    const resolvedParent = { id: 7, person: { first_name: 'Anita' } };

    Parent.findOne.mockResolvedValue(null);
    Person.create.mockResolvedValue({ id: 11 });
    Parent.create.mockResolvedValue(createdParent);
    jest.spyOn(parentRepository, 'findById').mockResolvedValue(resolvedParent);

    const result = await parentRepository.create(
      { relationship_type: 'mother', occupation: 'Doctor' },
      {
        first_name: 'Anita',
        last_name: 'Shah',
        date_of_birth: '1985-05-09',
        gender: 'female',
        phone: '9988776655',
        id_number: '999988887777'
      }
    );

    expect(Person.create).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: 'Anita',
        last_name: 'Shah',
        id_number: '999988887777'
      }),
      { transaction }
    );
    expect(Parent.create).toHaveBeenCalledWith(
      expect.objectContaining({ relationship_type: 'mother', person_id: 11 }),
      { transaction }
    );
    expect(transaction.commit).toHaveBeenCalled();
    expect(result).toBe(resolvedParent);
  });

  it('creates a new student-parent link when one does not exist', async () => {
    resolveTableName.mockResolvedValue('student_parents');
    Parent.findByPk.mockResolvedValue({ id: 3 });
    Student.findOne.mockResolvedValue({ id: 8 });
    sequelize.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const resolvedParent = { id: 3, student_names: ['Kid One'] };
    jest.spyOn(parentRepository, 'findById').mockResolvedValue(resolvedParent);

    const result = await parentRepository.linkStudent(
      3,
      8,
      {
        relationship_type: 'father',
        is_primary_contact: true,
        is_emergency_contact: false
      },
      { schoolId: 1 }
    );

    expect(resolveTableName).toHaveBeenCalledWith(['student_parents']);
    expect(Student.findOne).toHaveBeenCalledWith({
      where: { id: 8, school_id: 1 },
      transaction,
      attributes: ['id']
    });
    expect(sequelize.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO "student_parents"'),
      expect.objectContaining({
        replacements: expect.objectContaining({
          studentId: 8,
          parentId: 3,
          relationshipType: 'father',
          isPrimaryContact: true,
          isEmergencyContact: false
        }),
        transaction
      })
    );
    expect(transaction.commit).toHaveBeenCalled();
    expect(result).toBe(resolvedParent);
  });

  it('updates an existing student-parent link when one already exists', async () => {
    resolveTableName.mockResolvedValue('student_parents');
    Parent.findByPk.mockResolvedValue({ id: 3 });
    Student.findOne.mockResolvedValue({ id: 8 });
    sequelize.query
      .mockResolvedValueOnce([{ id: 99, relationship_type: 'guardian', is_primary_contact: false, is_emergency_contact: true }])
      .mockResolvedValueOnce([]);
    const resolvedParent = { id: 3, student_names: ['Kid One'] };
    jest.spyOn(parentRepository, 'findById').mockResolvedValue(resolvedParent);

    const result = await parentRepository.linkStudent(
      3,
      8,
      {
        relationship_type: 'mother',
        is_primary_contact: true
      },
      { schoolId: 1 }
    );

    expect(sequelize.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE "student_parents"'),
      expect.objectContaining({
        replacements: expect.objectContaining({
          id: 99,
          relationshipType: 'mother',
          isPrimaryContact: true,
          isEmergencyContact: true
        }),
        transaction
      })
    );
    expect(transaction.commit).toHaveBeenCalled();
    expect(result).toBe(resolvedParent);
  });
});