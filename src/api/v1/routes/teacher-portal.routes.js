const express = require('express');
const router = express.Router();
const teacherDashboardController = require('../controllers/teacher-dashboard.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize, enforceTenant } = require('../../../middleware/rbac.middleware');

router.get(
  '/dashboard',
  authenticate,
  enforceTenant(),
  authorize(['teacher']),
  teacherDashboardController.getDashboard
);

module.exports = router;
