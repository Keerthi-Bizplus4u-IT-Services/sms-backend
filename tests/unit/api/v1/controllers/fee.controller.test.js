/**
 * Unit Tests for Fee Controller
 */

jest.mock('../../../../../src/api/v1/services/fee.service', () => ({
  getFees: jest.fn(),
  recordPayment: jest.fn(),
  getFeeStructure: jest.fn(),
  updateFeeStructure: jest.fn(),
  deleteFeeStructure: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  resolveSchoolIdFromRequest: jest.fn(),
  parsePositiveInt: jest.fn((v) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) || n <= 0 ? null : n;
  })
}));

const feeController = require('../../../../../src/api/v1/controllers/fee.controller');
const feeService = require('../../../../../src/api/v1/services/fee.service');
const { success } = require('../../../../../src/utils/response');
const { resolveSchoolIdFromRequest, parsePositiveInt } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('FeeController', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    resolveSchoolIdFromRequest.mockReturnValue(1);
    parsePositiveInt.mockImplementation((v) => {
      const n = parseInt(v, 10);
      return Number.isNaN(n) || n <= 0 ? null : n;
    });
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });

  describe('getFees', () => {
    it('should retrieve fee data with scope', async () => {
      req.query = { page: '1', limit: '10' };
      const payload = { fees: [{ id: 1 }], total: 1 };
      feeService.getFees.mockResolvedValue(payload);

      await feeController.getFees(req, res, next);

      expect(feeService.getFees).toHaveBeenCalledWith(req.query, expect.objectContaining({ schoolId: 1 }));
      expect(success).toHaveBeenCalledWith(res, payload, 'Fee data retrieved successfully', 200);
    });
  });

  describe('recordPayment', () => {
    it('should record fee payment', async () => {
      req.body = { student_id: 1, amount: 5000, fee_term_id: 2 };
      feeService.recordPayment.mockResolvedValue({ id: 1, amount: 5000 });

      await feeController.recordPayment(req, res, next);

      expect(feeService.recordPayment).toHaveBeenCalledWith(req.body);
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'Fee payment recorded successfully', 201);
    });

    it('should reject negative payment amounts', async () => {
      req.body = { amount: -100 };
      feeService.recordPayment.mockRejectedValue(new Error('Invalid amount'));

      await feeController.recordPayment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getFeeStructure', () => {
    it('should retrieve fee structure', async () => {
      feeService.getFeeStructure.mockResolvedValue({ structure: [] });

      await feeController.getFeeStructure(req, res, next);

      expect(feeService.getFeeStructure).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 1 }));
    });
  });

  describe('deleteFeeStructure', () => {
    it('should delete fee structure by cn', async () => {
      req.params = { cn: 'FEE-001' };
      feeService.deleteFeeStructure.mockResolvedValue(true);

      await feeController.deleteFeeStructure(req, res, next);

      expect(feeService.deleteFeeStructure).toHaveBeenCalledWith('FEE-001');
    });
  });
});
