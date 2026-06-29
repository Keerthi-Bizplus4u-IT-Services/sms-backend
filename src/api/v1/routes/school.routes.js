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
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const { enforceBranchLimit } = require('../../../middleware/trial-limits.middleware');

router.get('/', authenticate, enforceTenant(), requirePermission('schools:read'), listSchoolsValidator, validate, schoolController.listSchools);
router.get('/:id', authenticate, enforceTenant(), requirePermission('schools:read'), schoolIdValidator, validate, schoolController.getSchool);
router.post('/', authenticate, enforceTenant(), requirePermission('schools:write'), createSchoolValidator, validate, schoolController.createSchool);
router.post('/onboarding', authenticate, enforceTenant(), requirePermission('schools:write'), createSchoolOnboardingValidator, validate, schoolController.createSchoolOnboarding);
router.put('/:id', authenticate, enforceTenant(), requirePermission('schools:write'), updateSchoolValidator, validate, schoolController.updateSchool);
router.delete('/:id', authenticate, enforceTenant(), requirePermission('schools:delete'), schoolIdValidator, validate, schoolController.deleteSchool);
router.get('/:id/onboarding-checklist', authenticate, enforceTenant(), requirePermission('schools:read'), schoolIdValidator, validate, schoolController.getOnboardingChecklist);
router.post('/:id/clone-settings', authenticate, enforceTenant(), requirePermission('schools:write'), schoolCloneSettingsValidator, validate, schoolController.cloneSchoolSettings);
router.get('/:id/settings', authenticate, enforceTenant(), requirePermission('schools:read'), schoolSettingsValidator, validate, schoolController.getSchoolSettings);
router.put('/:id/settings', authenticate, enforceTenant(), requirePermission('schools:write'), schoolSettingsValidator, validate, schoolController.updateSchoolSettings);

// Dummy data routes
router.post('/:id/import-dummy-data', authenticate, enforceTenant(), requirePermission('schools:write'), dummyDataValidator, validate, schoolController.importDummyData);
router.delete('/:id/dummy-data', authenticate, enforceTenant(), requirePermission('schools:delete'), dummyDataValidator, validate, schoolController.deleteDummyData);

// Branch sub-routes
router.get('/:id/branches', authenticate, enforceTenant(), requirePermission('schools:read'), schoolIdValidator, validate, schoolController.listBranches);
router.post('/:id/branches', authenticate, enforceTenant(), requirePermission('schools:write'), enforceBranchLimit, createBranchValidator, validate, schoolController.createBranch);

module.exports = router;
