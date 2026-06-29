const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievement.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize, enforceTenant } = require('../../../middleware/rbac.middleware');

// Admin endpoints
router.get(
  '/',
  authenticate,
  enforceTenant(),
  authorize(['admin', 'principal', 'super_admin']),
  achievementController.getSchoolAchievements
);

router.post(
  '/',
  authenticate,
  enforceTenant(),
  authorize(['admin', 'principal', 'teacher']),
  achievementController.createAchievement
);

module.exports = router;
