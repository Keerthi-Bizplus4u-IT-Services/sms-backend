const express = require('express');
const router = express.Router();
const academicYearController = require('../controllers/academic-year.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const { validate } = require('../../../middleware/validation.middleware');
const {
  createAcademicYearValidator,
  updateAcademicYearValidator,
  academicYearIdParamValidator,
  listAcademicYearValidator,
  migrationDraftValidator,
  migrationFinalizeValidator
} = require('../validators/academic-year.validator');

router.get(
  '/',
  authenticate,
  requirePermission('academic-years:read'),
  listAcademicYearValidator,
  validate,
  academicYearController.getAcademicYears
);

router.get(
  '/current',
  authenticate,
  requirePermission('academic-years:read'),
  academicYearController.getCurrentAcademicYear
);

router.post(
  '/',
  authenticate,
  requirePermission('academic-years:write'),
  createAcademicYearValidator,
  validate,
  academicYearController.createAcademicYear
);

router.put(
  '/:id',
  authenticate,
  requirePermission('academic-years:write'),
  updateAcademicYearValidator,
  validate,
  academicYearController.updateAcademicYear
);

router.patch(
  '/:id/set-current',
  authenticate,
  requirePermission('academic-years:write'),
  academicYearIdParamValidator,
  validate,
  academicYearController.setCurrentAcademicYear
);

router.post(
  '/migration/draft',
  authenticate,
  requirePermission('academic-years:write'),
  migrationDraftValidator,
  validate,
  academicYearController.createMigrationDraft
);

router.post(
  '/migration/finalize',
  authenticate,
  requirePermission('academic-years:write'),
  migrationFinalizeValidator,
  validate,
  academicYearController.finalizeMigration
);

module.exports = router;
