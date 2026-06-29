const express = require('express');
const router = express.Router();
const markController = require('../controllers/mark.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
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
router.get('/marks', authenticate, enforceTenant(), requirePermission('marks:read'), listMarksValidator, validate, markController.listMarks);
router.post('/marks/bulk', authenticate, enforceTenant(), requirePermission('marks:write'), upsertMarksValidator, validate, markController.upsertMarks);

router.get('/grades', authenticate, enforceTenant(), requirePermission('marks:read'), listGradesValidator, validate, markController.listGrades);
router.get('/grades/:id', authenticate, enforceTenant(), requirePermission('marks:read'), gradeIdValidator, validate, markController.getGradeById);
router.post('/grades', authenticate, enforceTenant(), requirePermission('marks:write'), createGradeValidator, validate, markController.createGrade);
router.put('/grades/:id', authenticate, enforceTenant(), requirePermission('marks:write'), updateGradeValidator, validate, markController.updateGrade);
router.delete('/grades/:id', authenticate, enforceTenant(), requirePermission('marks:write'), gradeIdValidator, validate, markController.deleteGrade);

module.exports = router;
