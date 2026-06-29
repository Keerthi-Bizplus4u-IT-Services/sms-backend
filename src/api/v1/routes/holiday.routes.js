const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holiday.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission, enforceTenant } = require('../../../middleware/rbac.middleware');
const { createHolidayValidator, holidayIdValidator } = require('../validators/holiday.validator');
const { validate } = require('../../../middleware/validation.middleware');

/**
 * Holiday Routes
 * Mounted at /api/v1 (root) for frontend legacy compatibility
 */

// GET /api/v1/holidays
router.get('/holidays', authenticate, enforceTenant(), requirePermission('holidays:read'), holidayController.getHolidays);

// POST /api/v1/calendar (Mapped to create holiday)
router.post('/calendar', authenticate, enforceTenant(), requirePermission('holidays:write'), createHolidayValidator, validate, holidayController.createHoliday);

// DELETE /api/v1/delete-holiday/:id
router.delete('/delete-holiday/:id', authenticate, enforceTenant(), requirePermission('holidays:delete'), holidayIdValidator, validate, holidayController.deleteHoliday);

module.exports = router;
