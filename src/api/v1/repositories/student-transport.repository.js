const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

class StudentTransportRepository {
  pickValue(row, keys, fallback = null) {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return fallback;
  }

  normalizeRow(row = {}) {
    return {
      id: row.id,
      studentId: this.pickValue(row, ['studentId', 'studentid']),
      rollNumber: this.pickValue(row, ['rollNumber', 'rollnumber'], ''),
      studentName: this.pickValue(row, ['studentName', 'studentname'], ''),
      className: this.pickValue(row, ['className', 'classname'], ''),
      sectionName: this.pickValue(row, ['sectionName', 'sectionname'], ''),
      routeId: this.pickValue(row, ['routeId', 'routeid']),
      routeCode: this.pickValue(row, ['routeCode', 'routecode'], ''),
      routeName: this.pickValue(row, ['routeName', 'routename'], ''),
      stopId: this.pickValue(row, ['stopId', 'stopid']),
      stopName: this.pickValue(row, ['stopName', 'stopname'], ''),
      pickupTime: this.pickValue(row, ['pickupTime', 'pickuptime']),
      dropTime: this.pickValue(row, ['dropTime', 'droptime']),
      vehicleId: this.pickValue(row, ['vehicleId', 'vehicleid']),
      vehicleNumber: this.pickValue(row, ['vehicleNumber', 'vehiclenumber']),
      academicYearId: this.pickValue(row, ['academicYearId', 'academicyearid']),
      transportFee: this.pickValue(row, ['transportFee', 'transportfee']),
      dueTerm: this.pickValue(row, ['dueTerm', 'dueterm'], 'annual'),
      startDate: this.pickValue(row, ['startDate', 'startdate']),
      endDate: this.pickValue(row, ['endDate', 'enddate']),
      shift: row.shift,
      status: row.status,
      remarks: row.remarks,
      createdAt: this.pickValue(row, ['createdAt', 'createdat']),
    };
  }

  normalizePagination(page = 0, pageSize = 10) {
    const limit = Math.max(1, Math.min(parseInt(pageSize, 10) || 10, 100));
    const currentPage = Math.max(0, parseInt(page, 10) || 0);
    const offset = currentPage * limit;
    return { limit, offset, currentPage };
  }

  async findAll({ search, page = 0, pageSize = 10, schoolId, routeId, classId, status, academicYearId } = {}) {
    const { limit, offset, currentPage } = this.normalizePagination(page, pageSize);
    const replacements = [schoolId];
    let whereExtra = '';

    if (routeId) {
      whereExtra += ' AND st.route_id = ?';
      replacements.push(routeId);
    }
    if (classId) {
      whereExtra += ' AND s.class_id = ?';
      replacements.push(classId);
    }
    if (status) {
      whereExtra += ' AND st.status = ?';
      replacements.push(status);
    }
    if (academicYearId) {
      whereExtra += ' AND st.academic_year_id = ?';
      replacements.push(academicYearId);
    }
    if (search) {
      whereExtra += ' AND (p.first_name LIKE ? OR p.last_name LIKE ? OR s.roll_number LIKE ? OR tr.route_name LIKE ?)';
      const like = `%${search}%`;
      replacements.push(like, like, like, like);
    }

    const listQuery = `
      SELECT
        st.id,
        st.student_id AS studentId,
        s.roll_number AS rollNumber,
        CONCAT(p.first_name, ' ', COALESCE(p.last_name, '')) AS studentName,
        c.name AS className,
        sec.name AS sectionName,
        st.route_id AS routeId,
        tr.route_code AS routeCode,
        tr.route_name AS routeName,
        st.stop_id AS stopId,
        ts.stop_name AS stopName,
        ts.pickup_time AS pickupTime,
        ts.drop_time AS dropTime,
        st.vehicle_id AS vehicleId,
        tv.vehicle_number AS vehicleNumber,
        st.academic_year_id AS academicYearId,
        st.transport_fee AS transportFee,
        st.due_term AS dueTerm,
        st.start_date AS startDate,
        st.end_date AS endDate,
        st.shift,
        st.status,
        st.remarks,
        st.created_at AS createdAt
      FROM student_transport st
      JOIN students s ON s.id = st.student_id
      JOIN persons p ON p.id = s.person_id
      JOIN classes c ON c.id = s.class_id
      LEFT JOIN sections sec ON sec.id = s.section_id
      JOIN transport_routes tr ON tr.id = st.route_id
      JOIN transport_stops ts ON ts.id = st.stop_id
      LEFT JOIN transport_vehicles tv ON tv.id = st.vehicle_id
      WHERE st.school_id = ?
      ${whereExtra}
      ORDER BY st.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM student_transport st
      JOIN students s ON s.id = st.student_id
      JOIN persons p ON p.id = s.person_id
      JOIN classes c ON c.id = s.class_id
      JOIN transport_routes tr ON tr.id = st.route_id
      WHERE st.school_id = ?
      ${whereExtra}
    `;

    const listReplacements = [...replacements, limit, offset];
    const countReplacements = [...replacements];

    const [items, countRows] = await Promise.all([
      sequelize.query(listQuery, { type: QueryTypes.SELECT, replacements: listReplacements }),
      sequelize.query(countQuery, { type: QueryTypes.SELECT, replacements: countReplacements })
    ]);

    return {
      items: items.map((row) => this.normalizeRow(row)),
      total: countRows?.[0]?.total ? Number(countRows[0].total) : 0,
      page: currentPage,
      pageSize: limit
    };
  }

