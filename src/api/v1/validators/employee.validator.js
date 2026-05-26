const { body, param, query } = require('express-validator');

const getEmployeesValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const employeeIdValidator = [
  param('eid').isInt({ min: 1 }).withMessage('Invalid employee ID')
];

const createEmployeeValidator = [
  body('photo').custom((value, { req }) => {
    const hasPhotoFile = Boolean(req.files?.photo?.[0] || req.file);
    const hasPhotoUrl = Boolean(req.body?.photo_url);
    if (!hasPhotoFile && !hasPhotoUrl) {
      throw new Error('Photo is required');
    }
    return true;
  }),
  body('aadhar').custom((value, { req }) => {
    const hasAadharFile = Boolean(req.files?.aadhar?.[0]);
    const hasAadharUrl = Boolean(req.body?.aadhar_url);
    if (!hasAadharFile && !hasAadharUrl) {
      throw new Error('Aadhar document is required');
    }
    return true;
  }),
  body('pan').custom((value, { req }) => {
    const hasPanFile = Boolean(req.files?.pan?.[0]);
    const hasPanUrl = Boolean(req.body?.pan_url);
    if (!hasPanFile && !hasPanUrl) {
      throw new Error('PAN document is required');
    }
    return true;
  }),
  body('fname').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('lname').trim().notEmpty().isLength({ min: 1, max: 100 }),
  body('gen').optional().isIn(['0', '1', '2', 0, 1, 2]),
  body('dob').optional().isISO8601(),
  body('phone').optional().isLength({ min: 7, max: 20 }),
  body('email').optional().isEmail(),
  body('address').optional().isLength({ max: 255 }),
  body('salary').optional().isFloat({ min: 0 }),
  body('join').optional().isISO8601(),
  body('desig').optional().isLength({ max: 100 }),
  body('idno').optional().isLength({ max: 100 }),
  body('fname1').optional().isLength({ max: 100 }),
  body('lname1').optional().isLength({ max: 100 }),
  body('ocp').optional().isLength({ max: 100 }),
  body('usertype').optional().isInt({ min: 0 }),
  body('aadhar_url').optional().isLength({ max: 500 }),
  body('pan_url').optional().isLength({ max: 500 }),
  body('bank_name').optional().isLength({ max: 255 }),
  body('bank_account_number').optional().isLength({ max: 50 }),
  body('bank_ifsc_code').optional().isLength({ max: 20 }),
  body('bank_account_holder_name').optional().isLength({ max: 100 })
];

const updateEmployeeValidator = [
  ...employeeIdValidator,
  body('fname').optional().trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('lname').optional().trim().notEmpty().isLength({ min: 1, max: 100 }),
  body('gen').optional().isIn(['0', '1', '2', 0, 1, 2]),
  body('dob').optional().isISO8601(),
  body('phone').optional().isLength({ min: 7, max: 20 }),
  body('email').optional().isEmail(),
  body('address').optional().isLength({ max: 255 }),
  body('salary').optional().isFloat({ min: 0 }),
  body('join').optional().isISO8601(),
  body('desig').optional().isLength({ max: 100 }),
  body('idno').optional().isLength({ max: 100 }),
  body('fname1').optional().isLength({ max: 100 }),
  body('lname1').optional().isLength({ max: 100 }),
  body('ocp').optional().isLength({ max: 100 }),
  body('usertype').optional().isInt({ min: 0 }),
  body('aadhar_url').optional().isLength({ max: 500 }),
  body('pan_url').optional().isLength({ max: 500 }),
  body('bank_name').optional().isLength({ max: 255 }),
  body('bank_account_number').optional().isLength({ max: 50 }),
  body('bank_ifsc_code').optional().isLength({ max: 20 }),
  body('bank_account_holder_name').optional().isLength({ max: 100 })
];

module.exports = {
  getEmployeesValidator,
  employeeIdValidator,
  createEmployeeValidator,
  updateEmployeeValidator
};
