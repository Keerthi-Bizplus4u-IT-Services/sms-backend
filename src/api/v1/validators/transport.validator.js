const { body, param, query } = require('express-validator');

// ─── Route Validators ──────────────────────────────────
const listRoutesValidator = [
  query('page').optional().isInt({ min: 0 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 100 })
];

const createRouteValidator = [
  body('routeCode').trim().notEmpty().withMessage('Route code is required').isLength({ max: 20 }),
  body('routeName').trim().notEmpty().withMessage('Route name is required').isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('totalDistanceKm').optional().isFloat({ min: 0, max: 9999 }),
  body('estimatedDurationMinutes').optional().isInt({ min: 0, max: 1440 }),
  body('startPoint').optional().trim().isLength({ max: 255 }),
  body('endPoint').optional().trim().isLength({ max: 255 }),
  body('monthlyFee').optional().isFloat({ min: 0, max: 99999999 }),
  body('isActive').optional().isBoolean()
];

const updateRouteValidator = [
  param('id').isInt({ min: 1 }),
  body('routeCode').optional().trim().isLength({ max: 20 }),
  body('routeName').optional().trim().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('totalDistanceKm').optional().isFloat({ min: 0, max: 9999 }),
  body('estimatedDurationMinutes').optional().isInt({ min: 0, max: 1440 }),
  body('startPoint').optional().trim().isLength({ max: 255 }),
  body('endPoint').optional().trim().isLength({ max: 255 }),
  body('monthlyFee').optional().isFloat({ min: 0, max: 99999999 }),
  body('isActive').optional().isBoolean()
];

const routeIdValidator = [param('id').isInt({ min: 1 })];

