const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetable.controller');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, authorize, enforceTenant } = require('../../../middleware/rbac.middleware');
const { searchScheduleValidator } = require('../validators/timetable.validator');
const { validate } = require('../../../middleware/validation.middleware');

router.get('/all-class', authenticate, enforceTenant(), requirePermission('timetables:read'), timetableController.getSchedule);
router.get('/my-timetable', authenticate, enforceTenant(), authorize(['student', 'teacher']), timetableController.getMySchedule);
router.post('/allclasssearch', authenticate, enforceTenant(), requirePermission('timetables:read'), searchScheduleValidator, validate, timetableController.searchSchedule);
router.get('/user-info', authenticate, enforceTenant(), authController.getCurrentUserInfo);

module.exports = router;
