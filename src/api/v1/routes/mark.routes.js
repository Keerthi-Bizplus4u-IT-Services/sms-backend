const express = require('express');
const router = express.Router();
const markController = require('../controllers/mark.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const {
	listMarksValidator,
	upsertMarksValidator,
	listGradesValidator,
	gradeIdValidator,
	createGradeValidator,
	updateGradeValidator
} = require('../validators/mark.validator');
const { validate } = require('../../../middleware/validation.middleware');

/**
 * Mark Routes
 */

// Canonical endpoints
router.get('/marks', authenticate, requirePermission('marks:read'), listMarksValidator, validate, markController.listMarks);
router.post('/marks/bulk', authenticate, requirePermission('marks:write'), upsertMarksValidator, validate, markController.upsertMarks);

router.get('/grades', authenticate, requirePermission('marks:read'), listGradesValidator, validate, markController.listGrades);
router.get('/grades/:id', authenticate, requirePermission('marks:read'), gradeIdValidator, validate, markController.getGradeById);
router.post('/grades', authenticate, requirePermission('marks:write'), createGradeValidator, validate, markController.createGrade);
router.put('/grades/:id', authenticate, requirePermission('marks:write'), updateGradeValidator, validate, markController.updateGrade);
router.delete('/grades/:id', authenticate, requirePermission('marks:write'), gradeIdValidator, validate, markController.deleteGrade);

module.exports = router;
