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
const { authorize, requirePermission } = require('../../../middleware/rbac.middleware');

const router = express.Router();

router.get('/assignments', authenticate, requirePermission('assignments:read'), listAssignmentsValidator, validate, assignmentController.listAssignments);
router.get('/assignments/:id', authenticate, requirePermission('assignments:read'), assignmentIdValidator, validate, assignmentController.getAssignmentById);
router.post('/assignments', authenticate, authorize(['teacher']), requirePermission('assignments:write'), createAssignmentValidator, validate, assignmentController.createAssignment);
router.put('/assignments/:id', authenticate, authorize(['teacher']), requirePermission('assignments:write'), assignmentIdValidator, updateAssignmentValidator, validate, assignmentController.updateAssignment);
router.delete('/assignments/:id', authenticate, authorize(['teacher']), requirePermission('assignments:write'), assignmentIdValidator, validate, assignmentController.deleteAssignment);

module.exports = router;