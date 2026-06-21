const feeService = require('../services/fee.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { parsePositiveInt, resolveSchoolIdFromRequest } = require('../utils/context');

const resolveFeeScope = (req) => ({
  schoolId: resolveSchoolIdFromRequest(req),
  branchId: parsePositiveInt(req?.query?.branchId) || parsePositiveInt(req?.query?.branch_id),
  selectedStudentId: parsePositiveInt(req?.query?.studentId),
  userId: parsePositiveInt(req?.user?.id),
  roleName: String(req?.user?.roleName || '').toLowerCase()
});

class FeeController {
  getFees = asyncHandler(async (req, res) => {
    const result = await feeService.getFees(req.query, resolveFeeScope(req));
    return success(res, result, 'Fee data retrieved successfully', 200);
  });

  recordPayment = asyncHandler(async (req, res) => {
    const payment = await feeService.recordPayment(req.body);
    return success(res, payment, 'Fee payment recorded successfully', 201);
  });

  downloadReceipt = asyncHandler(async (req, res) => {
    const paymentId = parsePositiveInt(req.params.paymentId);
    const { pdfBuffer, fileName } = await feeService.getPaymentReceipt(paymentId, resolveFeeScope(req));

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': pdfBuffer.length
    });

    return res.send(pdfBuffer);
  });

  emailReceipt = asyncHandler(async (req, res) => {
    const paymentId = parsePositiveInt(req.params.paymentId);
    const result = await feeService.emailPaymentReceipt(paymentId, req.body, resolveFeeScope(req));
    return success(res, result, 'Fee receipt email sent successfully', 200);
  });

  getFeeStructure = asyncHandler(async (req, res) => {
    const result = await feeService.getFeeStructure(resolveFeeScope(req));
    return success(res, result, 'Fee details retrieved successfully', 200);
  });

  updateFeeStructure = asyncHandler(async (req, res) => {
    const result = await feeService.updateFeeStructure(req.body);
    return success(res, result, 'Fee structure updated successfully', 200);
  });

  deleteFeeStructure = asyncHandler(async (req, res) => {
    const { cn } = req.params;
    const result = await feeService.deleteFeeStructure(cn);
    return success(res, result, 'Fee structure deleted successfully', 200);
  });
}

module.exports = new FeeController();
