/**
 * Mock Data Generator
 * Uses Faker to generate test data
 */

const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

/**
 * Generate mock Person data
 */
const generatePerson = (overrides = {}) => ({
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  gender: faker.helpers.arrayElement(['male', 'female', 'other']),
  date_of_birth: faker.date.birthdate({ min: 5, max: 60, mode: 'age' }),
  email: faker.internet.email().toLowerCase(),
  phone: faker.phone.number('##########'),
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  state: faker.location.state(),
  pincode: faker.location.zipCode('######'),
  photo: faker.image.avatar(),
  ...overrides
});

/**
 * Generate mock Student data
 */
const generateStudent = (overrides = {}) => ({
  admission_number: `ADM${faker.string.numeric(6)}`,
  admission_date: faker.date.past({ years: 5 }),
  roll_number: faker.number.int({ min: 1, max: 100 }),
  class_id: faker.number.int({ min: 1, max: 12 }),
  academic_year_id: faker.number.int({ min: 1, max: 2 }),
  parent_id: null,
  blood_group: faker.helpers.arrayElement(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']),
  medical_conditions: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }),
  previous_school: faker.helpers.maybe(() => faker.company.name(), { probability: 0.5 }),
  status: 'active',
  ...overrides
});

/**
 * Generate mock Teacher data
 */
const generateTeacher = (overrides = {}) => ({
  employee_id: `EMP${faker.string.numeric(6)}`,
  joining_date: faker.date.past({ years: 10 }),
  qualification: faker.helpers.arrayElement(['B.Ed', 'M.Ed', 'B.Sc', 'M.Sc', 'PhD']),
  specialization: faker.helpers.arrayElement(['Mathematics', 'Science', 'English', 'History', 'Geography']),
  experience_years: faker.number.int({ min: 0, max: 30 }),
  salary: faker.number.int({ min: 25000, max: 100000 }),
  department: faker.helpers.arrayElement(['Primary', 'Secondary', 'Higher Secondary']),
  designation: faker.helpers.arrayElement(['Teacher', 'Senior Teacher', 'Head Teacher', 'Principal']),
  status: 'active',
  ...overrides
});

/**
 * Generate mock Parent data
 */
const generateParent = (overrides = {}) => ({
  occupation: faker.person.jobTitle(),
  annual_income: faker.number.int({ min: 200000, max: 2000000 }),
  relationship: faker.helpers.arrayElement(['father', 'mother', 'guardian']),
  emergency_contact: faker.phone.number('##########'),
  ...overrides
});

/**
 * Generate mock Class data
 */
const generateClass = (overrides = {}) => ({
  name: `Class ${faker.number.int({ min: 1, max: 12 })}`,
  academic_year_id: faker.number.int({ min: 1, max: 2 }),
  section_id: faker.number.int({ min: 1, max: 3 }),
  capacity: faker.number.int({ min: 30, max: 60 }),
  room_number: `R-${faker.string.numeric(3)}`,
  ...overrides
});

/**
 * Generate mock Subject data
 */
const generateSubject = (overrides = {}) => ({
  name: faker.helpers.arrayElement(['Mathematics', 'Science', 'English', 'History', 'Geography', 'Physics', 'Chemistry', 'Biology']),
  code: `SUB${faker.string.numeric(3)}`,
  class_id: faker.number.int({ min: 1, max: 12 }),
  teacher_id: null,
  credits: faker.number.int({ min: 1, max: 6 }),
  description: faker.lorem.sentence(),
  ...overrides
});

/**
 * Generate mock User data
 */
const generateUser = async (overrides = {}) => {
  const password = overrides.password || 'Password123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  return {
    username: faker.internet.userName().toLowerCase(),
    email: faker.internet.email().toLowerCase(),
    password: hashedPassword,
    role_id: faker.number.int({ min: 1, max: 10 }),
    person_id: null,
    is_active: true,
    is_locked: false,
    login_attempts: 0,
    last_login: null,
    ...overrides,
    plainPassword: password // For testing purposes
  };
};

/**
 * Generate mock Role data
 */
const generateRole = (overrides = {}) => ({
  name: faker.helpers.arrayElement(['admin', 'student', 'parent', 'teacher', 'accounts']),
  description: faker.lorem.sentence(),
  ...overrides
});

/**
 * Generate mock AcademicYear data
 */
const generateAcademicYear = (overrides = {}) => ({
  year: `${faker.date.future().getFullYear()}-${faker.date.future().getFullYear() + 1}`,
  start_date: faker.date.future(),
  end_date: faker.date.future(),
  is_current: faker.datatype.boolean(),
  ...overrides
});

/**
 * Generate mock Section data
 */
const generateSection = (overrides = {}) => ({
  name: faker.helpers.arrayElement(['A', 'B', 'C', 'D']),
  description: faker.lorem.sentence(),
  ...overrides
});

/**
 * Generate complete student with person
 */
const generateCompleteStudent = async (overrides = {}) => {
  const person = generatePerson(overrides.person || {});
  const student = generateStudent(overrides.student || {});
  return { person, student };
};

/**
 * Generate complete teacher with person
 */
const generateCompleteTeacher = async (overrides = {}) => {
  const person = generatePerson(overrides.person || {});
  const teacher = generateTeacher(overrides.teacher || {});
  return { person, teacher };
};

/**
 * Generate complete parent with person
 */
const generateCompleteParent = async (overrides = {}) => {
  const person = generatePerson(overrides.person || {});
  const parent = generateParent(overrides.parent || {});
  return { person, parent };
};

/**
 * Generate complete user with person and role
 */
const generateCompleteUser = async (overrides = {}) => {
  const person = generatePerson(overrides.person || {});
  const user = await generateUser(overrides.user || {});
  return { person, user };
};

/**
 * Generate array of entities
 */
const generateMultiple = async (generator, count = 5, overrides = {}) => {
  const items = [];
  for (let i = 0; i < count; i++) {
    const item = typeof generator === 'function' 
      ? await generator(overrides) 
      : generator(overrides);
    items.push(item);
  }
  return items;
};

module.exports = {
  generatePerson,
  generateStudent,
  generateTeacher,
  generateParent,
  generateClass,
  generateSubject,
  generateUser,
  generateRole,
  generateAcademicYear,
  generateSection,
  generateCompleteStudent,
  generateCompleteTeacher,
  generateCompleteParent,
  generateCompleteUser,
  generateMultiple
};
