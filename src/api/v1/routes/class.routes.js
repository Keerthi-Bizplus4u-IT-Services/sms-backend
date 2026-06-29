const express = require('express');
const router = express.Router();
const { classController } = require('../controllers/class.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const { createClassValidator, updateClassValidator, classIdValidator, listClassesValidator } = require('../validators/class.validator');
const { validate } = require('../../../middleware/validation.middleware');
const { enforceClassLimit } = require('../../../middleware/trial-limits.middleware');

router.get('/', authenticate, enforceTenant(), requirePermission('classes:read'), listClassesValidator, validate, classController.getClasses);
router.get('/academic-year/:academicYearId', authenticate, enforceTenant(), requirePermission('classes:read'), classController.getClassesByAcademicYear);
router.get('/:id', authenticate, enforceTenant(), requirePermission('classes:read'), classIdValidator, validate, classController.getClassById);
router.post('/', authenticate, enforceTenant(), requirePermission('classes:write'), enforceClassLimit, createClassValidator, validate, classController.createClass);
router.put('/:id', authenticate, enforceTenant(), requirePermission('classes:write'), updateClassValidator, validate, classController.updateClass);
router.delete('/:id', authenticate, enforceTenant(), requirePermission('classes:delete'), classIdValidator, validate, classController.deleteClass);

module.exports = router;
