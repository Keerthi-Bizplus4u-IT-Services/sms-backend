const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/section.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const {
	sectionsByClassValidator,
	createSectionValidator,
	updateSectionValidator,
	sectionIdValidator
} = require('../validators/section.validator');
const { validate } = require('../../../middleware/validation.middleware');

router.get('/', authenticate, enforceTenant(), requirePermission('sections:read'), sectionController.getSectionsByClass);
router.get('/:classId', authenticate, enforceTenant(), requirePermission('sections:read'), sectionsByClassValidator, validate, sectionController.getSectionsByClass);
router.post('/', authenticate, enforceTenant(), requirePermission('sections:write'), createSectionValidator, validate, sectionController.createSection);
router.put('/:id', authenticate, enforceTenant(), requirePermission('sections:write'), updateSectionValidator, validate, sectionController.updateSection);
router.delete('/:id', authenticate, enforceTenant(), requirePermission('sections:write'), sectionIdValidator, validate, sectionController.deleteSection);

module.exports = router;
