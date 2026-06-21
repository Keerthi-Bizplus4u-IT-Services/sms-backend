const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetable.controller');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, authorize } = require('../../../middleware/rbac.middleware');
const { searchScheduleValidator } = require('../validators/timetable.validator');
const { validate } = require('../../../middleware/validation.middleware');

router.get('/all-class', authenticate, requirePermission('timetables:read'), timetableController.getSchedule);
router.get('/my-timetable', authenticate, authorize(['student', 'teacher']), timetableController.getMySchedule);
router.post('/allclasssearch', authenticate, requirePermission('timetables:read'), searchScheduleValidator, validate, timetableController.searchSchedule);
router.get('/user-info', authenticate, authController.getCurrentUserInfo);

module.exports = router;
