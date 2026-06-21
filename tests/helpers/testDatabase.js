/**
 * Test Database Helper
 * Provides SQLite in-memory database for testing
 */

const { Sequelize } = require('sequelize');

// Create SQLite in-memory sequelize instance
const createTestDatabase = () => {
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false, // Set to console.log to debug SQL queries
    define: {
      timestamps: true,
      paranoid: true, // Soft deletes
      underscored: true
    }
  });

  return sequelize;
};

// Initialize models with test database
const initializeModels = async (sequelize) => {
  // Import all models with DataTypes
  const User = require('../../src/models/User')(sequelize, Sequelize.DataTypes);
  const Role = require('../../src/models/Role')(sequelize, Sequelize.DataTypes);
  const Person = require('../../src/models/Person')(sequelize, Sequelize.DataTypes);
  const Student = require('../../src/models/Student')(sequelize, Sequelize.DataTypes);
  const Teacher = require('../../src/models/Teacher')(sequelize, Sequelize.DataTypes);
  const Parent = require('../../src/models/Parent')(sequelize, Sequelize.DataTypes);
  const Class = require('../../src/models/Class')(sequelize, Sequelize.DataTypes);
  const Subject = require('../../src/models/Subject')(sequelize, Sequelize.DataTypes);
  const AcademicYear = require('../../src/models/AcademicYear')(sequelize, Sequelize.DataTypes);
  const Section = require('../../src/models/Section')(sequelize, Sequelize.DataTypes);

  // Define associations (replicate your model associations)
  // User associations
  User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
  User.belongsTo(Person, { foreignKey: 'person_id', as: 'person' });

  // Person associations
  Person.hasOne(User, { foreignKey: 'person_id', as: 'user' });
  Person.hasOne(Student, { foreignKey: 'person_id', as: 'student' });
  Person.hasOne(Teacher, { foreignKey: 'person_id', as: 'teacher' });
  Person.hasOne(Parent, { foreignKey: 'person_id', as: 'parent' });

  // Student associations
  Student.belongsTo(Person, { foreignKey: 'person_id', as: 'person' });
  Student.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
  Student.belongsTo(Parent, { foreignKey: 'parent_id', as: 'parent' });

  // Teacher associations
  Teacher.belongsTo(Person, { foreignKey: 'person_id', as: 'person' });

  // Parent associations
  Parent.belongsTo(Person, { foreignKey: 'person_id', as: 'person' });
  Parent.hasMany(Student, { foreignKey: 'parent_id', as: 'children' });

  // Class associations
  Class.belongsTo(AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
  Class.belongsTo(Section, { foreignKey: 'section_id', as: 'section' });
  Class.hasMany(Student, { foreignKey: 'class_id', as: 'students' });

  // Subject associations
  Subject.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
  Subject.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });

  // Sync all models
  await sequelize.sync({ force: true });

  return {
    sequelize,
    User,
    Role,
    Person,
    Student,
    Teacher,
    Parent,
    Class,
    Subject,
    AcademicYear,
    Section
  };
};

// Seed basic data for tests
const seedBasicData = async (models) => {
  const { Role, AcademicYear, Section } = models;

  // Create roles
  const roles = await Role.bulkCreate([
    { id: 1, name: 'admin', description: 'Administrator' },
    { id: 2, name: 'student', description: 'Student' },
    { id: 3, name: 'parent', description: 'Parent' },
    { id: 4, name: 'teacher', description: 'Teacher' },
    { id: 5, name: 'accounts', description: 'Accounts' },
    { id: 6, name: 'librarian', description: 'Librarian' },
    { id: 7, name: 'examiner', description: 'Examiner' },
    { id: 8, name: 'transport', description: 'Transport' },
    { id: 9, name: 'hostel', description: 'Hostel' },
    { id: 10, name: 'management', description: 'Management' }
  ]);

  // Create academic years
  const academicYears = await AcademicYear.bulkCreate([
    { id: 1, name: '2024-2025', start_date: '2024-04-01', end_date: '2025-03-31', is_current: true },
    { id: 2, name: '2025-2026', start_date: '2025-04-01', end_date: '2026-03-31', is_current: false }
  ]);

  // Create sections
  const sections = await Section.bulkCreate([
    { id: 1, name: 'A', description: 'Section A' },
    { id: 2, name: 'B', description: 'Section B' },
    { id: 3, name: 'C', description: 'Section C' }
  ]);

  return { roles, academicYears, sections };
};

// Clear all data from database
const clearDatabase = async (sequelize) => {
  const models = sequelize.models;
  for (const modelName in models) {
    await models[modelName].destroy({ where: {}, force: true });
  }
};

// Reset database to initial state
const resetDatabase = async (sequelize) => {
  await clearDatabase(sequelize);
  await sequelize.sync({ force: true });
};

// Close database connection
const closeDatabase = async (sequelize) => {
  await sequelize.close();
};

module.exports = {
  createTestDatabase,
  initializeModels,
  seedBasicData,
  clearDatabase,
  resetDatabase,
  closeDatabase
};
