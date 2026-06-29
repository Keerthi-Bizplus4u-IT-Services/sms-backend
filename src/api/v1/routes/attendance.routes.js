const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize, enforceTenant } = require('../../../middleware/rbac.middleware');
const { getAttendanceValidator, saveAttendanceValidator } = require('../validators/attendance.validator');
const { validate } = require('../../../middleware/validation.middleware');

/**
 * Attendance Routes
 */

// POST /api/v1/getattendence — get attendance (students see only their own)
router.post(
  '/getattendence',
  authenticate,
  enforceTenant(),
  authorize(['admin', 'teacher', 'student', 'parent']),
  getAttendanceValidator,
  validate,
  attendanceController.getAttendance
);

// POST /api/v1/saveattendance — save attendance (admin/teacher only)
router.post(
  '/saveattendance',
  authenticate,
  enforceTenant(),
  authorize(['admin', 'teacher']),
  saveAttendanceValidator,
  validate,
  attendanceController.saveAttendance
);

// POST /api/v1/addattendance — legacy alias for save attendance (admin/teacher only)
router.post(
  '/addattendance',
  authenticate,
  enforceTenant(),
  authorize(['admin', 'teacher']),
  saveAttendanceValidator,
  validate,
  attendanceController.saveAttendance
);

module.exports = router;
