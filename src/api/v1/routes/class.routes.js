const express = require('express');
const router = express.Router();
const { classController } = require('../controllers/class.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const { createClassValidator, updateClassValidator, classIdValidator, listClassesValidator } = require('../validators/class.validator');
const { validate } = require('../../../middleware/validation.middleware');
const { enforceClassLimit } = require('../../../middleware/trial-limits.middleware');

router.get('/', authenticate, requirePermission('classes:read'), listClassesValidator, validate, classController.getClasses);
router.get('/academic-year/:academicYearId', authenticate, requirePermission('classes:read'), classController.getClassesByAcademicYear);
router.get('/:id', authenticate, requirePermission('classes:read'), classIdValidator, validate, classController.getClassById);
router.post('/', authenticate, requirePermission('classes:write'), enforceClassLimit, createClassValidator, validate, classController.createClass);
router.put('/:id', authenticate, requirePermission('classes:write'), updateClassValidator, validate, classController.updateClass);
router.delete('/:id', authenticate, requirePermission('classes:delete'), classIdValidator, validate, classController.deleteClass);

module.exports = router;
