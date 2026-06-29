const express = require('express');
const router = express.Router();
const { studentExitController } = require('../controllers/student-exit.controller');
const {
  initiateExitValidator,
  generateCertificateValidator,
  exitIdValidator,
  studentExitByStudentValidator,
  certificateDownloadValidator,
  listExitsValidator
} = require('../validators/student-exit.validator');
const { validate } = require('../../../middleware/validation.middleware');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');

/**
 * Student Exit Routes
 * @route /api/v1/student-exits
 */

// All routes require authentication and admin permission
router.use(authenticate, enforceTenant(), requirePermission('students:write'));

/**
 * @route   POST /api/v1/student-exits
 * @desc    Initiate a student exit
 * @access  Private (admin)
 */
router.post(
  '/',
  initiateExitValidator,
  validate,
  studentExitController.initiateExit
);

/**
 * @route   GET /api/v1/student-exits
 * @desc    List all student exits with pagination
 * @access  Private (admin)
 */
router.get(
  '/',
  listExitsValidator,
  validate,
  studentExitController.listExits
);

/**
 * @route   GET /api/v1/student-exits/student/:studentId
 * @desc    Get exit record by student ID
 * @access  Private (admin)
 */
router.get(
  '/student/:studentId',
  studentExitByStudentValidator,
  validate,
  studentExitController.getExitByStudent
);

/**
 * @route   GET /api/v1/student-exits/certificates/:certificateId/download
 * @desc    Re-download an existing certificate PDF
 * @access  Private (admin)
 */
router.get(
  '/certificates/:certificateId/download',
  certificateDownloadValidator,
  validate,
  studentExitController.redownloadCertificate
);

/**
 * @route   GET /api/v1/student-exits/:id
 * @desc    Get exit record by ID
 * @access  Private (admin)
 */
router.get(
  '/:id',
  exitIdValidator,
  validate,
  studentExitController.getExit
);

/**
 * @route   POST /api/v1/student-exits/:id/certificates
 * @desc    Generate a certificate PDF for an exit
 * @access  Private (admin)
 */
router.post(
  '/:id/certificates',
  generateCertificateValidator,
  validate,
  studentExitController.generateCertificate
);

/**
 * @route   GET /api/v1/student-exits/:id/certificates
 * @desc    List certificates for an exit
 * @access  Private (admin)
 */
router.get(
  '/:id/certificates',
  exitIdValidator,
  validate,
  studentExitController.getCertificates
);

module.exports = router;
