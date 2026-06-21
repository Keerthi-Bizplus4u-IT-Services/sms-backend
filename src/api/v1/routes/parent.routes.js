const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parent.controller');
const {
	createParentValidator,
	updateParentValidator,
	getParentsValidator,
	parentIdValidator,
	linkStudentValidator,
	syncParentLinksValidator
} = require('../validators/parent.validator');
const { validate } = require('../../../middleware/validation.middleware');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const { uploadParentFiles } = require('../../../middleware/photo-upload.middleware');
const { normalizePayload } = require('../../../middleware/payload-normalizer.middleware');

router.get('/', authenticate, getParentsValidator, validate, parentController.getParents);
router.post('/sync-student-links', authenticate, requirePermission('parents:write'), syncParentLinksValidator, validate, parentController.syncStudentLinks);
router.get('/:id', authenticate, parentIdValidator, validate, parentController.getParentById);
router.post(
	'/',
	authenticate,
	requirePermission('parents:write'),
	uploadParentFiles,
	normalizePayload,
	createParentValidator,
	validate,
	parentController.createParent
);
router.post(
	'/:id/students/:studentId',
	authenticate,
	requirePermission('parents:write'),
	linkStudentValidator,
	validate,
	parentController.linkStudent
);
router.put(
	'/:id',
	authenticate,
	requirePermission('parents:write'),
	uploadParentFiles,
	normalizePayload,
	updateParentValidator,
	validate,
	parentController.updateParent
);
router.delete('/:id', authenticate, requirePermission('parents:delete'), parentIdValidator, validate, parentController.deleteParent);

module.exports = router;
