const leaveService = require('../services/leave.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { ensureSchoolContext } = require('../utils/context');

class LeaveController {
  previewCoverage = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const preview = await leaveService.getCoveragePreview(req.body, {
      schoolId,
      userId: req.user?.id,
    });
    return success(res, preview, 'Leave coverage preview generated successfully', 200);
  });

  applyLeave = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const leave = await leaveService.applyLeave(req.body, {
      schoolId,
      userId: req.user?.id,
    });
    return success(res, leave, 'Leave request submitted successfully', 201);
  });

  getMyLeaves = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const result = await leaveService.getMyLeaves(
      {
        page: req.query.page,
        limit: req.query.limit,
      },
      {
        schoolId,
        userId: req.user?.id,
      }
    );
    return success(res, result, 'Leave requests retrieved successfully', 200);
  });

  getLeavePolicies = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const policies = await leaveService.getPolicies(
      {
        year: req.query.year,
        includeInactive: req.query.includeInactive,
      },
      { schoolId }
    );
    return success(res, policies, 'Leave policies retrieved successfully', 200);
  });

  createPolicy = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const policy = await leaveService.createPolicy(req.body, { schoolId });
    return success(res, policy, 'Leave policy created successfully', 201);
  });

  updatePolicy = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const policy = await leaveService.updatePolicy(req.params.id, req.body, { schoolId });
    return success(res, policy, 'Leave policy updated successfully', 200);
  });

  getLeaveBalance = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const balance = await leaveService.getLeaveBalance(
      { schoolId, userId: req.user?.id },
      { year: req.query.year }
    );
    return success(res, balance, 'Leave balance retrieved successfully', 200);
  });

  getApprovalQueue = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const queue = await leaveService.getApprovalQueue(
      {
        status: req.query.status,
        page: req.query.page,
        limit: req.query.limit,
      },
      { schoolId }
    );
    return success(res, queue, 'Leave approval queue retrieved successfully', 200);
  });

  getApprovalRequestById = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const request = await leaveService.getApprovalRequestById(req.params.id, { schoolId });
    return success(res, request, 'Leave request retrieved successfully', 200);
  });

  updateApprovalAssignments = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const updated = await leaveService.updateApprovalAssignments(req.params.id, req.body, { schoolId });
    return success(res, updated, 'Leave period assignments updated successfully', 200);
  });

  decideApprovalRequest = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const decided = await leaveService.decideApprovalRequest(req.params.id, req.body, {
      schoolId,
      userId: req.user?.id,
    });
    return success(res, decided, 'Leave request decision updated successfully', 200);
  });
}

module.exports = new LeaveController();
