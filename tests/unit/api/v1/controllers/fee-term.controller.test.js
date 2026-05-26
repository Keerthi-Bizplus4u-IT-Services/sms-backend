/**
 * Unit Tests for Fee Term Controller
 */

jest.mock('../../../../../src/api/v1/services/fee-term.service', () => ({
  getFeeTerms: jest.fn(),
  createFeeTerm: jest.fn(),
  updateFeeTerm: jest.fn(),
  deleteFeeTerm: jest.fn()
}));
jest.mock('../../../../../src/utils/response');
jest.mock('../../../../../src/api/v1/utils/context', () => ({
  ensureSchoolContext: jest.fn()
}));

const feeTermController = require('../../../../../src/api/v1/controllers/fee-term.controller');
const feeTermService = require('../../../../../src/api/v1/services/fee-term.service');
const { success } = require('../../../../../src/utils/response');
const { ensureSchoolContext } = require('../../../../../src/api/v1/utils/context');
const { mockRequest, mockResponse, mockNext } = require('../../../../helpers/testUtils');

describe('FeeTermController', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    success.mockReturnValue(res);
    ensureSchoolContext.mockReturnValue(1);
    req.user = { id: 1, roleName: 'admin', schoolId: 1 };
  });

  describe('getFeeTerms', () => {
    it('should retrieve fee terms', async () => {
      req.query = { academic_year_id: '2' };
      feeTermService.getFeeTerms.mockResolvedValue([{ id: 1, name: 'Term 1' }]);

      await feeTermController.getFeeTerms(req, res, next);

      expect(feeTermService.getFeeTerms).toHaveBeenCalledWith(req.query, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, expect.any(Array), 'Fee terms retrieved successfully', 200);
    });
  });

  describe('createFeeTerm', () => {
    it('should create fee term with valid date range', async () => {
      req.body = { name: 'Term 2', due_date: '2026-07-15', academic_year_id: 2 };
      feeTermService.createFeeTerm.mockResolvedValue({ id: 2, name: 'Term 2' });

      await feeTermController.createFeeTerm(req, res, next);

      expect(feeTermService.createFeeTerm).toHaveBeenCalledWith(req.body, { schoolId: 1 });
      expect(success).toHaveBeenCalledWith(res, expect.any(Object), 'Fee term created successfully', 201);
    });

    it('should reject duplicate fee term names within same school', async () => {
      req.body = { name: 'Term 1' };
      feeTermService.createFeeTerm.mockRejectedValue(new Error('Fee term already exists'));

      await feeTermController.createFeeTerm(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateFeeTerm', () => {
    it('should update fee term', async () => {
      req.params = { id: '1' };
      req.body = { name: 'Updated Term' };
      feeTermService.updateFeeTerm.mockResolvedValue({ id: 1 });

      await feeTermController.updateFeeTerm(req, res, next);

      expect(feeTermService.updateFeeTerm).toHaveBeenCalledWith('1', req.body, { schoolId: 1 });
    });
  });

  describe('deleteFeeTerm', () => {
    it('should delete fee term', async () => {
      req.params = { id: '1' };
      feeTermService.deleteFeeTerm.mockResolvedValue(true);

      await feeTermController.deleteFeeTerm(req, res, next);

      expect(feeTermService.deleteFeeTerm).toHaveBeenCalledWith('1', { schoolId: 1 });
    });
  });
});
