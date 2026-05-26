const transportService = require('../services/transport.service');
const { success } = require('../../../utils/response');
const { asyncHandler } = require('../../../middleware/error.middleware');

class TransportController {
  _getSchoolId(req) {
    return req.user?.schoolId || req.session?.schoolId || 1;
  }

  // ─── Routes ──────────────────────────────────────────
  getRoutes = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const data = await transportService.listRoutes(req.query, schoolId);
    return success(res, data, 'Transport routes retrieved successfully');
  });

  getRoute = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const route = await transportService.getRouteById(req.params.id, schoolId);
    return success(res, route, 'Transport route retrieved successfully');
  });

  createRoute = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const route = await transportService.createRoute(req.body, schoolId);
    return success(res, route, 'Transport route created successfully', 201);
  });

  updateRoute = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const route = await transportService.updateRoute(req.params.id, req.body, schoolId);
    return success(res, route, 'Transport route updated successfully');
  });

  deleteRoute = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    await transportService.deleteRoute(req.params.id, schoolId);
    return success(res, { deleted: true }, 'Transport route deleted successfully');
  });

  getActiveRoutes = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const routes = await transportService.listActiveRoutes(schoolId);
    return success(res, routes, 'Active routes retrieved successfully');
  });

  // ─── Stops ───────────────────────────────────────────
  getStops = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const stops = await transportService.listStops(req.params.routeId, schoolId);
    return success(res, stops, 'Route stops retrieved successfully');
  });

  createStop = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const stop = await transportService.createStop(
      { ...req.body, routeId: parseInt(req.params.routeId, 10) },
      schoolId
    );
    return success(res, stop, 'Stop created successfully', 201);
  });

  updateStop = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const stop = await transportService.updateStop(req.params.stopId, req.body, schoolId);
    return success(res, stop, 'Stop updated successfully');
  });

  deleteStop = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    await transportService.deleteStop(req.params.stopId, schoolId);
    return success(res, { deleted: true }, 'Stop deleted successfully');
  });

  bulkUpdateStopTimings = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const stops = await transportService.bulkUpdateStopTimings(
      req.params.routeId, req.body.stops, schoolId
    );
    return success(res, stops, 'Stop timings updated successfully');
  });

  // ─── Vehicles ────────────────────────────────────────
  getVehicles = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const data = await transportService.listVehicles(req.query, schoolId);
    return success(res, data, 'Vehicles retrieved successfully');
  });

  getVehicle = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const vehicle = await transportService.getVehicleById(req.params.id, schoolId);
    return success(res, vehicle, 'Vehicle retrieved successfully');
  });

  createVehicle = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const vehicle = await transportService.createVehicle(req.body, schoolId);
    return success(res, vehicle, 'Vehicle created successfully', 201);
  });

  updateVehicle = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const vehicle = await transportService.updateVehicle(req.params.id, req.body, schoolId);
    return success(res, vehicle, 'Vehicle updated successfully');
  });

  deleteVehicle = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    await transportService.deleteVehicle(req.params.id, schoolId);
    return success(res, { deleted: true }, 'Vehicle deleted successfully');
  });

  getActiveVehicles = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const vehicles = await transportService.listActiveVehicles(schoolId);
    return success(res, vehicles, 'Active vehicles retrieved successfully');
  });

  getDrivers = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const drivers = await transportService.listDrivers(schoolId);
    return success(res, drivers, 'Drivers retrieved successfully');
  });

  // ─── Student Assignments ─────────────────────────────
  getStudentAssignments = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const data = await transportService.listStudentAssignments(req.query, schoolId);
    return success(res, data, 'Student transport assignments retrieved successfully');
  });

  getStudentAssignment = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const record = await transportService.getStudentAssignment(req.params.id, schoolId);
    return success(res, record, 'Student transport assignment retrieved successfully');
  });

  assignStudent = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const record = await transportService.assignStudent(req.body, schoolId);
    return success(res, record, 'Student assigned to transport successfully', 201);
  });

  updateStudentAssignment = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const record = await transportService.updateStudentAssignment(req.params.id, req.body, schoolId);
    return success(res, record, 'Student transport assignment updated successfully');
  });

  deleteStudentAssignment = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    await transportService.deleteStudentAssignment(req.params.id, schoolId);
    return success(res, { deleted: true }, 'Student transport assignment removed successfully');
  });

  // ─── Fee Generation ──────────────────────────────────
  generateFees = asyncHandler(async (req, res) => {
    const schoolId = this._getSchoolId(req);
    const result = await transportService.generateTransportFees(
      schoolId, req.body.academicYearId, req.body.dueTerm
    );
    return success(res, result, 'Transport fees generated successfully', 201);
  });
}

module.exports = new TransportController();

