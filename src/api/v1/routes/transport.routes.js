const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transport.controller');
const {
  listRoutesValidator,
  createRouteValidator,
  updateRouteValidator,
  routeIdValidator,
  createStopValidator,
  updateStopValidator,
  stopIdValidator,
  bulkStopTimingsValidator,
  listVehiclesValidator,
  createVehicleValidator,
  updateVehicleValidator,
  vehicleIdValidator,
  listStudentTransportValidator,
  assignStudentValidator,
  updateStudentTransportValidator,
  studentTransportIdValidator,
  generateFeesValidator
} = require('../validators/transport.validator');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requirePermission } = require('../../../middleware/rbac.middleware');
const { validate } = require('../../../middleware/validation.middleware');

// ─── Routes CRUD ───────────────────────────────────────
router.get(
  '/routes',
  authenticate,
  requirePermission('transport:read'),
  listRoutesValidator,
  validate,
  transportController.getRoutes
);

router.get(
  '/routes/active',
  authenticate,
  requirePermission('transport:read'),
  transportController.getActiveRoutes
);

router.get(
  '/routes/:id',
  authenticate,
  requirePermission('transport:read'),
  routeIdValidator,
  validate,
  transportController.getRoute
);

router.post(
  '/routes',
  authenticate,
  requirePermission('transport:write'),
  createRouteValidator,
  validate,
  transportController.createRoute
);

router.put(
  '/routes/:id',
  authenticate,
  requirePermission('transport:write'),
  updateRouteValidator,
  validate,
  transportController.updateRoute
);

router.delete(
  '/routes/:id',
  authenticate,
  requirePermission('transport:delete'),
  routeIdValidator,
  validate,
  transportController.deleteRoute
);

// ─── Stops (nested under routes) ───────────────────────
router.get(
  '/routes/:routeId/stops',
  authenticate,
  requirePermission('transport:read'),
  [require('express-validator').param('routeId').isInt({ min: 1 })],
  validate,
  transportController.getStops
);

router.post(
  '/routes/:routeId/stops',
  authenticate,
  requirePermission('transport:write'),
  createStopValidator,
  validate,
  transportController.createStop
);

router.put(
  '/routes/:routeId/stops/:stopId',
  authenticate,
  requirePermission('transport:write'),
  updateStopValidator,
  validate,
  transportController.updateStop
);

router.delete(
  '/routes/:routeId/stops/:stopId',
  authenticate,
  requirePermission('transport:delete'),
  stopIdValidator,
  validate,
  transportController.deleteStop
);

router.put(
  '/routes/:routeId/stops-bulk',
  authenticate,
  requirePermission('transport:write'),
  bulkStopTimingsValidator,
  validate,
  transportController.bulkUpdateStopTimings
);

// ─── Vehicles CRUD ─────────────────────────────────────
router.get(
  '/vehicles',
  authenticate,
  requirePermission('transport:read'),
  listVehiclesValidator,
  validate,
  transportController.getVehicles
);

router.get(
  '/vehicles/active',
  authenticate,
  requirePermission('transport:read'),
  transportController.getActiveVehicles
);

router.get(
  '/vehicles/:id',
  authenticate,
  requirePermission('transport:read'),
  vehicleIdValidator,
  validate,
  transportController.getVehicle
);

router.post(
  '/vehicles',
  authenticate,
  requirePermission('transport:write'),
  createVehicleValidator,
  validate,
  transportController.createVehicle
);

router.put(
  '/vehicles/:id',
  authenticate,
  requirePermission('transport:write'),
  updateVehicleValidator,
  validate,
  transportController.updateVehicle
);

router.delete(
  '/vehicles/:id',
  authenticate,
  requirePermission('transport:delete'),
  vehicleIdValidator,
  validate,
  transportController.deleteVehicle
);

// ─── Drivers ───────────────────────────────────────────
router.get(
  '/drivers',
  authenticate,
  requirePermission('transport:read'),
  transportController.getDrivers
);

// ─── Student Assignments ───────────────────────────────
router.get(
  '/students',
  authenticate,
  requirePermission('transport:read'),
  listStudentTransportValidator,
  validate,
  transportController.getStudentAssignments
);

router.get(
  '/students/:id',
  authenticate,
  requirePermission('transport:read'),
  studentTransportIdValidator,
  validate,
  transportController.getStudentAssignment
);

router.post(
  '/students',
  authenticate,
  requirePermission('transport:write'),
  assignStudentValidator,
  validate,
  transportController.assignStudent
);

router.put(
  '/students/:id',
  authenticate,
  requirePermission('transport:write'),
  updateStudentTransportValidator,
  validate,
  transportController.updateStudentAssignment
);

router.delete(
  '/students/:id',
  authenticate,
  requirePermission('transport:delete'),
  studentTransportIdValidator,
  validate,
  transportController.deleteStudentAssignment
);

// ─── Fee Generation ────────────────────────────────────
router.post(
  '/fees/generate',
  authenticate,
  requirePermission('transport:write'),
  generateFeesValidator,
  validate,
  transportController.generateFees
);

module.exports = router;

