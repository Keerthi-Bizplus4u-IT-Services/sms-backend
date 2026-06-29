const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacher.controller');
const {
  createTeacherValidator,
  updateTeacherValidator,
  getTeachersValidator,
  teacherIdValidator
} = require('../validators/teacher.validator');
const { validate } = require('../../../middleware/validation.middleware');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const { uploadTeacherFiles } = require('../../../middleware/photo-upload.middleware');
const { normalizePayload } = require('../../../middleware/payload-normalizer.middleware');
const { enforceTeacherLimit } = require('../../../middleware/trial-limits.middleware');

router.get(
  '/',
  authenticate,
  enforceTenant(),
  requirePermission('teachers:read'),
  getTeachersValidator,
  validate,
  teacherController.getTeachers
);

router.get(
  '/:id',
  authenticate,
  enforceTenant(),
  requirePermission('teachers:read'),
  teacherIdValidator,
  validate,
  teacherController.getTeacherById
);

router.post(
  '/',
  authenticate,
  enforceTenant(),
  requirePermission('teachers:write'),
  enforceTeacherLimit,
  uploadTeacherFiles,
  normalizePayload,
  createTeacherValidator,
  validate,
  teacherController.createTeacher
);

router.put(
  '/:id',
  authenticate,
  enforceTenant(),
  requirePermission('teachers:write'),
  uploadTeacherFiles,
  normalizePayload,
  updateTeacherValidator,
  validate,
  teacherController.updateTeacher
);

router.delete(
  '/:id',
  authenticate,
  enforceTenant(),
  requirePermission('teachers:delete'),
  teacherIdValidator,
  validate,
  teacherController.deleteTeacher
);

module.exports = router;
