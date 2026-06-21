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
const { requirePermission } = require('../../../middleware/rbac.middleware');
const { validate } = require('../../../middleware/validation.middleware');

router.get(
  '/my',
  authenticate,
  paginationValidator,
  validate,
  leaveController.getMyLeaves
);

router.post(
  '/coverage-preview',
  authenticate,
  coveragePreviewValidator,
  validate,
  leaveController.previewCoverage
);

router.post(
  '/apply',
  authenticate,
  applyLeaveValidator,
  validate,
  leaveController.applyLeave
);

router.get(
  '/policies',
  authenticate,
  requirePermission('leaves:approve'),
  policyQueryValidator,
  validate,
  leaveController.getLeavePolicies
);

router.post(
  '/policies',
  authenticate,
  requirePermission('leaves:approve'),
  createPolicyValidator,
  validate,
  leaveController.createPolicy
);

router.put(
  '/policies/:id',
  authenticate,
  requirePermission('leaves:approve'),
  policyIdValidator,
  updatePolicyValidator,
  validate,
  leaveController.updatePolicy
);

router.get(
  '/balance',
  authenticate,
  balanceQueryValidator,
  validate,
  leaveController.getLeaveBalance
);

router.get(
  '/requests',
  authenticate,
  requirePermission('leaves:approve'),
  approvalQueryValidator,
  validate,
  leaveController.getApprovalQueue
);

router.get(
  '/requests/:id',
  authenticate,
  requirePermission('leaves:approve'),
  leaveRequestIdValidator,
  validate,
  leaveController.getApprovalRequestById
);

router.put(
  '/requests/:id/assignments',
  authenticate,
  requirePermission('leaves:approve'),
  leaveRequestIdValidator,
  updateAssignmentsValidator,
  validate,
  leaveController.updateApprovalAssignments
);

router.patch(
  '/requests/:id/status',
  authenticate,
  requirePermission('leaves:approve'),
  leaveRequestIdValidator,
  leaveDecisionValidator,
  validate,
  leaveController.decideApprovalRequest
);

module.exports = router;
