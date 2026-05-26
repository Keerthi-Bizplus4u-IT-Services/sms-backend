const { body, param, query } = require('express-validator');
const parentRepository = require('../repositories/parent.repository');

const RELATIONSHIP_TYPES = ['father', 'mother', 'guardian', 'other'];

const hasBooleanLikeValue = (value) => (
  typeof value === 'boolean' || value === 'true' || value === 'false'
);

const hasExistingParentMatch = async (req) => {
  const person = req.body?.person || {};
  const parent = req.body?.parent || {};
  const user = req.body?.user || null;

  if (!person || typeof person !== 'object') {
    return false;
  }

  const existingParent = await parentRepository.findExistingParent(parent, person, user);
  return Boolean(existingParent);
};

const createParentValidator = [
  body('photo').custom(async (value, { req }) => {
    const hasPhotoFile = Boolean(req.files?.photo?.[0] || req.file);
    const hasPhotoUrl = Boolean(req.body?.person?.photo_url);
    if (hasPhotoFile || hasPhotoUrl) {
      return true;
    }

    const existingParent = await hasExistingParentMatch(req);
    if (!existingParent) {
      throw new Error('Photo is required');
    }

    return true;
  }),
  body('aadhar').custom(async (value, { req }) => {
    const hasAadharFile = Boolean(req.files?.aadhar?.[0]);
    const hasAadharUrl = Boolean(req.body?.person?.aadhar_url);
    if (hasAadharFile || hasAadharUrl) {
      return true;
    }

    const existingParent = await hasExistingParentMatch(req);
    if (!existingParent) {
      throw new Error('Aadhar document is required');
    }

    return true;
  }),
  body('pan').custom(async (value, { req }) => {
    const hasPanFile = Boolean(req.files?.pan?.[0]);
    const hasPanUrl = Boolean(req.body?.person?.pan_url);
    if (hasPanFile || hasPanUrl) {
      return true;
    }

    const existingParent = await hasExistingParentMatch(req);
    if (!existingParent) {
      throw new Error('PAN document is required');
    }

    return true;
  }),
  body('person.first_name').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('person.last_name').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('person.gender').notEmpty().isIn(['male', 'female', 'other', 'prefer_not_to_say']),
  body('person.date_of_birth').notEmpty().isISO8601(),
  body('person.phone').optional().matches(/^[0-9]{10}$/),
  body('person.email').optional().isEmail().withMessage('Invalid email'),
  body('person.father_name').optional().trim().isLength({ max: 100 }),
  body('person.father_phone').optional().matches(/^[0-9]{10}$/).withMessage('Father phone must be 10 digits'),
  body('person.father_email').optional().isEmail().withMessage('Invalid father email'),
  body('person.mother_name').optional().trim().isLength({ max: 100 }),
  body('person.mother_phone').optional().matches(/^[0-9]{10}$/).withMessage('Mother phone must be 10 digits'),
  body('person.mother_email').optional().isEmail().withMessage('Invalid mother email'),
  body('parent.occupation').optional().isLength({ max: 100 }),
  body('parent.employer_name').optional().isLength({ max: 255 }),
  body('parent.pan_number').optional().isLength({ max: 20 })
];

const updateParentValidator = [
  param('id').isInt({ min: 1 }),
  body('person.first_name').optional().trim().isLength({ min: 2, max: 100 }),
  body('person.last_name').optional().trim().isLength({ min: 2, max: 100 }),
  body('person.phone').optional().matches(/^[0-9]{10}$/),
  body('person.email').optional().isEmail().withMessage('Invalid email'),
  body('person.father_name').optional().trim().isLength({ max: 100 }),
  body('person.father_phone').optional().matches(/^[0-9]{10}$/).withMessage('Father phone must be 10 digits'),
  body('person.father_email').optional().isEmail().withMessage('Invalid father email'),
  body('person.mother_name').optional().trim().isLength({ max: 100 }),
  body('person.mother_phone').optional().matches(/^[0-9]{10}$/).withMessage('Mother phone must be 10 digits'),
  body('person.mother_email').optional().isEmail().withMessage('Invalid mother email'),
  body('parent.occupation').optional().isLength({ max: 100 }),
  body('parent.relationship_type').optional().isIn(['father', 'mother', 'guardian', 'other'])
];

const getParentsValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('studentId').optional().isInt({ min: 1 })
];

const parentIdValidator = [param('id').isInt({ min: 1 })];

const linkStudentValidator = [
  param('id').isInt({ min: 1 }),
  param('studentId').isInt({ min: 1 }),
  body().custom((_, { req }) => {
    const relationshipType = req.body?.relationship_type ?? req.body?.relationshipType;

    if (!RELATIONSHIP_TYPES.includes(relationshipType)) {
      throw new Error('Relationship type must be one of: father, mother, guardian, other');
    }

    const isPrimaryContact = req.body?.is_primary_contact ?? req.body?.isPrimaryContact;
    if (typeof isPrimaryContact !== 'undefined' && !hasBooleanLikeValue(isPrimaryContact)) {
      throw new Error('Primary contact must be a boolean');
    }

    const isEmergencyContact = req.body?.is_emergency_contact ?? req.body?.isEmergencyContact;
    if (typeof isEmergencyContact !== 'undefined' && !hasBooleanLikeValue(isEmergencyContact)) {
      throw new Error('Emergency contact must be a boolean');
    }

    return true;
  })
];

const syncParentLinksValidator = [
  body('dryRun').optional().custom((value) => {
    if (!hasBooleanLikeValue(value)) {
      throw new Error('dryRun must be a boolean');
    }

    return true;
  })
];

module.exports = {
  createParentValidator,
  updateParentValidator,
  getParentsValidator,
  parentIdValidator,
  linkStudentValidator,
  syncParentLinksValidator
};
