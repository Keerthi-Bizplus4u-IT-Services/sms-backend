const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');

class TransportRepository {
  normalizePagination(page = 0, pageSize = 10) {
    const limit = Math.max(1, Math.min(parseInt(pageSize, 10) || 10, 100));
    const currentPage = Math.max(0, parseInt(page, 10) || 0);
    const offset = currentPage * limit;

    return { limit, offset, currentPage };
  }

  buildSearchClause(search) {
    if (!search) {
      return { clause: '', values: [] };
    }

    const likeValue = `%${search}%`;

    return {
      clause:
        'WHERE rname LIKE ? OR vno LIKE ? OR dname LIKE ? OR lno LIKE ? OR phno LIKE ?',
      values: [likeValue, likeValue, likeValue, likeValue, likeValue]
    };
  }

  async findAll({ search, page = 0, pageSize = 10 } = {}) {
    const { limit, offset, currentPage } = this.normalizePagination(page, pageSize);
    const searchFragment = this.buildSearchClause(search);

    const listQuery = `
      SELECT
        bid AS id,
        rname AS routeName,
        vno AS vehicleNumber,
        dname AS driverName,
        lno AS licenseNumber,
        phno AS phoneNumber
      FROM transport
      ${searchFragment.clause}
      ORDER BY bid DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM transport
      ${searchFragment.clause}
    `;

    const listReplacements = [...searchFragment.values, limit, offset];
    const countReplacements = [...searchFragment.values];

    const [items, countRows] = await Promise.all([
      sequelize.query(listQuery, {
        type: QueryTypes.SELECT,
        replacements: listReplacements
      }),
      sequelize.query(countQuery, {
        type: QueryTypes.SELECT,
        replacements: countReplacements
      })
    ]);

    const total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;

    return {
      items,
      total,
      page: currentPage,
      pageSize: limit
    };
  }

  async findById(id) {
    const query = `
      SELECT
        bid AS id,
        rname AS routeName,
        vno AS vehicleNumber,
        dname AS driverName,
        lno AS licenseNumber,
        phno AS phoneNumber
      FROM transport
      WHERE bid = ?
      LIMIT 1
    `;

    const results = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: [id]
    });

    return results[0] || null;
  }

  async create(payload) {
    const insertQuery = `
      INSERT INTO transport (rname, vno, dname, lno, phno)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [, metadata] = await sequelize.query(insertQuery, {
      replacements: [
        payload.routeName,
        payload.vehicleNumber,
        payload.driverName,
        payload.licenseNumber,
        payload.phoneNumber
      ]
    });

    const insertedId = metadata?.insertId;

    if (!insertedId) {
      return null;
    }

    return this.findById(insertedId);
  }

  async update(id, payload) {
    const updateQuery = `
      UPDATE transport
      SET
        rname = ?,
        vno = ?,
        dname = ?,
        lno = ?,
        phno = ?
      WHERE bid = ?
    `;

    const [, metadata] = await sequelize.query(updateQuery, {
      replacements: [
        payload.routeName,
        payload.vehicleNumber,
        payload.driverName,
        payload.licenseNumber,
        payload.phoneNumber,
        id
      ]
    });

    const affectedRows =
      metadata?.affectedRows ?? metadata?.rowCount ?? metadata ?? 0;

    if (!affectedRows) {
      return null;
    }

    return this.findById(id);
  }

  async delete(id) {
    const deleteQuery = `
      DELETE FROM transport
      WHERE bid = ?
    `;

    const [, metadata] = await sequelize.query(deleteQuery, {
      replacements: [id]
    });

    const affectedRows =
      metadata?.affectedRows ?? metadata?.rowCount ?? metadata ?? 0;

    return Boolean(affectedRows);
  }
}

module.exports = new TransportRepository();
