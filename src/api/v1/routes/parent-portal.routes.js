const express = require('express');
const router = express.Router();
const parentDashboardController = require('../controllers/parent-dashboard.controller');
const achievementController = require('../controllers/achievement.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize, enforceTenant } = require('../../../middleware/rbac.middleware');

router.get(
  '/dashboard',
  authenticate,
  enforceTenant(),
  authorize(['parent']),
  parentDashboardController.getDashboard
);

router.get(
  '/my-children',
  authenticate,
  enforceTenant(),
  authorize(['parent']),
  parentDashboardController.getMyChildren
);

router.get(
  '/child-timetable/:studentId',
  authenticate,
  enforceTenant(),
  authorize(['parent']),
  parentDashboardController.getChildTimetable
);

router.get(
  '/achievements',
  authenticate,
  enforceTenant(),
  authorize(['parent']),
  achievementController.getParentAchievements
);

module.exports = router;
