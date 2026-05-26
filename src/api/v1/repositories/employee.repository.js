const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { AppError } = require('../../../middleware/error.middleware');

const WRITABLE_COLUMNS = [
  'school_id','fname','lname','gender','dob','phone','email','address',
  'ephoto','aadhar_url','pan_url','designation','salary','joiningdate',
  'usertype','bank_name','bank_account_number','bank_ifsc_code','bank_account_holder_name',
];

class EmployeeRepository {
  buildWritablePayload(payload = {}, { isCreate = false } = {}) {
    const result = {};
    const assign = (col, value) => {
      if (typeof value !== 'undefined' && value !== '') result[col] = value;
    };
    if (isCreate && payload.schoolId) assign('school_id', payload.schoolId);
    assign('fname', payload.fname);
    assign('lname', payload.lname);
    assign('gender', payload.gen ?? payload.gender);
    assign('dob', payload.dob);
    assign('phone', payload.phone);
    assign('email', payload.email);
    if (typeof payload.address !== 'undefined') result.address = payload.address ?? '';
    assign('ephoto', payload.photoUrl ?? payload.ephoto ?? payload.photo_url);
    assign('aadhar_url', payload.aadharUrl ?? payload.aadhar_url);
    assign('pan_url', payload.panUrl ?? payload.pan_url);
    assign('designation', payload.desig ?? payload.designation);
    assign('salary', payload.salary);
    assign('joiningdate', payload.join ?? payload.joiningdate);
    assign('usertype', payload.usertype ?? (isCreate ? 1 : undefined));
    assign('bank_name', payload.bank_name);
    assign('bank_account_number', payload.bank_account_number);
    assign('bank_ifsc_code', payload.bank_ifsc_code);
    assign('bank_account_holder_name', payload.bank_account_holder_name);
    return result;
  }

  buildFilterClause(filters = {}) {
    const clauses = [];
    const replacements = {};
    if (filters.schoolId) { clauses.push('AND e.school_id = :schoolId'); replacements.schoolId = filters.schoolId; }
    if (filters.eid) { clauses.push('AND CAST(e.id AS TEXT) ILIKE :eid'); replacements.eid = `%${filters.eid}%`; }
    if (filters.fname) { clauses.push('AND e.fname ILIKE :fname'); replacements.fname = `%${filters.fname}%`; }
    if (filters.phone) { clauses.push('AND e.phone ILIKE :phone'); replacements.phone = `%${filters.phone}%`; }
    if (filters.email) { clauses.push('AND e.email ILIKE :email'); replacements.email = `%${filters.email}%`; }
    return { clause: clauses.length ? ` ${clauses.join(' ')}` : '', replacements };
  }

  normalizePagination(page = 1, pageSize = 10) {
    const limit = Math.max(1, Math.min(parseInt(pageSize, 10) || 10, 100));
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    return { limit, offset: (currentPage - 1) * limit, currentPage };
  }

  async findAll({ page = 1, pageSize = 10, filters = {} }) {
    const { clause, replacements } = this.buildFilterClause(filters);
    const { limit, offset, currentPage } = this.normalizePagination(page, pageSize);
    const SELECT_COLS = `e.id AS eid, e.fname, e.lname, e.gender AS gen, e.dob, e.phone, e.email, e.address,
      e.ephoto, e.designation, e.salary, e.joiningdate, e.usertype,
      e.aadhar_url, e.pan_url, e.bank_name, e.bank_account_number, e.bank_ifsc_code, e.bank_account_holder_name`;
    const countRows = await sequelize.query(
      `SELECT COUNT(*) AS total FROM employees e WHERE e.deleted_at IS NULL${clause}`,
      { replacements, type: QueryTypes.SELECT }
    );
    const items = await sequelize.query(
      `SELECT ${SELECT_COLS} FROM employees e WHERE e.deleted_at IS NULL${clause} ORDER BY e.id DESC LIMIT :limit OFFSET :offset`,
      { replacements: { ...replacements, limit, offset }, type: QueryTypes.SELECT }
    );
    return { items, total: countRows?.[0]?.total ? Number(countRows[0].total) : 0, page: currentPage, pageSize: limit };
  }

  async findById(eid) {
    const numericId = parseInt(eid, 10);
    if (Number.isNaN(numericId)) throw new AppError('Invalid employee identifier', 400);
    const SELECT_COLS = `e.id AS eid, e.fname, e.lname, e.gender AS gen, e.dob, e.phone, e.email, e.address,
      e.ephoto, e.designation, e.salary, e.joiningdate, e.usertype,
      e.aadhar_url, e.pan_url, e.bank_name, e.bank_account_number, e.bank_ifsc_code, e.bank_account_holder_name`;
    const rows = await sequelize.query(
      `SELECT ${SELECT_COLS} FROM employees e WHERE e.deleted_at IS NULL AND e.id = :eid LIMIT 1`,
      { replacements: { eid: numericId }, type: QueryTypes.SELECT }
    );
    const employee = rows?.[0] || null;
    if (!employee) throw new AppError('Employee not found', 404);
    return employee;
  }

  async create(payload = {}) {
    const data = this.buildWritablePayload(payload, { isCreate: true });
    const columns = Object.keys(data).filter((c) => WRITABLE_COLUMNS.includes(c));
    if (!data.fname) throw new AppError('First name is required', 400);
    const colList = columns.join(', ');
    const valList = columns.map((c) => `:${c}`).join(', ');
    const replacements = {};
    columns.forEach((c) => { replacements[c] = data[c]; });
    const rows = await sequelize.query(
      `INSERT INTO employees (${colList}) VALUES (${valList}) RETURNING id`,
      { replacements, type: QueryTypes.SELECT }
    );
    const insertedId = rows?.[0]?.id;
    if (!insertedId) throw new AppError('Failed to create employee', 500);
    return this.findById(insertedId);
  }

  async updateById(eid, payload = {}) {
    const numericId = parseInt(eid, 10);
    if (Number.isNaN(numericId)) throw new AppError('Invalid employee identifier', 400);
    const data = this.buildWritablePayload(payload);
    const columns = Object.keys(data).filter((c) => WRITABLE_COLUMNS.includes(c));
    if (columns.length === 0) throw new AppError('No employee fields to update', 400);
    const setClause = columns.map((c) => `${c} = :${c}`).join(', ');
    const replacements = { eid: numericId };
    columns.forEach((c) => { replacements[c] = data[c]; });
    await sequelize.query(
      `UPDATE employees SET ${setClause}, updated_at = NOW() WHERE id = :eid AND deleted_at IS NULL`,
      { replacements, type: QueryTypes.UPDATE }
    );
    return this.findById(numericId);
  }

  async deleteById(eid) {
    const numericId = parseInt(eid, 10);
    if (Number.isNaN(numericId)) throw new AppError('Invalid employee identifier', 400);
    await sequelize.query(
      'UPDATE employees SET deleted_at = NOW() WHERE id = :eid AND deleted_at IS NULL',
      { replacements: { eid: numericId }, type: QueryTypes.UPDATE }
    );
    return { message: 'Employee deleted successfully' };
  }
}

module.exports = new EmployeeRepository();
