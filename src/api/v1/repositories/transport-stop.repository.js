const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

class TransportStopRepository {
  pickValue(row, keys, fallback = null) {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return fallback;
  }

  normalizeStopRow(row = {}) {
    return {
      id: row.id,
      routeId: this.pickValue(row, ['routeId', 'routeid']),
      stopName: this.pickValue(row, ['stopName', 'stopname'], ''),
      stopOrder: Number(this.pickValue(row, ['stopOrder', 'stoporder'], 0)),
      pickupTime: this.pickValue(row, ['pickupTime', 'pickuptime']),
      dropTime: this.pickValue(row, ['dropTime', 'droptime']),
      distanceFromSchoolKm: this.pickValue(row, ['distanceFromSchoolKm', 'distancefromschoolkm']),
      latitude: this.pickValue(row, ['latitude']),
      longitude: this.pickValue(row, ['longitude']),
      landmark: this.pickValue(row, ['landmark']),
      stopFee: this.pickValue(row, ['stopFee', 'stopfee']),
      isActive: Boolean(this.pickValue(row, ['isActive', 'isactive'], false)),
      studentsCount: Number(this.pickValue(row, ['studentsCount', 'studentscount'], 0))
    };
  }

  async findByRouteId(routeId, schoolId) {
    const query = `
      SELECT
        ts.id,
        ts.route_id AS routeId,
        ts.stop_name AS stopName,
        ts.stop_order AS stopOrder,
        ts.pickup_time AS pickupTime,
        ts.drop_time AS dropTime,
        ts.distance_from_school_km AS distanceFromSchoolKm,
        ts.latitude,
        ts.longitude,
        ts.landmark,
        ts.stop_fee AS stopFee,
        ts.is_active AS isActive,
        (SELECT COUNT(*) FROM student_transport st WHERE st.stop_id = ts.id AND st.status = 'active') AS studentsCount
      FROM transport_stops ts
      JOIN transport_routes tr ON tr.id = ts.route_id
      WHERE ts.route_id = ? AND tr.school_id = ? AND tr.deleted_at IS NULL
      ORDER BY ts.stop_order ASC
    `;
    const rows = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: [routeId, schoolId]
    });
    return rows.map((row) => this.normalizeStopRow(row));
  }

  async findById(stopId, schoolId) {
    const query = `
      SELECT
        ts.id,
        ts.route_id AS routeId,
        ts.stop_name AS stopName,
        ts.stop_order AS stopOrder,
        ts.pickup_time AS pickupTime,
        ts.drop_time AS dropTime,
        ts.distance_from_school_km AS distanceFromSchoolKm,
        ts.latitude,
        ts.longitude,
        ts.landmark,
        ts.stop_fee AS stopFee,
        ts.is_active AS isActive
      FROM transport_stops ts
      JOIN transport_routes tr ON tr.id = ts.route_id
      WHERE ts.id = ? AND tr.school_id = ? AND tr.deleted_at IS NULL
      LIMIT 1
    `;
    const results = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: [stopId, schoolId]
    });
    return results[0] ? this.normalizeStopRow(results[0]) : null;
  }

  async create(payload, schoolId) {
    // Verify route belongs to school
    const routeCheck = await sequelize.query(
      'SELECT id FROM transport_routes WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1',
      { type: QueryTypes.SELECT, replacements: [payload.routeId, schoolId] }
    );
    if (!routeCheck.length) return null;

    // Get next stop_order if not provided
    let stopOrder = payload.stopOrder;
    if (!stopOrder) {
      const maxOrder = await sequelize.query(
        'SELECT COALESCE(MAX(stop_order), 0) + 1 AS nextOrder FROM transport_stops WHERE route_id = ?',
        { type: QueryTypes.SELECT, replacements: [payload.routeId] }
      );
      stopOrder = maxOrder[0]?.nextOrder || 1;
    }

    const query = `
      INSERT INTO transport_stops
        (route_id, stop_name, stop_order, pickup_time, drop_time,
         distance_from_school_km, latitude, longitude, landmark, stop_fee, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `;
    const [rows] = await sequelize.query(query, {
      replacements: [
        payload.routeId,
        payload.stopName,
        stopOrder,
        payload.pickupTime || null,
        payload.dropTime || null,
        payload.distanceFromSchoolKm || null,
        payload.latitude || null,
        payload.longitude || null,
        payload.landmark || null,
        payload.stopFee || null,
        payload.isActive !== undefined ? payload.isActive : true
      ]
    });
    const insertedId = rows?.[0]?.id;
    if (!insertedId) return null;
    return this.findById(insertedId, schoolId);
  }

  async update(stopId, payload, schoolId) {
    const fields = [];
    const replacements = [];

    const fieldMap = {
      stopName: 'stop_name',
      stopOrder: 'stop_order',
      pickupTime: 'pickup_time',
      dropTime: 'drop_time',
      distanceFromSchoolKm: 'distance_from_school_km',
      latitude: 'latitude',
      longitude: 'longitude',
      landmark: 'landmark',
      stopFee: 'stop_fee',
      isActive: 'is_active'
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (payload[key] !== undefined) {
        fields.push(`${col} = ?`);
        replacements.push(payload[key]);
      }
    }

    if (fields.length === 0) return this.findById(stopId, schoolId);

    const dialect = sequelize.getDialect();

    // Rebuild replacements for update query.
    const updateReplacements = [];
    for (const [key, col] of Object.entries(fieldMap)) {
      if (payload[key] !== undefined) {
        updateReplacements.push(payload[key]);
      }
    }
    updateReplacements.push(stopId, schoolId);

    const updateQuery = dialect === 'postgres'
      ? `
          UPDATE transport_stops ts
          SET ${fields.join(', ')}
          FROM transport_routes tr
          WHERE tr.id = ts.route_id
            AND ts.id = ?
            AND tr.school_id = ?
            AND tr.deleted_at IS NULL
        `
      : `
          UPDATE transport_stops ts
          JOIN transport_routes tr ON tr.id = ts.route_id
          SET ${fields.join(', ')}
          WHERE ts.id = ? AND tr.school_id = ? AND tr.deleted_at IS NULL
        `;

    const [, metadata] = await sequelize.query(updateQuery, { replacements: updateReplacements });
    const affected = metadata?.affectedRows ?? metadata?.rowCount ?? 0;
    if (!affected) return null;
    return this.findById(stopId, schoolId);
  }

  async delete(stopId, schoolId) {
    const dialect = sequelize.getDialect();
    const deleteQuery = dialect === 'postgres'
      ? `
          DELETE FROM transport_stops ts
          USING transport_routes tr
          WHERE tr.id = ts.route_id
            AND ts.id = ?
            AND tr.school_id = ?
            AND tr.deleted_at IS NULL
        `
      : `
          DELETE ts FROM transport_stops ts
          JOIN transport_routes tr ON tr.id = ts.route_id
          WHERE ts.id = ? AND tr.school_id = ? AND tr.deleted_at IS NULL
        `;
    const [, metadata] = await sequelize.query(deleteQuery, { replacements: [stopId, schoolId] });
    return (metadata?.affectedRows ?? metadata?.rowCount ?? 0) > 0;
  }

  async bulkUpdateOrder(routeId, stops, schoolId) {
    // Verify route
    const routeCheck = await sequelize.query(
      'SELECT id FROM transport_routes WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1',
      { type: QueryTypes.SELECT, replacements: [routeId, schoolId] }
    );
    if (!routeCheck.length) return false;

    const transaction = await sequelize.transaction();
    try {
      for (const stop of stops) {
        await sequelize.query(
          'UPDATE transport_stops SET stop_order = ?, pickup_time = ?, drop_time = ? WHERE id = ? AND route_id = ?',
          { replacements: [stop.stopOrder, stop.pickupTime || null, stop.dropTime || null, stop.id, routeId], transaction }
        );
      }
      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = new TransportStopRepository();
