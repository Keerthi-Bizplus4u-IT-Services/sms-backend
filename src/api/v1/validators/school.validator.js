const { body, param, query } = require('express-validator');

const schoolIdValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('School ID must be a positive integer')
];

const createSchoolValidator = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('School code is required')
    .isLength({ max: 20 })
    .withMessage('School code must not exceed 20 characters'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('School name is required')
    .isLength({ max: 200 })
    .withMessage('School name must not exceed 200 characters'),
  body('short_name')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Short name must not exceed 50 characters'),
  body('school_type')
    .trim()
    .notEmpty()
    .withMessage('School type is required')
    .isIn(['primary', 'secondary', 'higher_secondary', 'k12', 'college', 'university'])
    .withMessage('Invalid school type'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

const updateSchoolValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('School ID must be a positive integer'),
  body('code')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('School code must not exceed 20 characters'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('School name must not exceed 200 characters'),
  body('short_name')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Short name must not exceed 50 characters'),
  body('school_type')
    .optional()
    .trim()
    .isIn(['primary', 'secondary', 'higher_secondary', 'k12', 'college', 'university'])
    .withMessage('Invalid school type'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

const createBranchValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('School ID must be a positive integer'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Branch code is required')
    .isLength({ max: 20 })
    .withMessage('Branch code must not exceed 20 characters'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Branch name is required')
    .isLength({ max: 200 })
    .withMessage('Branch name must not exceed 200 characters'),
  body('branch_type')
    .trim()
    .notEmpty()
    .withMessage('Branch type is required')
    .isIn(['main', 'branch', 'campus', 'satellite', 'annexe'])
    .withMessage('Invalid branch type'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

const listSchoolsValidator = [
  query('includeInactive')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('includeInactive must be true or false')
];

const createSchoolOnboardingValidator = [
  body('mode')
    .optional()
    .isIn(['fresh', 'clone'])
    .withMessage('mode must be either fresh or clone'),
  body('school')
    .exists()
    .withMessage('school payload is required'),
  body('school.code')
    .trim()
    .notEmpty()
    .withMessage('School code is required')
    .isLength({ max: 20 })
    .withMessage('School code must not exceed 20 characters'),
  body('school.name')
    .trim()
    .notEmpty()
    .withMessage('School name is required')
    .isLength({ max: 200 })
    .withMessage('School name must not exceed 200 characters'),
  body('school.school_type')
    .trim()
    .notEmpty()
    .withMessage('School type is required')
    .isIn(['primary', 'secondary', 'higher_secondary', 'k12', 'college', 'university'])
    .withMessage('Invalid school type'),
  body('clone_from_school_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('clone_from_school_id must be a positive integer'),
  body('branch.code')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Branch code must not exceed 20 characters'),
  body('branch.name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Branch name must not exceed 200 characters'),
  body('branch.branch_type')
    .optional()
    .trim()
    .isIn(['main', 'branch', 'campus', 'satellite', 'annexe'])
    .withMessage('Invalid branch type'),
  body('clone_scopes')
    .optional()
    .isObject()
    .withMessage('clone_scopes must be an object'),
  body('clone_scopes.class_structure')
    .optional()
    .isBoolean()
    .withMessage('clone_scopes.class_structure must be a boolean'),
  body('clone_scopes.subjects')
    .optional()
    .isBoolean()
    .withMessage('clone_scopes.subjects must be a boolean'),
  body('clone_scopes.exams')
    .optional()
    .isBoolean()
    .withMessage('clone_scopes.exams must be a boolean'),
  body('clone_scopes.fees')
    .optional()
    .isBoolean()
    .withMessage('clone_scopes.fees must be a boolean')
];

const schoolCloneSettingsValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('School ID must be a positive integer'),
  body('source_school_id')
    .isInt({ min: 1 })
    .withMessage('source_school_id must be a positive integer'),
  body('clone_scopes')
    .optional()
    .isObject()
    .withMessage('clone_scopes must be an object'),
  body('clone_scopes.class_structure')
    .optional()
    .isBoolean()
    .withMessage('clone_scopes.class_structure must be a boolean'),
  body('clone_scopes.subjects')
    .optional()
    .isBoolean()
    .withMessage('clone_scopes.subjects must be a boolean'),
  body('clone_scopes.exams')
    .optional()
    .isBoolean()
    .withMessage('clone_scopes.exams must be a boolean'),
  body('clone_scopes.fees')
    .optional()
    .isBoolean()
    .withMessage('clone_scopes.fees must be a boolean')
];

const schoolSettingsValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('School ID must be a positive integer'),
  body('school')
    .optional()
    .isObject()
    .withMessage('school must be an object'),
  body('school.name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('School name must not exceed 200 characters'),
  body('school.short_name')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Short name must not exceed 50 characters'),
  body('school.school_type')
    .optional()
    .trim()
    .isIn(['primary', 'secondary', 'higher_secondary', 'k12', 'college', 'university'])
    .withMessage('Invalid school type'),
  body('school.is_active')
    .optional()
    .isBoolean()
    .withMessage('school.is_active must be a boolean'),
  body('features')
    .optional()
    .isObject()
    .withMessage('features must be an object'),
  body('features.transport')
    .optional()
    .isBoolean()
    .withMessage('features.transport must be a boolean'),
  body('features.stock')
    .optional()
    .isBoolean()
    .withMessage('features.stock must be a boolean'),
  body('features.hostel')
    .optional()
    .isBoolean()
    .withMessage('features.hostel must be a boolean'),
  body('bunny_cdn')
    .optional()
    .isObject()
    .withMessage('bunny_cdn must be an object'),
  body('bunny_cdn.api_password')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Bunny CDN API password must not exceed 255 characters'),
  body('bunny_cdn.hostname')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Bunny CDN hostname must not exceed 255 characters'),
  body('bunny_cdn.pull_zone')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Bunny CDN pull zone must not exceed 255 characters'),
  body('bunny_cdn.storage_zone_name')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Bunny CDN storage zone name must not exceed 255 characters'),
  body('bunny_cdn').custom((value) => {
    if (value === undefined || value === null) {
      return true;
    }

    const toText = (field) => {
      if (typeof field !== 'string') {
        return '';
      }
      return field.trim();
    };

    const apiPassword = toText(value.api_password) || toText(value.api_key);
    const hostname = toText(value.hostname) || toText(value.storage_zone);
    const storageZoneName = toText(value.storage_zone_name);

    if (!apiPassword) {
      throw new Error('Bunny CDN API password is required');
    }
    if (!hostname) {
      throw new Error('Bunny CDN hostname is required');
    }
    if (!storageZoneName) {
      throw new Error('Bunny CDN storage zone name is required');
    }

    return true;
  }),
  body('smtp')
    .optional()
    .isObject()
    .withMessage('smtp must be an object'),
  body('smtp.host')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('SMTP host must not exceed 255 characters'),
  body('smtp.port')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 65535 })
    .withMessage('SMTP port must be between 1 and 65535'),
  body('smtp.user')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('SMTP user must not exceed 255 characters'),
  body('smtp.password')
    .optional({ nullable: true })
    .isLength({ max: 255 })
    .withMessage('SMTP password must not exceed 255 characters'),
  body('smtp.from_email')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('SMTP from email must not exceed 255 characters'),
  body('smtp.from_name')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('SMTP from name must not exceed 255 characters'),
  body('smtp.secure')
    .optional()
    .isBoolean()
    .withMessage('smtp.secure must be a boolean')
];

const dummyDataValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('School ID must be a positive integer')
];

module.exports = {
  schoolIdValidator,
  createSchoolValidator,
  updateSchoolValidator,
  createBranchValidator,
  listSchoolsValidator,
  createSchoolOnboardingValidator,
  schoolCloneSettingsValidator,
  schoolSettingsValidator,
  dummyDataValidator
};
