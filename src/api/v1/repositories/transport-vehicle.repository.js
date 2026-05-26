const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

class TransportVehicleRepository {
  constructor() {
    this._staffTablesAvailable = null;
    this._userPersonTablesAvailable = null;
    this._assignmentTableAvailable = null;
  }

  parseId(value) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }

  todayDate() {
    return new Date().toISOString().slice(0, 10);
  }

  defaultDateOfBirth() {
    return '1990-01-01';
  }

  normalizeDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }

  parseNameFromEmail(email) {
    if (!email || typeof email !== 'string') {
      return { firstName: 'Transport', lastName: 'Staff' };
    }

    const [localPart] = email.split('@');
    if (!localPart) {
      return { firstName: 'Transport', lastName: 'Staff' };
    }

    const parts = localPart
      .replace(/[._-]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1));

    if (!parts.length) {
      return { firstName: 'Transport', lastName: 'Staff' };
    }

    if (parts.length === 1) {
      return { firstName: parts[0], lastName: 'Staff' };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }

  formatNameFromEmail(email) {
    if (!email || typeof email !== 'string') return null;
    const [localPart] = email.split('@');
    if (!localPart) return null;
    return localPart
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  pickValue(row, keys, fallback = null) {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return fallback;
  }

  normalizeVehicleRow(row = {}) {
    const driverFirstName = this.pickValue(row, ['driverFirstName', 'driverfirstname']);
    const driverLastName = this.pickValue(row, ['driverLastName', 'driverlastname'], '');
    const conductorFirstName = this.pickValue(row, ['conductorFirstName', 'conductorfirstname']);
    const conductorLastName = this.pickValue(row, ['conductorLastName', 'conductorlastname'], '');
    const driverEmail = this.pickValue(row, ['driverEmail', 'driveremail']);
    const conductorEmail = this.pickValue(row, ['conductorEmail', 'conductoremail']);

    return {
      id: row.id,
      vehicleNumber: this.pickValue(row, ['vehicleNumber', 'vehiclenumber'], ''),
      vehicleName: this.pickValue(row, ['vehicleName', 'vehiclename']),
      vehicleType: this.pickValue(row, ['vehicleType', 'vehicletype']),
      capacity: Number(this.pickValue(row, ['capacity'], 0)),
      registrationDate: this.pickValue(row, ['registrationDate', 'registrationdate']),
      insuranceExpiry: this.pickValue(row, ['insuranceExpiry', 'insuranceexpiry']),
      fitnessCertificateExpiry: this.pickValue(row, ['fitnessCertificateExpiry', 'fitnesscertificateexpiry']),
      pollutionCertificateExpiry: this.pickValue(row, ['pollutionCertificateExpiry', 'pollutioncertificateexpiry']),
      roadTaxExpiry: this.pickValue(row, ['roadTaxExpiry', 'roadtaxexpiry']),
      lastServiceDate: this.pickValue(row, ['lastServiceDate', 'lastservicedate']),
      nextServiceDate: this.pickValue(row, ['nextServiceDate', 'nextservicedate']),
      odometerReading: this.pickValue(row, ['odometerReading', 'odometerreading']),
      fuelType: this.pickValue(row, ['fuelType', 'fueltype']),
      driverId: this.parseId(this.pickValue(row, ['driverId', 'driverid'])),
      conductorId: this.parseId(this.pickValue(row, ['conductorId', 'conductorid'])),
      status: this.pickValue(row, ['status'], 'inactive'),
      driverPhone: this.pickValue(row, ['driverPhone', 'driverphone']),
      driverName: this.pickValue(
        row,
        ['driverName', 'drivername'],
        driverFirstName ? `${driverFirstName} ${driverLastName}`.trim() : this.formatNameFromEmail(driverEmail)
      ),
      conductorName: this.pickValue(
        row,
        ['conductorName', 'conductorname'],
        conductorFirstName ? `${conductorFirstName} ${conductorLastName}`.trim() : this.formatNameFromEmail(conductorEmail)
      )
    };
  }

  normalizePagination(page = 0, pageSize = 10) {
    const limit = Math.max(1, Math.min(parseInt(pageSize, 10) || 10, 100));
    const currentPage = Math.max(0, parseInt(page, 10) || 0);
    const offset = currentPage * limit;
    return { limit, offset, currentPage };
  }

  async hasStaffTables() {
    if (this._staffTablesAvailable !== null) {
      return this._staffTablesAvailable;
    }

    const rows = await sequelize.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('staff', 'persons')
      `,
      { type: QueryTypes.SELECT }
    );

    const tableNames = new Set(rows.map((r) => r.table_name));
    this._staffTablesAvailable = tableNames.has('staff') && tableNames.has('persons');
    return this._staffTablesAvailable;
  }

  async hasUserPersonTables() {
    if (this._userPersonTablesAvailable !== null) {
      return this._userPersonTablesAvailable;
    }

    const rows = await sequelize.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('users', 'persons', 'roles')
      `,
      { type: QueryTypes.SELECT }
    );

    const tableNames = new Set(rows.map((r) => r.table_name));
    this._userPersonTablesAvailable =
      tableNames.has('users') && tableNames.has('persons') && tableNames.has('roles');
    return this._userPersonTablesAvailable;
  }

  async ensurePersonForUser(userId, schoolId) {
    const normalizedUserId = this.parseId(userId);
    if (!normalizedUserId) return null;

    const withUserPersonTables = await this.hasUserPersonTables();
    if (!withUserPersonTables) return null;

    const [existingPerson] = await sequelize.query(
      `
        SELECT p.id
        FROM persons p
        WHERE p.user_id = ?
          AND p.deleted_at IS NULL
        LIMIT 1
      `,
      {
        type: QueryTypes.SELECT,
        replacements: [normalizedUserId]
      }
    );

    if (existingPerson?.id) {
      return existingPerson.id;
    }

    const [user] = await sequelize.query(
      `
        SELECT u.id, u.email
        FROM users u
        WHERE u.id = ?
          AND u.school_id = ?
          AND u.deleted_at IS NULL
        LIMIT 1
      `,
      {
        type: QueryTypes.SELECT,
        replacements: [normalizedUserId, schoolId]
      }
    );

    if (!user?.id) {
      return null;
    }

    const { firstName, lastName } = this.parseNameFromEmail(user.email);
    const [insertedRows] = await sequelize.query(
      `
        INSERT INTO persons
          (user_id, first_name, last_name, gender, date_of_birth, country, created_at, updated_at)
        VALUES
          (?, ?, ?, 'prefer_not_to_say', ?, 'India', NOW(), NOW())
        RETURNING id
      `,
      {
        replacements: [normalizedUserId, firstName, lastName, this.defaultDateOfBirth()]
      }
    );

    return insertedRows?.[0]?.id || null;
  }

  async syncAssignmentPeople({ schoolId, driverId, conductorId }) {
    if (driverId !== undefined && driverId !== null) {
      await this.ensurePersonForUser(driverId, schoolId);
    }

    if (conductorId !== undefined && conductorId !== null) {
      await this.ensurePersonForUser(conductorId, schoolId);
    }
  }

  async hasVehicleAssignmentTable() {
    if (this._assignmentTableAvailable !== null) {
      return this._assignmentTableAvailable;
    }

    const rows = await sequelize.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'transport_vehicle_staff_assignments'
      `,
      { type: QueryTypes.SELECT }
    );

    this._assignmentTableAvailable = rows.length > 0;
    return this._assignmentTableAvailable;
  }

  async findAll({ search, page = 0, pageSize = 10, schoolId, status } = {}) {
    const { limit, offset, currentPage } = this.normalizePagination(page, pageSize);
    const withStaffTables = await this.hasStaffTables();
    const withUserPersonTables = await this.hasUserPersonTables();
    const withAssignmentTable = await this.hasVehicleAssignmentTable();
    const replacements = [schoolId];
    let whereExtra = '';

    const assignmentJoin = withAssignmentTable
      ? `
          LEFT JOIN LATERAL (
            SELECT tva.driver_id, tva.conductor_id
            FROM transport_vehicle_staff_assignments tva
            WHERE tva.school_id = tv.school_id
              AND tva.vehicle_id = tv.id
              AND tva.deleted_at IS NULL
              AND tva.effective_from <= CURRENT_DATE
              AND (tva.effective_to IS NULL OR tva.effective_to >= CURRENT_DATE)
            ORDER BY tva.effective_from DESC, tva.id DESC
            LIMIT 1
          ) tva ON TRUE
        `
      : '';

    const driverIdRef = withAssignmentTable ? 'COALESCE(tva.driver_id, tv.driver_id)' : 'tv.driver_id';
    const conductorIdRef = withAssignmentTable ? 'COALESCE(tva.conductor_id, tv.conductor_id)' : 'tv.conductor_id';

    const joins = withStaffTables
      ? `
          LEFT JOIN staff ds ON ds.id = ${driverIdRef}
          LEFT JOIN persons dp ON dp.id = ds.person_id
          LEFT JOIN staff cs ON cs.id = ${conductorIdRef}
          LEFT JOIN persons cp ON cp.id = cs.person_id
        `
      : withUserPersonTables
        ? `
          LEFT JOIN users du ON du.id = ${driverIdRef} AND du.deleted_at IS NULL
          LEFT JOIN persons dp ON dp.user_id = du.id AND dp.deleted_at IS NULL
          LEFT JOIN users cu ON cu.id = ${conductorIdRef} AND cu.deleted_at IS NULL
          LEFT JOIN persons cp ON cp.user_id = cu.id AND cp.deleted_at IS NULL
        `
      : '';

    const selectDriverColumns = withStaffTables
      ? `
          dp.first_name AS driverFirstName,
          dp.last_name AS driverLastName,
          COALESCE(dp.phone, dp.alternate_phone) AS driverPhone,
          NULL AS driverEmail,
          cp.first_name AS conductorFirstName,
          cp.last_name AS conductorLastName,
          NULL AS conductorEmail
        `
      : withUserPersonTables
        ? `
          dp.first_name AS driverFirstName,
          dp.last_name AS driverLastName,
          COALESCE(dp.phone, dp.alternate_phone) AS driverPhone,
          du.email AS driverEmail,
          cp.first_name AS conductorFirstName,
          cp.last_name AS conductorLastName,
          cu.email AS conductorEmail
        `
      : `
          NULL AS driverFirstName,
          NULL AS driverLastName,
          NULL AS driverPhone,
          NULL AS driverEmail,
          NULL AS conductorFirstName,
          NULL AS conductorLastName,
          NULL AS conductorEmail
        `;

    if (search) {
      whereExtra += ' AND (tv.vehicle_number LIKE ? OR tv.vehicle_name LIKE ?)';
      const like = `%${search}%`;
      replacements.push(like, like);
    }

    if (status) {
      whereExtra += ' AND tv.status = ?';
      replacements.push(status);
    }

    const listQuery = `
      SELECT
        tv.id,
        tv.vehicle_number AS vehicleNumber,
        tv.vehicle_name AS vehicleName,
        tv.vehicle_type AS vehicleType,
        tv.capacity,
        tv.registration_date AS registrationDate,
        tv.insurance_expiry AS insuranceExpiry,
        tv.fitness_certificate_expiry AS fitnessCertificateExpiry,
        tv.pollution_certificate_expiry AS pollutionCertificateExpiry,
        tv.road_tax_expiry AS roadTaxExpiry,
        tv.last_service_date AS lastServiceDate,
        tv.next_service_date AS nextServiceDate,
        tv.odometer_reading AS odometerReading,
        tv.fuel_type AS fuelType,
        ${driverIdRef} AS driverId,
        ${conductorIdRef} AS conductorId,
        tv.status,
        ${selectDriverColumns}
      FROM transport_vehicles tv
      ${assignmentJoin}
      ${joins}
      WHERE tv.school_id = ? AND tv.deleted_at IS NULL
      ${whereExtra}
      ORDER BY tv.vehicle_number ASC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM transport_vehicles tv
      WHERE tv.school_id = ? AND tv.deleted_at IS NULL
      ${whereExtra}
    `;

    const listReplacements = [...replacements, limit, offset];
    const countReplacements = [...replacements];

    const [items, countRows] = await Promise.all([
      sequelize.query(listQuery, { type: QueryTypes.SELECT, replacements: listReplacements }),
      sequelize.query(countQuery, { type: QueryTypes.SELECT, replacements: countReplacements })
    ]);

    return {
      items: items.map((row) => this.normalizeVehicleRow(row)),
      total: countRows?.[0]?.total ? Number(countRows[0].total) : 0,
      page: currentPage,
      pageSize: limit
    };
  }

  async findById(id, schoolId) {
    const withStaffTables = await this.hasStaffTables();
    const withUserPersonTables = await this.hasUserPersonTables();
    const withAssignmentTable = await this.hasVehicleAssignmentTable();

    const assignmentJoin = withAssignmentTable
      ? `
          LEFT JOIN LATERAL (
            SELECT tva.driver_id, tva.conductor_id
            FROM transport_vehicle_staff_assignments tva
            WHERE tva.school_id = tv.school_id
              AND tva.vehicle_id = tv.id
              AND tva.deleted_at IS NULL
              AND tva.effective_from <= CURRENT_DATE
              AND (tva.effective_to IS NULL OR tva.effective_to >= CURRENT_DATE)
            ORDER BY tva.effective_from DESC, tva.id DESC
            LIMIT 1
          ) tva ON TRUE
        `
      : '';

    const driverIdRef = withAssignmentTable ? 'COALESCE(tva.driver_id, tv.driver_id)' : 'tv.driver_id';
    const conductorIdRef = withAssignmentTable ? 'COALESCE(tva.conductor_id, tv.conductor_id)' : 'tv.conductor_id';

    const joins = withStaffTables
      ? `
          LEFT JOIN staff ds ON ds.id = ${driverIdRef}
          LEFT JOIN persons dp ON dp.id = ds.person_id
          LEFT JOIN staff cs ON cs.id = ${conductorIdRef}
          LEFT JOIN persons cp ON cp.id = cs.person_id
        `
      : withUserPersonTables
        ? `
          LEFT JOIN users du ON du.id = ${driverIdRef} AND du.deleted_at IS NULL
          LEFT JOIN persons dp ON dp.user_id = du.id AND dp.deleted_at IS NULL
          LEFT JOIN users cu ON cu.id = ${conductorIdRef} AND cu.deleted_at IS NULL
          LEFT JOIN persons cp ON cp.user_id = cu.id AND cp.deleted_at IS NULL
        `
      : '';

    const selectDriverColumns = withStaffTables
      ? `
          dp.first_name AS driverFirstName,
          dp.last_name AS driverLastName,
          COALESCE(dp.phone, dp.alternate_phone) AS driverPhone,
          NULL AS driverEmail,
          cp.first_name AS conductorFirstName,
          cp.last_name AS conductorLastName,
          NULL AS conductorEmail
        `
      : withUserPersonTables
        ? `
          dp.first_name AS driverFirstName,
          dp.last_name AS driverLastName,
          COALESCE(dp.phone, dp.alternate_phone) AS driverPhone,
          du.email AS driverEmail,
          cp.first_name AS conductorFirstName,
          cp.last_name AS conductorLastName,
          cu.email AS conductorEmail
        `
      : `
          NULL AS driverFirstName,
          NULL AS driverLastName,
          NULL AS driverPhone,
          NULL AS driverEmail,
          NULL AS conductorFirstName,
          NULL AS conductorLastName,
          NULL AS conductorEmail
        `;

    const query = `
      SELECT
        tv.id,
        tv.vehicle_number AS vehicleNumber,
        tv.vehicle_name AS vehicleName,
        tv.vehicle_type AS vehicleType,
        tv.capacity,
        tv.registration_date AS registrationDate,
        tv.insurance_expiry AS insuranceExpiry,
        tv.fitness_certificate_expiry AS fitnessCertificateExpiry,
        tv.pollution_certificate_expiry AS pollutionCertificateExpiry,
        tv.road_tax_expiry AS roadTaxExpiry,
        tv.last_service_date AS lastServiceDate,
        tv.next_service_date AS nextServiceDate,
        tv.odometer_reading AS odometerReading,
        tv.fuel_type AS fuelType,
        ${driverIdRef} AS driverId,
        ${conductorIdRef} AS conductorId,
        tv.status,
        ${selectDriverColumns}
      FROM transport_vehicles tv
      ${assignmentJoin}
      ${joins}
      WHERE tv.id = ? AND tv.school_id = ? AND tv.deleted_at IS NULL
      LIMIT 1
    `;
    const results = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: [id, schoolId]
    });
    if (!results[0]) return null;
    return this.normalizeVehicleRow(results[0]);
  }

  async findBaseById(id, schoolId) {
    const query = `
      SELECT
        tv.id,
        tv.driver_id AS "driverId",
        tv.conductor_id AS "conductorId"
      FROM transport_vehicles tv
      WHERE tv.id = ? AND tv.school_id = ? AND tv.deleted_at IS NULL
      LIMIT 1
    `;

    const rows = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: [id, schoolId]
    });

    return rows[0] || null;
  }

  async recordAssignmentHistory({ vehicleId, schoolId, driverId, conductorId, effectiveDate }) {
    if (sequelize.getDialect() !== 'postgres') return false;
    const withAssignmentTable = await this.hasVehicleAssignmentTable();
    if (!withAssignmentTable) return false;

    const normalizedDate = this.normalizeDate(effectiveDate) || this.todayDate();
    const normalizedDriverId = this.parseId(driverId);
    const normalizedConductorId = this.parseId(conductorId);
    const persistedDriverId = normalizedDriverId === undefined ? null : normalizedDriverId;
    const persistedConductorId = normalizedConductorId === undefined ? null : normalizedConductorId;

    await sequelize.query(
      `
        UPDATE transport_vehicle_staff_assignments
        SET effective_to = (?::date - INTERVAL '1 day')::date,
            updated_at = NOW()
        WHERE school_id = ?
          AND vehicle_id = ?
          AND deleted_at IS NULL
          AND effective_from < ?::date
          AND (effective_to IS NULL OR effective_to >= ?::date)
      `,
      {
        replacements: [normalizedDate, schoolId, vehicleId, normalizedDate, normalizedDate]
      }
    );

    const [, updateMeta] = await sequelize.query(
      `
        UPDATE transport_vehicle_staff_assignments
        SET driver_id = ?,
          conductor_id = ?,
            updated_at = NOW(),
            deleted_at = NULL
        WHERE school_id = ?
          AND vehicle_id = ?
          AND effective_from = ?::date
          AND deleted_at IS NULL
      `,
      {
        replacements: [persistedDriverId, persistedConductorId, schoolId, vehicleId, normalizedDate]
      }
    );

    const updated = updateMeta?.affectedRows ?? updateMeta?.rowCount ?? 0;
    if (!updated) {
      await sequelize.query(
        `
          INSERT INTO transport_vehicle_staff_assignments
            (school_id, vehicle_id, driver_id, conductor_id, effective_from)
          VALUES (?, ?, ?, ?, ?)
        `,
        {
          replacements: [schoolId, vehicleId, persistedDriverId, persistedConductorId, normalizedDate]
        }
      );
    }

    return true;
  }

  async create(payload, schoolId) {
    const driverId = this.parseId(payload.driverId);
    const conductorId = this.parseId(payload.conductorId);
    const persistedDriverId = driverId === undefined ? null : driverId;
    const persistedConductorId = conductorId === undefined ? null : conductorId;
    const assignmentDate = this.normalizeDate(payload.assignmentDate) || this.todayDate();

    await this.syncAssignmentPeople({
      schoolId,
      driverId: persistedDriverId,
      conductorId: persistedConductorId
    });

    const query = `
      INSERT INTO transport_vehicles
        (school_id, vehicle_number, vehicle_name, vehicle_type, capacity,
         registration_date, insurance_expiry, fitness_certificate_expiry,
         pollution_certificate_expiry, road_tax_expiry, last_service_date,
         next_service_date, odometer_reading, fuel_type, driver_id, conductor_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `;
    const [rows] = await sequelize.query(query, {
      replacements: [
        schoolId,
        payload.vehicleNumber,
        payload.vehicleName || null,
        payload.vehicleType,
        payload.capacity,
        payload.registrationDate || null,
        payload.insuranceExpiry || null,
        payload.fitnessCertificateExpiry || null,
        payload.pollutionCertificateExpiry || null,
        payload.roadTaxExpiry || null,
        payload.lastServiceDate || null,
        payload.nextServiceDate || null,
        payload.odometerReading || null,
        payload.fuelType,
        persistedDriverId,
        persistedConductorId,
        payload.status || 'active'
      ]
    });
    const insertedId = rows?.[0]?.id;
    if (!insertedId) return null;

    if (persistedDriverId !== null || persistedConductorId !== null) {
      await this.recordAssignmentHistory({
        vehicleId: insertedId,
        schoolId,
        driverId: persistedDriverId,
        conductorId: persistedConductorId,
        effectiveDate: assignmentDate
      });
    }

    return this.findById(insertedId, schoolId);
  }

  async update(id, payload, schoolId) {
    const existing = await this.findBaseById(id, schoolId);
    if (!existing) return null;

    const requestedDriverId = payload.driverId !== undefined ? this.parseId(payload.driverId) : undefined;
    const requestedConductorId = payload.conductorId !== undefined ? this.parseId(payload.conductorId) : undefined;
    const hasAssignmentChange = requestedDriverId !== undefined || requestedConductorId !== undefined;

    const today = this.todayDate();
    const assignmentDate = this.normalizeDate(payload.assignmentDate) || today;
    const withAssignmentTable = await this.hasVehicleAssignmentTable();
    const shouldApplyImmediately =
      !hasAssignmentChange || !withAssignmentTable || assignmentDate <= today;

    if (hasAssignmentChange) {
      const targetDriverId = requestedDriverId !== undefined ? requestedDriverId : this.parseId(existing.driverId);
      const targetConductorId = requestedConductorId !== undefined ? requestedConductorId : this.parseId(existing.conductorId);
      await this.syncAssignmentPeople({
        schoolId,
        driverId: targetDriverId,
        conductorId: targetConductorId
      });
    }

    const fields = [];
    const replacements = [];

    const fieldMap = {
      vehicleNumber: 'vehicle_number',
      vehicleName: 'vehicle_name',
      vehicleType: 'vehicle_type',
      capacity: 'capacity',
      registrationDate: 'registration_date',
      insuranceExpiry: 'insurance_expiry',
      fitnessCertificateExpiry: 'fitness_certificate_expiry',
      pollutionCertificateExpiry: 'pollution_certificate_expiry',
      roadTaxExpiry: 'road_tax_expiry',
      lastServiceDate: 'last_service_date',
      nextServiceDate: 'next_service_date',
      odometerReading: 'odometer_reading',
      fuelType: 'fuel_type',
      driverId: 'driver_id',
      conductorId: 'conductor_id',
      status: 'status'
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (payload[key] !== undefined) {
        if (!shouldApplyImmediately && (key === 'driverId' || key === 'conductorId')) {
          continue;
        }

        const value =
          key === 'driverId' || key === 'conductorId'
            ? this.parseId(payload[key])
            : payload[key];

        fields.push(`${col} = ?`);
        replacements.push(value);
      }
    }

    if (fields.length > 0) {
      fields.push('updated_at = NOW()');
      replacements.push(id, schoolId);

      const query = `
        UPDATE transport_vehicles
        SET ${fields.join(', ')}
        WHERE id = ? AND school_id = ? AND deleted_at IS NULL
      `;

      const [, metadata] = await sequelize.query(query, { replacements });
      const affected = metadata?.affectedRows ?? metadata?.rowCount ?? 0;
      if (!affected) return null;
    }

    if (hasAssignmentChange) {
      const targetDriverId = requestedDriverId !== undefined ? requestedDriverId : this.parseId(existing.driverId);
      const targetConductorId = requestedConductorId !== undefined ? requestedConductorId : this.parseId(existing.conductorId);
      await this.recordAssignmentHistory({
        vehicleId: id,
        schoolId,
        driverId: targetDriverId,
        conductorId: targetConductorId,
        effectiveDate: assignmentDate
      });
    }

    return this.findById(id, schoolId);
  }

  async softDelete(id, schoolId) {
    const query = `
      UPDATE transport_vehicles
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ? AND school_id = ? AND deleted_at IS NULL
    `;
    const [, metadata] = await sequelize.query(query, { replacements: [id, schoolId] });
    return (metadata?.affectedRows ?? metadata?.rowCount ?? 0) > 0;
  }

  async findAllActive(schoolId) {
    const query = `
      SELECT id, vehicle_number AS vehicleNumber, vehicle_name AS vehicleName,
             vehicle_type AS vehicleType, capacity
      FROM transport_vehicles
      WHERE school_id = ? AND status = 'active' AND deleted_at IS NULL
      ORDER BY vehicle_number ASC
    `;
    const rows = await sequelize.query(query, { type: QueryTypes.SELECT, replacements: [schoolId] });
    return rows.map((row) => ({
      id: row.id,
      vehicleNumber: this.pickValue(row, ['vehicleNumber', 'vehiclenumber'], ''),
      vehicleName: this.pickValue(row, ['vehicleName', 'vehiclename']),
      vehicleType: this.pickValue(row, ['vehicleType', 'vehicletype']),
      capacity: Number(this.pickValue(row, ['capacity'], 0))
    }));
  }

  async findDrivers(schoolId) {
    const withStaffTables = await this.hasStaffTables();
    if (withStaffTables) {
      const query = `
        SELECT
          s.id,
          CONCAT(p.first_name, ' ', COALESCE(p.last_name, '')) AS name,
          COALESCE(p.phone, p.alternate_phone) AS phone
        FROM staff s
        JOIN persons p ON p.id = s.person_id
        WHERE s.school_id = ? AND s.deleted_at IS NULL
        ORDER BY p.first_name ASC
      `;
      return sequelize.query(query, { type: QueryTypes.SELECT, replacements: [schoolId] });
    }

    const withUserPersonTables = await this.hasUserPersonTables();
    if (!withUserPersonTables) {
      return [];
    }

    const query = `
      SELECT
        u.id,
        COALESCE(
          NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), ''),
          u.email
        ) AS name,
        COALESCE(p.phone, p.alternate_phone) AS phone
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN persons p ON p.user_id = u.id AND p.deleted_at IS NULL
      WHERE u.school_id = ?
        AND u.deleted_at IS NULL
        AND u.is_active = TRUE
        AND r.name NOT IN ('student', 'parent')
      ORDER BY name ASC
    `;

    return sequelize.query(query, { type: QueryTypes.SELECT, replacements: [schoolId] });
  }
}

module.exports = new TransportVehicleRepository();
