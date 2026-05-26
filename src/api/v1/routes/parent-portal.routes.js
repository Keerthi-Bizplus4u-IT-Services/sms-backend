const express = require('express');
const router = express.Router();
const parentDashboardController = require('../controllers/parent-dashboard.controller');
const achievementController = require('../controllers/achievement.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize } = require('../../../middleware/rbac.middleware');

router.get(
  '/dashboard',
  authenticate,
  authorize(['parent']),
  parentDashboardController.getDashboard
);

router.get(
  '/my-children',
  authenticate,
  authorize(['parent']),
  parentDashboardController.getMyChildren
);

router.get(
  '/child-timetable/:studentId',
  authenticate,
  authorize(['parent']),
  parentDashboardController.getChildTimetable
);

router.get(
  '/achievements',
  authenticate,
  authorize(['parent']),
  achievementController.getParentAchievements
);

module.exports = router;
