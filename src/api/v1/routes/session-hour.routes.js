const express = require('express');
const router = express.Router();
const sessionHourController = require('../controllers/session-hour.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const { createSessionHourValidator, updateSessionHourValidator, sessionHourIdValidator, listSessionHoursValidator } = require('../validators/session-hour.validator');
const { validate } = require('../../../middleware/validation.middleware');

router.get('/', authenticate, requirePermission('session-hours:read'), listSessionHoursValidator, validate, sessionHourController.getSessionHours);
router.get('/effective', authenticate, requirePermission('session-hours:read'), sessionHourController.getEffectiveSessionHours);
router.post('/', authenticate, requirePermission('session-hours:write'), createSessionHourValidator, validate, sessionHourController.createSessionHour);
router.put('/:id', authenticate, requirePermission('session-hours:write'), updateSessionHourValidator, validate, sessionHourController.updateSessionHour);
router.delete('/:id', authenticate, requirePermission('session-hours:delete'), sessionHourIdValidator, validate, sessionHourController.deleteSessionHour);

module.exports = router;
