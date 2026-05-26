const express = require('express');
const router = express.Router();

const schoolController = require('../controllers/school.controller');
const {
  schoolIdValidator,
  createSchoolValidator,
  updateSchoolValidator,
  createBranchValidator,
  listSchoolsValidator,
  createSchoolOnboardingValidator,
  schoolCloneSettingsValidator,
  schoolSettingsValidator,
  dummyDataValidator
} = require('../validators/school.validator');
const { validate } = require('../../../middleware/validation.middleware');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const { enforceBranchLimit } = require('../../../middleware/trial-limits.middleware');

router.get('/', authenticate, requirePermission('schools:read'), listSchoolsValidator, validate, schoolController.listSchools);
router.get('/:id', authenticate, requirePermission('schools:read'), schoolIdValidator, validate, schoolController.getSchool);
router.post('/', authenticate, requirePermission('schools:write'), createSchoolValidator, validate, schoolController.createSchool);
router.post('/onboarding', authenticate, requirePermission('schools:write'), createSchoolOnboardingValidator, validate, schoolController.createSchoolOnboarding);
router.put('/:id', authenticate, requirePermission('schools:write'), updateSchoolValidator, validate, schoolController.updateSchool);
router.delete('/:id', authenticate, requirePermission('schools:delete'), schoolIdValidator, validate, schoolController.deleteSchool);
router.get('/:id/onboarding-checklist', authenticate, requirePermission('schools:read'), schoolIdValidator, validate, schoolController.getOnboardingChecklist);
router.post('/:id/clone-settings', authenticate, requirePermission('schools:write'), schoolCloneSettingsValidator, validate, schoolController.cloneSchoolSettings);
router.get('/:id/settings', authenticate, requirePermission('schools:read'), schoolSettingsValidator, validate, schoolController.getSchoolSettings);
router.put('/:id/settings', authenticate, requirePermission('schools:write'), schoolSettingsValidator, validate, schoolController.updateSchoolSettings);

// Dummy data routes
router.post('/:id/import-dummy-data', authenticate, requirePermission('schools:write'), dummyDataValidator, validate, schoolController.importDummyData);
router.delete('/:id/dummy-data', authenticate, requirePermission('schools:delete'), dummyDataValidator, validate, schoolController.deleteDummyData);

// Branch sub-routes
router.get('/:id/branches', authenticate, requirePermission('schools:read'), schoolIdValidator, validate, schoolController.listBranches);
router.post('/:id/branches', authenticate, requirePermission('schools:write'), enforceBranchLimit, createBranchValidator, validate, schoolController.createBranch);

module.exports = router;
