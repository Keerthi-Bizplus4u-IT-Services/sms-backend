const { body, param, query } = require('express-validator');

const createTeacherValidator = [
  body('photo').custom((value, { req }) => {
    const hasPhotoFile = Boolean(req.files?.photo?.[0] || req.file);
    const hasPhotoUrl = Boolean(req.body?.person?.photo_url);
    if (!hasPhotoFile && !hasPhotoUrl) {
      throw new Error('Photo is required');
    }
    return true;
  }),
  body('aadhar').custom((value, { req }) => {
    const hasAadharFile = Boolean(req.files?.aadhar?.[0]);
    const hasAadharUrl = Boolean(req.body?.person?.aadhar_url);
    if (!hasAadharFile && !hasAadharUrl) {
      throw new Error('Aadhar document is required');
    }
    return true;
  }),
  body('pan').custom((value, { req }) => {
    const hasPanFile = Boolean(req.files?.pan?.[0]);
    const hasPanUrl = Boolean(req.body?.person?.pan_url);
    if (!hasPanFile && !hasPanUrl) {
      throw new Error('PAN document is required');
    }
    return true;
  }),
  body('person.first_name').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('person.last_name').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('person.gender').notEmpty().isIn(['male', 'female', 'other', 'prefer_not_to_say']),
  body('person.date_of_birth').notEmpty().isISO8601(),
  body('person.phone').optional().matches(/^[0-9]{10}$/),
  body('teacher.employee_id').trim().notEmpty().isLength({ min: 3, max: 50 }),
  body('teacher.join_date').notEmpty().isISO8601(),
  body('teacher.school_id').optional().isInt({ min: 1 }),
  body('teacher.branch_id').optional().isInt({ min: 1 }),
  body('teacher.designation').optional().isLength({ max: 100 }),
  body('teacher.qualification').optional().isLength({ max: 255 }),
  body('teacher.employment_status')
    .optional()
    .isIn(['active', 'on_leave', 'resigned', 'terminated']),
  body('teacher.status').optional().isIn(['active', 'inactive', 'on_leave', 'resigned'])
];

const updateTeacherValidator = [
  param('id').isInt({ min: 1 }),
  body('person.first_name').optional().trim().isLength({ min: 2, max: 100 }),
  body('person.last_name').optional().trim().isLength({ min: 2, max: 100 }),
  body('teacher.school_id').optional().isInt({ min: 1 }),
  body('teacher.branch_id').optional().isInt({ min: 1 }),
  body('teacher.status').optional().isIn(['active', 'inactive', 'on_leave', 'resigned'])
];

const getTeachersValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 500 }),
  query('status').optional().isIn(['active', 'inactive', 'on_leave', 'resigned']),
  query('designation').optional().trim().isLength({ max: 100 }),
  query('branchId').optional().isInt({ min: 1 })
];

const teacherIdValidator = [
  param('id').isInt({ min: 1 })
];

module.exports = {
  createTeacherValidator,
  updateTeacherValidator,
  getTeachersValidator,
  teacherIdValidator
};