// ─── Stop Validators ───────────────────────────────────
const createStopValidator = [
  param('routeId').isInt({ min: 1 }),
  body('stopName').trim().notEmpty().withMessage('Stop name is required').isLength({ max: 100 }),
  body('stopOrder').optional().isInt({ min: 1, max: 255 }),
  body('pickupTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/).withMessage('Invalid time format (HH:MM)'),
  body('dropTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/).withMessage('Invalid time format (HH:MM)'),
  body('distanceFromSchoolKm').optional().isFloat({ min: 0, max: 9999 }),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('landmark').optional().trim().isLength({ max: 255 }),
  body('stopFee').optional().isFloat({ min: 0, max: 99999999 }),
  body('isActive').optional().isBoolean()
];

const updateStopValidator = [
  param('routeId').isInt({ min: 1 }),
  param('stopId').isInt({ min: 1 }),
  body('stopName').optional().trim().isLength({ max: 100 }),
  body('stopOrder').optional().isInt({ min: 1, max: 255 }),
  body('pickupTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/).withMessage('Invalid time format'),
  body('dropTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/).withMessage('Invalid time format'),
  body('distanceFromSchoolKm').optional().isFloat({ min: 0, max: 9999 }),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('landmark').optional().trim().isLength({ max: 255 }),
  body('stopFee').optional().isFloat({ min: 0, max: 99999999 }),
  body('isActive').optional().isBoolean()
];

const stopIdValidator = [
  param('routeId').isInt({ min: 1 }),
  param('stopId').isInt({ min: 1 })
];

const bulkStopTimingsValidator = [
  param('routeId').isInt({ min: 1 }),
  body('stops').isArray({ min: 1 }).withMessage('Stops array is required'),
  body('stops.*.id').isInt({ min: 1 }),
  body('stops.*.stopOrder').isInt({ min: 1, max: 255 }),
  body('stops.*.pickupTime').optional({ nullable: true }).matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/),
  body('stops.*.dropTime').optional({ nullable: true }).matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
];

// ─── Vehicle Validators ────────────────────────────────
const listVehiclesValidator = [
  query('page').optional().isInt({ min: 0 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 100 }),
  query('status').optional().isIn(['active', 'maintenance', 'inactive', 'retired'])
];

const createVehicleValidator = [
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required').isLength({ max: 20 }),
  body('vehicleName').optional().trim().isLength({ max: 100 }),
  body('vehicleType').notEmpty().isIn(['bus', 'van', 'mini_bus', 'auto', 'car']).withMessage('Invalid vehicle type'),
  body('capacity').isInt({ min: 1, max: 200 }).withMessage('Capacity must be 1-200'),
  body('fuelType').notEmpty().isIn(['diesel', 'petrol', 'cng', 'electric']).withMessage('Invalid fuel type'),
  body('registrationDate').optional().isISO8601(),
  body('insuranceExpiry').optional().isISO8601(),
  body('fitnessCertificateExpiry').optional().isISO8601(),
  body('pollutionCertificateExpiry').optional().isISO8601(),
  body('roadTaxExpiry').optional().isISO8601(),
  body('lastServiceDate').optional().isISO8601(),
  body('nextServiceDate').optional().isISO8601(),
  body('odometerReading').optional().isInt({ min: 0 }),
  body('driverId').optional({ nullable: true }).isInt({ min: 1 }),
  body('conductorId').optional({ nullable: true }).isInt({ min: 1 }),
  body('assignmentDate').optional().isISO8601(),
  body('status').optional().isIn(['active', 'maintenance', 'inactive', 'retired'])
];

const updateVehicleValidator = [
  param('id').isInt({ min: 1 }),
  body('vehicleNumber').optional().trim().isLength({ max: 20 }),
  body('vehicleName').optional().trim().isLength({ max: 100 }),
  body('vehicleType').optional().isIn(['bus', 'van', 'mini_bus', 'auto', 'car']),
  body('capacity').optional().isInt({ min: 1, max: 200 }),
  body('fuelType').optional().isIn(['diesel', 'petrol', 'cng', 'electric']),
  body('registrationDate').optional().isISO8601(),
  body('insuranceExpiry').optional().isISO8601(),
  body('fitnessCertificateExpiry').optional().isISO8601(),
  body('pollutionCertificateExpiry').optional().isISO8601(),
  body('roadTaxExpiry').optional().isISO8601(),
  body('lastServiceDate').optional().isISO8601(),
  body('nextServiceDate').optional().isISO8601(),
  body('odometerReading').optional().isInt({ min: 0 }),
  body('driverId').optional({ nullable: true }).isInt({ min: 1 }),
  body('conductorId').optional({ nullable: true }).isInt({ min: 1 }),
  body('assignmentDate').optional().isISO8601(),
  body('status').optional().isIn(['active', 'maintenance', 'inactive', 'retired'])
];

const vehicleIdValidator = [param('id').isInt({ min: 1 })];

// ─── Student Transport Validators ──────────────────────
const listStudentTransportValidator = [
  query('page').optional().isInt({ min: 0 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 100 }),
  query('routeId').optional().isInt({ min: 1 }),
  query('classId').optional().isInt({ min: 1 }),
  query('status').optional().isIn(['active', 'inactive', 'suspended', 'cancelled']),
  query('academicYearId').optional().isInt({ min: 1 })
];

const assignStudentValidator = [
  body('studentId').isInt({ min: 1 }).withMessage('Student ID is required'),
  body('routeId').isInt({ min: 1 }).withMessage('Route ID is required'),
  body('stopId').isInt({ min: 1 }).withMessage('Stop ID is required'),
  body('academicYearId').isInt({ min: 1 }).withMessage('Academic year ID is required'),
  body('vehicleId').optional({ nullable: true }).isInt({ min: 1 }),
  body('transportFee').optional().isFloat({ min: 0, max: 99999999 }),
  body('startDate').optional({ nullable: true }).isISO8601(),
  body('endDate').optional({ nullable: true }).isISO8601(),
  body('shift').optional().isIn(['morning', 'evening', 'both']),
  body('dueTerm').optional().isIn(['annual', 'term_1', 'term_2', 'term_3', 'semester_1', 'semester_2']),
  body('remarks').optional().trim().isLength({ max: 1000 })
];

const updateStudentTransportValidator = [
  param('id').isInt({ min: 1 }),
  body('routeId').optional().isInt({ min: 1 }),
  body('stopId').optional().isInt({ min: 1 }),
  body('vehicleId').optional({ nullable: true }).isInt({ min: 1 }),
  body('transportFee').optional().isFloat({ min: 0, max: 99999999 }),
  body('startDate').optional({ nullable: true }).isISO8601(),
  body('endDate').optional({ nullable: true }).isISO8601(),
  body('shift').optional().isIn(['morning', 'evening', 'both']),
  body('dueTerm').optional().isIn(['annual', 'term_1', 'term_2', 'term_3', 'semester_1', 'semester_2']),
  body('status').optional().isIn(['active', 'inactive', 'suspended', 'cancelled']),
  body('remarks').optional().trim().isLength({ max: 1000 })
];

const studentTransportIdValidator = [param('id').isInt({ min: 1 })];

// ─── Fee Validators ────────────────────────────────────
const generateFeesValidator = [
  body('academicYearId').isInt({ min: 1 }).withMessage('Academic year ID is required'),
  body('dueTerm').optional().isIn(['annual', 'semester_1', 'semester_2', 'term_1', 'term_2', 'term_3'])
];

module.exports = {
  // Routes
  listRoutesValidator,
  createRouteValidator,
  updateRouteValidator,
  routeIdValidator,
  // Stops
  createStopValidator,
  updateStopValidator,
  stopIdValidator,
  bulkStopTimingsValidator,
  // Vehicles
  listVehiclesValidator,
  createVehicleValidator,
  updateVehicleValidator,
  vehicleIdValidator,
  // Student transport
  listStudentTransportValidator,
  assignStudentValidator,
  updateStudentTransportValidator,
  studentTransportIdValidator,
  // Fees
  generateFeesValidator,
  // Legacy aliases for backward compat (can remove later)
  listTransportValidator: listRoutesValidator,
  createTransportValidator: createRouteValidator,
  updateTransportValidator: updateRouteValidator,
  transportIdValidator: routeIdValidator
};

