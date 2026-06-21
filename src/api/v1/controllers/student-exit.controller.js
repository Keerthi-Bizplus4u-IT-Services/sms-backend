const { studentExitService } = require('../services/student-exit.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');
const { ensureSchoolContext } = require('../utils/context');

/**
 * Student Exit Controller
 * Handles HTTP requests for student exit workflow and certificate generation
 */
class StudentExitController {
  /**
   * POST /api/v1/student-exits
   * Initiate a student exit
   */
  initiateExit = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const context = { schoolId, userId: req.user?.id };
    const exit = await studentExitService.initiateExit(req.body, context);
    return success(res, exit, 'Student exit initiated successfully', 201);
  });

  /**
   * GET /api/v1/student-exits
   * List all exits with pagination
   */
  listExits = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      exitType: req.query.exit_type,
      search: req.query.search
    };
    const result = await studentExitService.listExits(filters, { schoolId });
    return success(res, result, 'Student exits retrieved successfully');
  });

  /**
   * GET /api/v1/student-exits/:id
   * Get exit by ID
   */
  getExit = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const exit = await studentExitService.getExitById(parseInt(req.params.id, 10), { schoolId });
    return success(res, exit, 'Student exit retrieved successfully');
  });

  /**
   * GET /api/v1/student-exits/student/:studentId
   * Get exit by student ID
   */
  getExitByStudent = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const exit = await studentExitService.getExitByStudentId(
      parseInt(req.params.studentId, 10),
      { schoolId }
    );
    return success(res, exit, 'Student exit retrieved successfully');
  });

  /**
   * POST /api/v1/student-exits/:id/certificates
   * Generate and download a certificate PDF
   */
  generateCertificate = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const exitId = parseInt(req.params.id, 10);
    const { certificate_type } = req.body;

    const { pdfBuffer, fileName } = await studentExitService.generateCertificate(
      exitId,
      certificate_type,
      { schoolId, userId: req.user?.id }
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': pdfBuffer.length
    });
    return res.send(pdfBuffer);
  });

  /**
   * GET /api/v1/student-exits/:id/certificates
   * List certificates for an exit
   */
  getCertificates = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const certificates = await studentExitService.getCertificatesByExit(
      parseInt(req.params.id, 10),
      { schoolId }
    );
    return success(res, certificates, 'Certificates retrieved successfully');
  });

  /**
   * GET /api/v1/student-exits/certificates/:certificateId/download
   * Re-download an existing certificate
   */
  redownloadCertificate = asyncHandler(async (req, res) => {
    const schoolId = ensureSchoolContext(req);
    const certificateId = parseInt(req.params.certificateId, 10);

    const { pdfBuffer, fileName } = await studentExitService.redownloadCertificate(
      certificateId,
      { schoolId, userId: req.user?.id }
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': pdfBuffer.length
    });
    return res.send(pdfBuffer);
  });
}

module.exports = { studentExitController: new StudentExitController() };
