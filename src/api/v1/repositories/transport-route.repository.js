const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

class TransportRouteRepository {
  pickValue(row, keys, fallback = null) {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return fallback;
  }

  normalizeRouteRow(row = {}) {
    return {
      id: row.id,
      routeCode: this.pickValue(row, ['routeCode', 'routecode'], ''),
      routeName: this.pickValue(row, ['routeName', 'routename'], ''),
      description: this.pickValue(row, ['description']),
      totalDistanceKm: this.pickValue(row, ['totalDistanceKm', 'totaldistancekm']),
      estimatedDurationMinutes: this.pickValue(row, ['estimatedDurationMinutes', 'estimateddurationminutes']),
      startPoint: this.pickValue(row, ['startPoint', 'startpoint']),
      endPoint: this.pickValue(row, ['endPoint', 'endpoint']),
      monthlyFee: this.pickValue(row, ['monthlyFee', 'monthlyfee']),
      isActive: Boolean(this.pickValue(row, ['isActive', 'isactive'], false)),
      createdAt: this.pickValue(row, ['createdAt', 'createdat']),
      stopsCount: Number(this.pickValue(row, ['stopsCount', 'stopscount'], 0)),
      studentsCount: Number(this.pickValue(row, ['studentsCount', 'studentscount'], 0))
    };
  }

  normalizePagination(page = 0, pageSize = 10) {
    const limit = Math.max(1, Math.min(parseInt(pageSize, 10) || 10, 100));
    const currentPage = Math.max(0, parseInt(page, 10) || 0);
    const offset = currentPage * limit;
    return { limit, offset, currentPage };
  }

  async findAll({ search, page = 0, pageSize = 10, schoolId } = {}) {
    const { limit, offset, currentPage } = this.normalizePagination(page, pageSize);
    const replacements = [schoolId];
    let searchClause = '';

    if (search) {
      searchClause = 'AND (tr.route_name LIKE ? OR tr.route_code LIKE ? OR tr.start_point LIKE ? OR tr.end_point LIKE ?)';
      const like = `%${search}%`;
      replacements.push(like, like, like, like);
    }

    const listQuery = `
      SELECT
        tr.id,
        tr.route_code AS routeCode,
        tr.route_name AS routeName,
        tr.route_description AS description,
        tr.total_distance_km AS totalDistanceKm,
        tr.estimated_duration_minutes AS estimatedDurationMinutes,
        tr.start_point AS startPoint,
        tr.end_point AS endPoint,
        tr.monthly_fee AS monthlyFee,
        tr.is_active AS isActive,
        tr.created_at AS createdAt,
        (SELECT COUNT(*) FROM transport_stops ts WHERE ts.route_id = tr.id AND ts.is_active = TRUE) AS stopsCount,
        (SELECT COUNT(*) FROM student_transport st WHERE st.route_id = tr.id AND st.status = 'active') AS studentsCount
      FROM transport_routes tr
      WHERE tr.school_id = ? AND tr.deleted_at IS NULL
      ${searchClause}
      ORDER BY tr.route_name ASC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM transport_routes tr
      WHERE tr.school_id = ? AND tr.deleted_at IS NULL
      ${searchClause}
    `;

    const listReplacements = [...replacements, limit, offset];
    const countReplacements = [...replacements];

    const [items, countRows] = await Promise.all([
      sequelize.query(listQuery, { type: QueryTypes.SELECT, replacements: listReplacements }),
      sequelize.query(countQuery, { type: QueryTypes.SELECT, replacements: countReplacements })
    ]);

    return {
      items: items.map((item) => this.normalizeRouteRow(item)),
      total: countRows?.[0]?.total ? Number(countRows[0].total) : 0,
      page: currentPage,
      pageSize: limit
    };
  }

  async findById(id, schoolId) {
    const query = `
      SELECT
        tr.id,
        tr.route_code AS routeCode,
        tr.route_name AS routeName,
        tr.route_description AS description,
        tr.total_distance_km AS totalDistanceKm,
        tr.estimated_duration_minutes AS estimatedDurationMinutes,
        tr.start_point AS startPoint,
        tr.end_point AS endPoint,
        tr.monthly_fee AS monthlyFee,
        tr.is_active AS isActive,
        tr.created_at AS createdAt
      FROM transport_routes tr
      WHERE tr.id = ? AND tr.school_id = ? AND tr.deleted_at IS NULL
      LIMIT 1
    `;
    const results = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: [id, schoolId]
    });
    return results[0] ? this.normalizeRouteRow(results[0]) : null;
  }

  async create(payload, schoolId) {
    const query = `
      INSERT INTO transport_routes
        (school_id, route_code, route_name, route_description, total_distance_km,
         estimated_duration_minutes, start_point, end_point, monthly_fee, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `;
    const [rows] = await sequelize.query(query, {
      replacements: [
        schoolId,
        payload.routeCode,
        payload.routeName,
        payload.description || null,
        payload.totalDistanceKm || null,
        payload.estimatedDurationMinutes || null,
        payload.startPoint || null,
        payload.endPoint || null,
        payload.monthlyFee || null,
        payload.isActive !== undefined ? payload.isActive : true
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
      routeCode: 'route_code',
      routeName: 'route_name',
      description: 'route_description',
      totalDistanceKm: 'total_distance_km',
      estimatedDurationMinutes: 'estimated_duration_minutes',
      startPoint: 'start_point',
      endPoint: 'end_point',
      monthlyFee: 'monthly_fee',
      isActive: 'is_active'
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
      UPDATE transport_routes
      SET ${fields.join(', ')}
      WHERE id = ? AND school_id = ? AND deleted_at IS NULL
    `;

    const [, metadata] = await sequelize.query(query, { replacements });
    const affected = metadata?.affectedRows ?? metadata?.rowCount ?? 0;
    if (!affected) return null;
    return this.findById(id, schoolId);
  }

  async softDelete(id, schoolId) {
    const query = `
      UPDATE transport_routes
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ? AND school_id = ? AND deleted_at IS NULL
    `;
    const [, metadata] = await sequelize.query(query, { replacements: [id, schoolId] });
    return (metadata?.affectedRows ?? metadata?.rowCount ?? 0) > 0;
  }

  async findAllActive(schoolId) {
    const query = `
      SELECT id, route_code AS routeCode, route_name AS routeName, monthly_fee AS monthlyFee
      FROM transport_routes
      WHERE school_id = ? AND is_active = TRUE AND deleted_at IS NULL
      ORDER BY route_name ASC
    `;
    const rows = await sequelize.query(query, { type: QueryTypes.SELECT, replacements: [schoolId] });
    return rows.map((row) => ({
      id: row.id,
      routeCode: this.pickValue(row, ['routeCode', 'routecode'], ''),
      routeName: this.pickValue(row, ['routeName', 'routename'], ''),
      monthlyFee: this.pickValue(row, ['monthlyFee', 'monthlyfee'])
    }));
  }
}

module.exports = new TransportRouteRepository();
