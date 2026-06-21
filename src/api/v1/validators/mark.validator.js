const { body, query, param } = require('express-validator');

const getMarksValidator = [
  body('classId').optional().isInt({ min: 1 }).withMessage('Invalid class ID'),
  body('sectionId').optional().isInt({ min: 1 }).withMessage('Invalid section ID'),
  body('examId').optional().isInt({ min: 1 }).withMessage('Invalid exam ID'),
  body('subjectId').optional().isInt({ min: 1 }).withMessage('Invalid subject ID')
];

const listMarksValidator = [
  query('classId').optional().isInt({ min: 1 }).withMessage('Invalid class ID'),
  query('sectionId').optional().isInt({ min: 1 }).withMessage('Invalid section ID'),
  query('examId').optional().isInt({ min: 1 }).withMessage('Invalid exam ID'),
  query('subjectId').optional().isInt({ min: 1 }).withMessage('Invalid subject ID'),
  query('studentId').optional().isInt({ min: 1 }).withMessage('Invalid student ID')
];

const upsertMarksValidator = [
  body('sclass').optional().isInt({ min: 1 }).withMessage('Invalid class ID'),
  body('classId').optional().isInt({ min: 1 }).withMessage('Invalid class ID'),
  body('section').optional().isInt({ min: 1 }).withMessage('Invalid section ID'),
  body('sectionId').optional().isInt({ min: 1 }).withMessage('Invalid section ID'),
  body('examId').optional().isInt({ min: 1 }).withMessage('Invalid exam ID'),
  body('exam').optional().isString().withMessage('Exam must be a string'),
  body('subjectId').optional().isInt({ min: 1 }).withMessage('Invalid subject ID'),
  body('subject').optional().isString().withMessage('Subject must be a string'),
  body('marks').isObject().withMessage('Marks payload is required')
];

const listGradesValidator = [
  query('academicYearId').optional().isInt({ min: 1 }).withMessage('Invalid academicYearId')
];

const gradeIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid grade ID')
];

const createGradeValidator = [
  body('gname').trim().notEmpty().isLength({ max: 10 }).withMessage('Grade name is required'),
  body('gpoint').optional().isFloat({ min: 0, max: 10 }).withMessage('Grade point must be between 0 and 10'),
  body('pform').isFloat({ min: 0, max: 100 }).withMessage('Percent from must be between 0 and 100'),
  body('pto').isFloat({ min: 0, max: 100 }).withMessage('Percent to must be between 0 and 100'),
  body('comment').optional().isLength({ max: 100 }).withMessage('Comment is too long')
];

const updateGradeValidator = [
  ...gradeIdValidator,
  body('gname').optional().trim().notEmpty().isLength({ max: 10 }),
  body('gradeName').optional().trim().notEmpty().isLength({ max: 10 }),
  body('gpoint').optional().isFloat({ min: 0, max: 10 }),
  body('gradePoint').optional().isFloat({ min: 0, max: 10 }),
  body('pform').optional().isFloat({ min: 0, max: 100 }),
  body('percentFrom').optional().isFloat({ min: 0, max: 100 }),
  body('pto').optional().isFloat({ min: 0, max: 100 }),
  body('percentUpto').optional().isFloat({ min: 0, max: 100 }),
  body('comment').optional().isLength({ max: 100 })
];

module.exports = {
  getMarksValidator,
  listMarksValidator,
  upsertMarksValidator,
  listGradesValidator,
  gradeIdValidator,
  createGradeValidator,
  updateGradeValidator
};
