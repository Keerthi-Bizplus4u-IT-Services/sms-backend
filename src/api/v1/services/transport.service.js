const routeRepo = require('../repositories/transport-route.repository');
const vehicleRepo = require('../repositories/transport-vehicle.repository');
const stopRepo = require('../repositories/transport-stop.repository');
const studentTransportRepo = require('../repositories/student-transport.repository');
const { AppError } = require('../../../middleware/error.middleware');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

class TransportService {
  // ─── Routes ──────────────────────────────────────────
  async listRoutes(query, schoolId) {
    return routeRepo.findAll({ ...query, schoolId });
  }

  async getRouteById(id, schoolId) {
    const route = await routeRepo.findById(id, schoolId);
    if (!route) throw new AppError('Transport route not found', 404);

    const stops = await stopRepo.findByRouteId(id, schoolId);
    return { ...route, stops };
  }

  async createRoute(payload, schoolId) {
    const record = await routeRepo.create(payload, schoolId);
    if (!record) throw new AppError('Unable to create transport route', 500);
    return record;
  }

  async updateRoute(id, payload, schoolId) {
    const record = await routeRepo.update(id, payload, schoolId);
    if (!record) throw new AppError('Transport route not found', 404);
    return record;
  }

  async deleteRoute(id, schoolId) {
    const deleted = await routeRepo.softDelete(id, schoolId);
    if (!deleted) throw new AppError('Transport route not found', 404);
    return true;
  }

  async listActiveRoutes(schoolId) {
    return routeRepo.findAllActive(schoolId);
  }

  // ─── Stops ───────────────────────────────────────────
  async listStops(routeId, schoolId) {
    return stopRepo.findByRouteId(routeId, schoolId);
  }

  async createStop(payload, schoolId) {
    const record = await stopRepo.create(payload, schoolId);
    if (!record) throw new AppError('Unable to create stop. Check route exists.', 400);
    return record;
  }

  async updateStop(stopId, payload, schoolId) {
    const record = await stopRepo.update(stopId, payload, schoolId);
    if (!record) throw new AppError('Transport stop not found', 404);
    return record;
  }

  async deleteStop(stopId, schoolId) {
    const deleted = await stopRepo.delete(stopId, schoolId);
    if (!deleted) throw new AppError('Transport stop not found', 404);
    return true;
  }

  async bulkUpdateStopTimings(routeId, stops, schoolId) {
    const success = await stopRepo.bulkUpdateOrder(routeId, stops, schoolId);
    if (!success) throw new AppError('Route not found or update failed', 400);
    return stopRepo.findByRouteId(routeId, schoolId);
  }

  // ─── Vehicles ────────────────────────────────────────
  async listVehicles(query, schoolId) {
    return vehicleRepo.findAll({ ...query, schoolId });
  }

  async getVehicleById(id, schoolId) {
    const vehicle = await vehicleRepo.findById(id, schoolId);
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    return vehicle;
  }

  async createVehicle(payload, schoolId) {
    const record = await vehicleRepo.create(payload, schoolId);
    if (!record) throw new AppError('Unable to create vehicle', 500);
    return record;
  }

  async updateVehicle(id, payload, schoolId) {
    const record = await vehicleRepo.update(id, payload, schoolId);
    if (!record) throw new AppError('Vehicle not found', 404);
    return record;
  }

  async deleteVehicle(id, schoolId) {
    const deleted = await vehicleRepo.softDelete(id, schoolId);
    if (!deleted) throw new AppError('Vehicle not found', 404);
    return true;
  }

  async listActiveVehicles(schoolId) {
    return vehicleRepo.findAllActive(schoolId);
  }

  async listDrivers(schoolId) {
    return vehicleRepo.findDrivers(schoolId);
  }

  // ─── Student Assignments ─────────────────────────────
  async listStudentAssignments(query, schoolId) {
    return studentTransportRepo.findAll({ ...query, schoolId });
  }

  async getStudentAssignment(id, schoolId) {
    const record = await studentTransportRepo.findById(id, schoolId);
    if (!record) throw new AppError('Student transport assignment not found', 404);
    return record;
  }

