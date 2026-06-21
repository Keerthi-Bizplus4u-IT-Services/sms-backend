const express = require('express');
const router = express.Router();
const classTimetableController = require('../controllers/class-timetable.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const { validate } = require('../../../middleware/validation.middleware');
const {
  createTimetableEntryValidator,
  updateTimetableEntryValidator,
  changeTeacherValidator,
  timetableEntryIdValidator,
  listTimetableEntriesValidator,
  listTimetablePeriodsValidator
} = require('../validators/class-timetable.validator');

// List / Read
router.get('/', authenticate, requirePermission('timetables:read'), listTimetableEntriesValidator, validate, classTimetableController.getEntries);

// Timetable periods
router.get('/periods', authenticate, requirePermission('timetables:read'), listTimetablePeriodsValidator, validate, classTimetableController.getPeriods);

// Teacher workload (admin)
router.get('/teacher-workload', authenticate, requirePermission('timetables:read'), classTimetableController.getTeacherWorkload);
router.get('/teacher-workload/:teacherId', authenticate, requirePermission('timetables:read'), classTimetableController.getTeacherWorkloadDetail);

// Create
router.post('/', authenticate, requirePermission('timetables:write'), createTimetableEntryValidator, validate, classTimetableController.createEntry);

// Update
router.put('/:id', authenticate, requirePermission('timetables:write'), updateTimetableEntryValidator, validate, classTimetableController.updateEntry);

// Change teacher
router.patch('/:id/change-teacher', authenticate, requirePermission('timetables:write'), changeTeacherValidator, validate, classTimetableController.changeTeacher);

// Delete
router.delete('/:id', authenticate, requirePermission('timetables:delete'), timetableEntryIdValidator, validate, classTimetableController.deleteEntry);

module.exports = router;
