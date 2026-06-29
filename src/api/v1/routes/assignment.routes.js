const express = require('express');

const assignmentController = require('../controllers/assignment.controller');
const {
  listAssignmentsValidator,
  assignmentIdValidator,
  createAssignmentValidator,
  updateAssignmentValidator
} = require('../validators/assignment.validator');
const { validate } = require('../../../middleware/validation.middleware');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize, requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');

const router = express.Router();

router.get('/assignments', authenticate, enforceTenant(), requirePermission('assignments:read'), listAssignmentsValidator, validate, assignmentController.listAssignments);
router.get('/assignments/:id', authenticate, enforceTenant(), requirePermission('assignments:read'), assignmentIdValidator, validate, assignmentController.getAssignmentById);
router.post('/assignments', authenticate, enforceTenant(), authorize(['teacher']), requirePermission('assignments:write'), createAssignmentValidator, validate, assignmentController.createAssignment);
router.put('/assignments/:id', authenticate, enforceTenant(), authorize(['teacher']), requirePermission('assignments:write'), assignmentIdValidator, updateAssignmentValidator, validate, assignmentController.updateAssignment);
router.delete('/assignments/:id', authenticate, enforceTenant(), authorize(['teacher']), requirePermission('assignments:write'), assignmentIdValidator, validate, assignmentController.deleteAssignment);

module.exports = router;