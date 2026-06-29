const express = require('express');
const router = express.Router();
const { subjectController } = require('../controllers/class.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const { createSubjectValidator, updateSubjectValidator, subjectIdValidator, listSubjectsValidator } = require('../validators/subject.validator');
const { validate } = require('../../../middleware/validation.middleware');

router.get('/', authenticate, enforceTenant(), requirePermission('subjects:read'), listSubjectsValidator, validate, subjectController.getSubjects);
router.get('/:id', authenticate, enforceTenant(), requirePermission('subjects:read'), subjectIdValidator, validate, subjectController.getSubjectById);
router.post('/', authenticate, enforceTenant(), requirePermission('subjects:write'), createSubjectValidator, validate, subjectController.createSubject);
router.put('/:id', authenticate, enforceTenant(), requirePermission('subjects:write'), updateSubjectValidator, validate, subjectController.updateSubject);
router.delete('/:id', authenticate, enforceTenant(), requirePermission('subjects:delete'), subjectIdValidator, validate, subjectController.deleteSubject);

module.exports = router;
