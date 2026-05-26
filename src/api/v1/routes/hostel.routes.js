const express = require('express');
const router = express.Router();
const hostelController = require('../controllers/hostel.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const { addRoomValidator, roomIdValidator } = require('../validators/hostel.validator');
const { validate } = require('../../../middleware/validation.middleware');

/**
 * Hostel Routes
 */

// GET /api/v1/hostel-rooms
router.get('/hostel-rooms', authenticate, requirePermission('hostels:read'), hostelController.getHostelRooms);

// POST /api/v1/addroom
router.post('/addroom', authenticate, requirePermission('hostels:write'), addRoomValidator, validate, hostelController.addRoom);

// DELETE /api/v1/delete-room/:id
router.delete('/delete-room/:id', authenticate, requirePermission('hostels:delete'), roomIdValidator, validate, hostelController.deleteRoom);

module.exports = router;
