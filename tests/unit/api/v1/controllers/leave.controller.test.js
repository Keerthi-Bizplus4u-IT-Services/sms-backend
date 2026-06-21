jest.mock('../../../../../src/api/v1/services/leave.service', () => ({
  getCoveragePreview: jest.fn(),
  applyLeave: jest.fn(),
  getMyLeaves: jest.fn(),
  getPolicies: jest.fn(),
  createPolicy: jest.fn(),
  updatePolicy: jest.fn(),
  getLeaveBalance: jest.fn(),
  getApprovalQueue: jest.fn(),
  getApprovalRequestById: jest.fn(),
  updateApprovalAssignments: jest.fn(),
  decideApprovalRequest: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  ensureSchoolContext: jest.fn()
}));

const leaveController = require('../../../../../src/api/v1/controllers/leave.controller');
const leaveService = require('../../../../../src/api/v1/services/leave.service');
const { success } = require('../../../../../src/utils/response');
const { ensureSchoolContext } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('LeaveController', () => {
  let req, res, next;
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    ensureSchoolContext.mockReturnValue(1);
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });
  describe('applyLeave', () => {
    it('should apply leave', async () => {
      req.body = { leave_type: 'CASUAL', start_date: '2026-05-01', end_date: '2026-05-03' };
      leaveService.applyLeave.mockResolvedValue({ id: 1, status: 'PENDING' });
      await leaveController.applyLeave(req, res, next);
      expect(leaveService.applyLeave).toHaveBeenCalledWith(req.body, { schoolId: 1, userId: 1 });
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'Leave request submitted successfully', 201);
    });
  });
  describe('getMyLeaves', () => {
    it('should retrieve user leaves', async () => {
      req.query = { page: '1', limit: '10' };
      leaveService.getMyLeaves.mockResolvedValue([]);
      await leaveController.getMyLeaves(req, res, next);
      expect(leaveService.getMyLeaves).toHaveBeenCalledWith({ page: '1', limit: '10' }, { schoolId: 1, userId: 1 });
    });
  });
  describe('getLeavePolicies', () => {
    it('should retrieve leave policies', async () => {
      req.query = {};
      leaveService.getPolicies.mockResolvedValue([]);
      await leaveController.getLeavePolicies(req, res, next);
      expect(leaveService.getPolicies).toHaveBeenCalledWith(expect.any(Object), { schoolId: 1 });
    });
  });
  describe('createPolicy', () => {
    it('should create leave policy', async () => {
      req.body = { name: 'Annual Leave', max_days: 20 };
      leaveService.createPolicy.mockResolvedValue({ id: 1 });
      await leaveController.createPolicy(req, res, next);
      expect(leaveService.createPolicy).toHaveBeenCalledWith(req.body, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, { id: 1 }, 'Leave policy created successfully', 201);
    });
  });
  describe('getLeaveBalance', () => {
    it('should get leave balance', async () => {
      req.query = {};
      leaveService.getLeaveBalance.mockResolvedValue({ casual: 10 });
      await leaveController.getLeaveBalance(req, res, next);
      expect(leaveService.getLeaveBalance).toHaveBeenCalledWith({ schoolId: 1, userId: 1 }, expect.any(Object));
    });
  });
  describe('decideApprovalRequest', () => {
    it('should decide leave request', async () => {
      req.params = { id: '1' };
      req.body = { decision: 'APPROVED' };
      leaveService.decideApprovalRequest.mockResolvedValue({ id: 1 });
      await leaveController.decideApprovalRequest(req, res, next);
      expect(leaveService.decideApprovalRequest).toHaveBeenCalledWith('1', req.body, { schoolId: 1, userId: 1 });
    });
  });
});