  async findById(id, schoolId) {
    const query = `
      SELECT
        st.id,
        st.student_id AS studentId,
        s.roll_number AS rollNumber,
        CONCAT(p.first_name, ' ', COALESCE(p.last_name, '')) AS studentName,
        c.name AS className,
        st.route_id AS routeId,
        tr.route_name AS routeName,
        st.stop_id AS stopId,
        ts.stop_name AS stopName,
        st.vehicle_id AS vehicleId,
        tv.vehicle_number AS vehicleNumber,
        st.academic_year_id AS academicYearId,
        st.transport_fee AS transportFee,
        st.due_term AS dueTerm,
        st.start_date AS startDate,
        st.end_date AS endDate,
        st.shift,
        st.status,
        st.remarks
      FROM student_transport st
      JOIN students s ON s.id = st.student_id
      JOIN persons p ON p.id = s.person_id
      JOIN classes c ON c.id = s.class_id
      JOIN transport_routes tr ON tr.id = st.route_id
      JOIN transport_stops ts ON ts.id = st.stop_id
      LEFT JOIN transport_vehicles tv ON tv.id = st.vehicle_id
      WHERE st.id = ? AND st.school_id = ?
      LIMIT 1
    `;
    const results = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: [id, schoolId]
    });
    return results[0] ? this.normalizeRow(results[0]) : null;
  }

  async create(payload, schoolId) {
    const query = `
      INSERT INTO student_transport
        (school_id, student_id, route_id, stop_id, vehicle_id,
         academic_year_id, transport_fee, due_term, start_date, end_date, shift, status, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `;
    const [rows] = await sequelize.query(query, {
      replacements: [
        schoolId,
        payload.studentId,
        payload.routeId,
        payload.stopId,
        payload.vehicleId || null,
        payload.academicYearId,
        payload.transportFee || null,
        payload.dueTerm || 'annual',
        payload.startDate || null,
        payload.endDate || null,
        payload.shift || 'both',
        payload.status || 'active',
        payload.remarks || null
      ]
    });
    const insertedId = rows?.[0]?.id;
    if (!insertedId) return null;
    return this.findById(insertedId, schoolId);
  }

  async update(id, payload, schoolId) {
    const fields = [];
    const replacements = [];

    const fieldMap = {
      routeId: 'route_id',
      stopId: 'stop_id',
      vehicleId: 'vehicle_id',
      transportFee: 'transport_fee',
      dueTerm: 'due_term',
      startDate: 'start_date',
      endDate: 'end_date',
      shift: 'shift',
      status: 'status',
      remarks: 'remarks'
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (payload[key] !== undefined) {
        fields.push(`${col} = ?`);
        replacements.push(payload[key]);
      }
    }

    if (fields.length === 0) return this.findById(id, schoolId);

    fields.push('updated_at = NOW()');
    replacements.push(id, schoolId);

    const query = `
      UPDATE student_transport
      SET ${fields.join(', ')}
      WHERE id = ? AND school_id = ?
    `;

    const [, metadata] = await sequelize.query(query, { replacements });
    const affected = metadata?.affectedRows ?? metadata?.rowCount ?? 0;
    if (!affected) return null;
    return this.findById(id, schoolId);
  }

  async delete(id, schoolId) {
    const query = `DELETE FROM student_transport WHERE id = ? AND school_id = ?`;
    const [, metadata] = await sequelize.query(query, { replacements: [id, schoolId] });
    return (metadata?.affectedRows ?? metadata?.rowCount ?? 0) > 0;
  }

  async findActiveByStudentId(studentId, academicYearId, schoolId) {
    const query = `
      SELECT id FROM student_transport
      WHERE student_id = ? AND academic_year_id = ? AND school_id = ? AND status = 'active'
      LIMIT 1
    `;
    const results = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: [studentId, academicYearId, schoolId]
    });
    return results[0] || null;
  }

  async findActiveStudentsForFeeGeneration(schoolId, academicYearId) {
    const query = `
      SELECT
        st.id,
        st.student_id AS studentId,
        st.route_id AS routeId,
        st.stop_id AS stopId,
        st.transport_fee AS transportFee,
        tr.monthly_fee AS routeMonthlyFee,
        ts.stop_fee AS stopFee
      FROM student_transport st
      JOIN transport_routes tr ON tr.id = st.route_id
      JOIN transport_stops ts ON ts.id = st.stop_id
      WHERE st.school_id = ? AND st.academic_year_id = ? AND st.status = 'active'
    `;
    return sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: [schoolId, academicYearId]
    });
  }
}

module.exports = new StudentTransportRepository();
