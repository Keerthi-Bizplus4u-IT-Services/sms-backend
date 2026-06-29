const express = require('express');
const router = express.Router();
const studentDashboardController = require('../controllers/student-dashboard.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize, enforceTenant } = require('../../../middleware/rbac.middleware');

router.get(
  '/dashboard',
  authenticate,
  enforceTenant(),
  authorize(['student']),
  studentDashboardController.getDashboard
);

router.get(
  '/me',
  authenticate,
  enforceTenant(),
  authorize(['student']),
  studentDashboardController.getMyProfile
);

module.exports = router;
