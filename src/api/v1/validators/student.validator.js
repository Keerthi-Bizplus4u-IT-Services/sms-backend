const { body, param, query } = require('express-validator');

/**
 * Student Validators
 */

const createStudentValidator = [
  body('aadhar')
    .custom((value, { req }) => {
      const hasAadharFile = Boolean(req.files?.aadhar?.[0]);
      const hasAadharUrl = Boolean(req.body?.person?.aadhar_url);
      if (!hasAadharFile && !hasAadharUrl) {
        throw new Error('Aadhar document is required');
      }
      return true;
    }),

  // Person fields
  body('person.first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),

  body('person.last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),

  body('person.gender')
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid gender value'),

  body('person.date_of_birth')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Invalid date format'),

  body('person.phone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone must be 10 digits'),

  body('person.email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email address'),

  body('person.blood_group')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood group'),

  body('person.father_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Father name must not exceed 100 characters'),

  body('person.mother_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Mother name must not exceed 100 characters'),

  body('person.guardian_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Guardian name must not exceed 100 characters'),

  body('person.nationality')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Nationality must not exceed 50 characters'),

  body('person.caste')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Caste must not exceed 50 characters'),

  body('person.category')
    .optional()
    .isIn(['general', 'obc', 'sc', 'st', 'ews'])
    .withMessage('Invalid category value'),

  // Student fields
  body('student.admission_number')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Admission number must be between 3 and 50 characters'),

  body('student.apar_id')
    .trim()
    .notEmpty()
    .withMessage('APAR ID is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('APAR ID must be between 3 and 50 characters'),

  body('student.class_id')
    .notEmpty()
    .withMessage('Class is required')
    .isInt({ min: 1 })
    .withMessage('Invalid class ID'),

  body('student.section_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid section ID'),

  body('student.branch_id')
    .notEmpty()
    .withMessage('Branch is required')
    .isInt({ min: 1 })
    .withMessage('Invalid branch ID'),

  body('student.school_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid school ID'),

  body('student.admission_date')
    .notEmpty()
    .withMessage('Admission date is required')
    .isISO8601()
    .withMessage('Invalid date format'),

  body('student.status')
    .optional()
    .isIn(['active', 'inactive', 'transferred', 'graduated', 'suspended'])
    .withMessage('Invalid status value')
];

const updateStudentValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid student ID'),

  body('person.first_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),

  body('person.last_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),

  body('person.gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid gender value'),

  body('person.phone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone must be 10 digits'),

  body('person.email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email address'),

  body('person.father_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Father name must not exceed 100 characters'),

  body('person.mother_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Mother name must not exceed 100 characters'),

  body('person.guardian_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Guardian name must not exceed 100 characters'),

  body('person.nationality')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Nationality must not exceed 50 characters'),

  body('person.caste')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Caste must not exceed 50 characters'),

  body('person.category')
    .optional()
    .isIn(['general', 'obc', 'sc', 'st', 'ews'])
    .withMessage('Invalid category value'),

  body('student.class_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid class ID'),

  body('student.section_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid section ID'),

  body('student.branch_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid branch ID'),

  body('student.school_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid school ID'),

  body('student.status')
    .optional()
    .isIn(['active', 'inactive', 'transferred', 'graduated', 'suspended'])
    .withMessage('Invalid status value')
];

const getStudentsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('classId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid class ID'),

  query('sectionId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid section ID'),

  query('branchId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid branch ID'),

  query('status')
    .optional()
    .isIn(['active', 'inactive', 'transferred', 'graduated', 'suspended'])
    .withMessage('Invalid status value')
];

const getAdmissionRollSuggestionValidator = [
  query('classId')
    .isInt({ min: 1 })
    .withMessage('Invalid class ID'),
  query('sectionId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid section ID')
];

const studentIdValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid student ID')
];

const promoteStudentsValidator = [
  body('fromAcademicYearId')
    .isInt({ min: 1 })
    .withMessage('Invalid source academic year'),
  body('toAcademicYearId')
    .isInt({ min: 1 })
    .withMessage('Invalid destination academic year')
    .custom((value, { req }) => {
      if (parseInt(value, 10) === parseInt(req.body.fromAcademicYearId, 10)) {
        throw new Error('Source and destination academic year cannot be the same');
      }
      return true;
    }),
  body('fromClassId')
    .isInt({ min: 1 })
    .withMessage('Invalid source class'),
  body('toClassId')
    .isInt({ min: 1 })
    .withMessage('Invalid destination class')
    .custom((value, { req }) => {
      if (parseInt(value, 10) === parseInt(req.body.fromClassId, 10)) {
        throw new Error('Source and destination class cannot be the same');
      }
      return true;
    }),
  body('studentIds')
    .optional()
    .isArray({ min: 1 })
    .withMessage('studentIds must be an array of student IDs'),
  body('studentIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Each studentId must be a positive integer')
];

const studentsByClassValidator = [
  param('classId')
    .isInt({ min: 1 })
    .withMessage('Invalid class ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'transferred', 'graduated', 'suspended'])
    .withMessage('Invalid status value'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search cannot be empty')
];

const studentsBySectionValidator = [
  param('classId')
    .isInt({ min: 1 })
    .withMessage('Invalid class ID'),
  param('sectionId')
    .isInt({ min: 1 })
    .withMessage('Invalid section ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'transferred', 'graduated', 'suspended'])
    .withMessage('Invalid status value'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search cannot be empty')
];

module.exports = {
  createStudentValidator,
  updateStudentValidator,
  getStudentsValidator,
  getAdmissionRollSuggestionValidator,
  studentIdValidator,
  promoteStudentsValidator,
  studentsByClassValidator,
  studentsBySectionValidator
};
