const express = require('express');
const router = express.Router();

const leaveController = require('../controllers/leave.controller');
const {
  paginationValidator,
  applyLeaveValidator,
  coveragePreviewValidator,
  createPolicyValidator,
  updatePolicyValidator,
  policyIdValidator,
  policyQueryValidator,
  balanceQueryValidator,
  leaveRequestIdValidator,
  approvalQueryValidator,
  updateAssignmentsValidator,
  leaveDecisionValidator,
} = require('../validators/leave.validator');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const { validate } = require('../../../middleware/validation.middleware');

router.get(
  '/my',
  authenticate,
  enforceTenant(),
  paginationValidator,
  validate,
  leaveController.getMyLeaves
);

router.post(
  '/coverage-preview',
  authenticate,
  enforceTenant(),
  coveragePreviewValidator,
  validate,
  leaveController.previewCoverage
);

router.post(
  '/apply',
  authenticate,
  enforceTenant(),
  applyLeaveValidator,
  validate,
  leaveController.applyLeave
);

router.get(
  '/policies',
  authenticate,
  enforceTenant(),
  requirePermission('leaves:approve'),
  policyQueryValidator,
  validate,
  leaveController.getLeavePolicies
);

router.post(
  '/policies',
  authenticate,
  enforceTenant(),
  requirePermission('leaves:approve'),
  createPolicyValidator,
  validate,
  leaveController.createPolicy
);

router.put(
  '/policies/:id',
  authenticate,
  enforceTenant(),
  requirePermission('leaves:approve'),
  policyIdValidator,
  updatePolicyValidator,
  validate,
  leaveController.updatePolicy
);

router.get(
  '/balance',
  authenticate,
  enforceTenant(),
  balanceQueryValidator,
  validate,
  leaveController.getLeaveBalance
);

router.get(
  '/requests',
  authenticate,
  enforceTenant(),
  requirePermission('leaves:approve'),
  approvalQueryValidator,
  validate,
  leaveController.getApprovalQueue
);

router.get(
  '/requests/:id',
  authenticate,
  enforceTenant(),
  requirePermission('leaves:approve'),
  leaveRequestIdValidator,
  validate,
  leaveController.getApprovalRequestById
);

router.put(
  '/requests/:id/assignments',
  authenticate,
  enforceTenant(),
  requirePermission('leaves:approve'),
  leaveRequestIdValidator,
  updateAssignmentsValidator,
  validate,
  leaveController.updateApprovalAssignments
);

router.patch(
  '/requests/:id/status',
  authenticate,
  enforceTenant(),
  requirePermission('leaves:approve'),
  leaveRequestIdValidator,
  leaveDecisionValidator,
  validate,
  leaveController.decideApprovalRequest
);

module.exports = router;