  async assignStudent(payload, schoolId) {
    // Check if student already has active assignment for this academic year
    const existing = await studentTransportRepo.findActiveByStudentId(
      payload.studentId, payload.academicYearId, schoolId
    );
    if (existing) {
      throw new AppError('Student already has an active transport assignment for this academic year', 409);
    }

    // Calculate fee: student override > stop fee > route monthly fee
    if (!payload.transportFee) {
      const stopFee = await this._getStopFee(payload.stopId, schoolId);
      const routeFee = await this._getRouteFee(payload.routeId, schoolId);
      payload.transportFee = stopFee || routeFee || 0;
    }

    const record = await studentTransportRepo.create(payload, schoolId);
    if (!record) throw new AppError('Unable to assign student to transport', 500);
    return record;
  }

  async updateStudentAssignment(id, payload, schoolId) {
    const record = await studentTransportRepo.update(id, payload, schoolId);
    if (!record) throw new AppError('Student transport assignment not found', 404);
    return record;
  }

  async deleteStudentAssignment(id, schoolId) {
    const deleted = await studentTransportRepo.delete(id, schoolId);
    if (!deleted) throw new AppError('Student transport assignment not found', 404);
    return true;
  }

  // ─── Fee Generation ──────────────────────────────────
  async generateTransportFees(schoolId, academicYearId, dueTerm = 'annual') {
    const students = await studentTransportRepo.findActiveStudentsForFeeGeneration(schoolId, academicYearId);
    if (!students.length) {
      throw new AppError('No active transport students found for this academic year', 404);
    }

    let created = 0;
    let skipped = 0;
    const transaction = await sequelize.transaction();

    try {
      for (const student of students) {
        // Fee priority: student-specific > stop > route
        const fee = student.transportFee || student.stopFee || student.routeMonthlyFee || 0;
        if (fee <= 0) { skipped++; continue; }

        // Find or create fee_structure
        let [feeStructure] = await sequelize.query(
          `SELECT id FROM fee_structures
           WHERE academic_year_id = ? AND fee_type = 'transport' AND due_term = ?
           LIMIT 1`,
          { type: QueryTypes.SELECT, replacements: [academicYearId, dueTerm], transaction }
        );

        if (!feeStructure) {
          const [, fsMeta] = await sequelize.query(
            `INSERT INTO fee_structures (academic_year_id, fee_type, amount, due_term, created_at, updated_at)
             VALUES (?, 'transport', ?, ?, NOW(), NOW())`,
            { replacements: [academicYearId, fee, dueTerm], transaction }
          );
          feeStructure = { id: fsMeta?.insertId };
        }

        // Check if student_fees entry already exists
        const [existingFee] = await sequelize.query(
          `SELECT id FROM student_fees WHERE student_id = ? AND fee_structure_id = ? LIMIT 1`,
          { type: QueryTypes.SELECT, replacements: [student.studentId, feeStructure.id], transaction }
        );

        if (existingFee) { skipped++; continue; }

        // Create student_fees
        await sequelize.query(
          `INSERT INTO student_fees (student_id, fee_structure_id, total_amount, discount_amount, paid_amount, status, created_at, updated_at)
           VALUES (?, ?, ?, 0, 0, 'pending', NOW(), NOW())`,
          { replacements: [student.studentId, feeStructure.id, fee], transaction }
        );
        created++;
      }

      await transaction.commit();
      return { created, skipped, total: students.length };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // ─── Helpers ─────────────────────────────────────────
  async _getStopFee(stopId, schoolId) {
    const [stop] = await sequelize.query(
      `SELECT ts.stop_fee FROM transport_stops ts
       JOIN transport_routes tr ON tr.id = ts.route_id
       WHERE ts.id = ? AND tr.school_id = ?`,
      { type: QueryTypes.SELECT, replacements: [stopId, schoolId] }
    );
    return stop?.stop_fee || null;
  }

  async _getRouteFee(routeId, schoolId) {
    const [route] = await sequelize.query(
      'SELECT monthly_fee FROM transport_routes WHERE id = ? AND school_id = ?',
      { type: QueryTypes.SELECT, replacements: [routeId, schoolId] }
    );
    return route?.monthly_fee || null;
  }
}

module.exports = new TransportService();

