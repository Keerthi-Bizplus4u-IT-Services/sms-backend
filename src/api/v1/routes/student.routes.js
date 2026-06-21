const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const {
  createStudentValidator,
  updateStudentValidator,
  getStudentsValidator,
  getAdmissionRollSuggestionValidator,
  studentIdValidator,
  promoteStudentsValidator,
  studentsByClassValidator,
  studentsBySectionValidator
} = require('../validators/student.validator');
const { validate } = require('../../../middleware/validation.middleware');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const { uploadStudentFiles, uploadSingleAadhar } = require('../../../middleware/photo-upload.middleware');
const { normalizePayload } = require('../../../middleware/payload-normalizer.middleware');
const { enforceStudentLimit } = require('../../../middleware/trial-limits.middleware');

/**
 * Student Routes
 * @route /api/v1/students
 */

/**
 * @route   GET /api/v1/students
 * @desc    Get all students with pagination and filters
 * @access  Private (admin, teacher)
 */
router.get(
  '/',
  authenticate,
  requirePermission('students:read'),
  getStudentsValidator,
  validate,
  studentController.getStudents
);

/**
 * @route   GET /api/v1/students/suggestions/admission-roll
 * @desc    Suggest next admission number, section and roll number for admissions
 * @access  Private (admin, teacher)
 */
router.get(
  '/suggestions/admission-roll',
  authenticate,
  requirePermission('students:read'),
  getAdmissionRollSuggestionValidator,
  validate,
  studentController.getAdmissionRollSuggestion
);

/**
 * @route   POST /api/v1/students/upload-document
 * @desc    Upload a single aadhar document to Bunny CDN
 * @access  Private (admin)
 */
router.post(
  '/upload-document',
  authenticate,
  requirePermission('students:write'),
  uploadSingleAadhar,
  studentController.uploadDocument
);

/**
 * @route   GET /api/v1/students/:id
 * @desc    Get student by ID
 * @access  Private (admin, teacher, student, parent)
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('students:read'),
  studentIdValidator,
  validate,
  studentController.getStudentById
);

/**
 * @route   GET /api/v1/students/admission/:admissionNumber
 * @desc    Get student by admission number
 * @access  Private (admin, teacher)
 */
router.get(
  '/admission/:admissionNumber',
  authenticate,
  requirePermission('students:read'),
  studentController.getStudentByAdmissionNumber
);

/**
 * @route   GET /api/v1/students/roll/:rollNumber
 * @desc    Get student by roll number
 * @access  Private (admin, teacher, accounts)
 */
router.get(
  '/roll/:rollNumber',
  authenticate,
  requirePermission('students:read'),
  studentController.getStudentByRollNumber
);

/**
 * @route   GET /api/v1/students/class/:classId
 * @desc    Get students by class
 * @access  Private (admin, teacher)
 */
router.get(
  '/class/:classId',
  authenticate,
  requirePermission('students:read'),
  studentsByClassValidator,
  validate,
  studentController.getStudentsByClass
);

/**
 * @route   GET /api/v1/students/class/:classId/section/:sectionId
 * @desc    Get students by section
 * @access  Private (admin, teacher)
 */
router.get(
  '/class/:classId/section/:sectionId',
  authenticate,
  requirePermission('students:read'),
  studentsBySectionValidator,
  validate,
  studentController.getStudentsBySection
);

/**
 * @route   POST /api/v1/students
 * @desc    Create new student
 * @access  Private (admin)
 */
router.post(
  '/',
  authenticate,
  requirePermission('students:write'),
  enforceStudentLimit,
  uploadStudentFiles,
  normalizePayload,
  createStudentValidator,
  validate,
  studentController.createStudent
);

/**
 * @route   PUT /api/v1/students/:id
 * @desc    Update student
 * @access  Private (admin)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('students:write'),
  uploadStudentFiles,
  normalizePayload,
  updateStudentValidator,
  validate,
  studentController.updateStudent
);

/**
 * @route   DELETE /api/v1/students/:id
 * @desc    Delete student
 * @access  Private (admin)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('students:delete'),
  studentIdValidator,
  validate,
  studentController.deleteStudent
);

/**
 * @route   POST /api/v1/students/promotions
 * @desc    Promote students between classes/academic years
 * @access  Private (admin)
 */
router.post(
  '/promotions',
  authenticate,
  requirePermission('students:write'),
  promoteStudentsValidator,
  validate,
  studentController.promoteStudents
);

module.exports = router;
