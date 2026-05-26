const feeTermService = require('../services/fee-term.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { ensureSchoolContext } = require('../utils/context');

class FeeTermController {
  getFeeTerms = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const terms = await feeTermService.getFeeTerms(req.query, { schoolId });
    return success(res, terms, 'Fee terms retrieved successfully', 200);
  });

  createFeeTerm = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const term = await feeTermService.createFeeTerm(req.body, { schoolId });
    return success(res, term, 'Fee term created successfully', 201);
  });

  updateFeeTerm = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const term = await feeTermService.updateFeeTerm(req.params.id, req.body, { schoolId });
    return success(res, term, 'Fee term updated successfully', 200);
  });

  deleteFeeTerm = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const result = await feeTermService.deleteFeeTerm(req.params.id, { schoolId });
    return success(res, result, 'Fee term deleted successfully', 200);
  });
}

module.exports = new FeeTermController();
