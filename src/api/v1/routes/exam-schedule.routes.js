const express = require('express');
const router = express.Router();
const examScheduleController = require('../controllers/exam-schedule.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { authorize, requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const { validate } = require('../../../middleware/validation.middleware');
const {
  listExamSchedulesValidator,
  createLegacyExamScheduleValidator,
  deleteLegacyExamScheduleValidator
} = require('../validators/exam-schedule.validator');

router.get(
  '/exam-schedules',
  authenticate,
  enforceTenant(),
  authorize(['admin', 'principal', 'exam_incharge', 'teacher', 'student', 'parent']),
  listExamSchedulesValidator,
  validate,
  examScheduleController.getExamSchedules
);

router.post(
  '/examschedule',
  authenticate,
  enforceTenant(),
  authorize(['admin', 'principal', 'exam_incharge']),
  createLegacyExamScheduleValidator,
  validate,
  examScheduleController.createLegacySchedule
);

router.delete(
  '/delete-exam-schedule/:id',
  authenticate,
  enforceTenant(),
  authorize(['admin', 'principal', 'exam_incharge']),
  deleteLegacyExamScheduleValidator,
  validate,
  examScheduleController.deleteLegacySchedule
);

module.exports = router;