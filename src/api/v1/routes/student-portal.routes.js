const express = require('express');
const router = express.Router();
const studentDashboardController = require('../controllers/student-dashboard.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize } = require('../../../middleware/rbac.middleware');

router.get(
  '/dashboard',
  authenticate,
  authorize(['student']),
  studentDashboardController.getDashboard
);

router.get(
  '/me',
  authenticate,
  authorize(['student']),
  studentDashboardController.getMyProfile
);

module.exports = router;
