const employeeRepository = require('../repositories/employee.repository');
const { AppError } = require('../../../middleware/error.middleware');

class EmployeeService {
  async getEmployees(query = {}, schoolId = null) {
    const { page, pageSize, limit, ...filters } = query;
    if (schoolId) filters.schoolId = schoolId;
    return await employeeRepository.findAll({
      page,
      pageSize: pageSize || limit,
      filters
    });
  }

  async getEmployeeById(eid) {
    return await employeeRepository.findById(eid);
  }

  async deleteEmployee(eid) {
    return await employeeRepository.deleteById(eid);
  }

  async createEmployee(payload = {}, options = {}) {
    const normalizedPayload = {
      ...payload,
      photoUrl: options.photoUrl || null,
      aadharUrl: options.aadharUrl || null,
      panUrl: options.panUrl || null
    };

    if (!normalizedPayload.fname || !normalizedPayload.lname) {
      throw new AppError('First name and last name are required', 400);
    }

    return await employeeRepository.create(normalizedPayload);
  }

  async updateEmployee(eid, payload = {}, options = {}) {
    const normalizedPayload = {
      ...payload
    };

    if (typeof options.photoUrl !== 'undefined') {
      normalizedPayload.photoUrl = options.photoUrl;
    }

    if (typeof options.aadharUrl !== 'undefined') {
      normalizedPayload.aadharUrl = options.aadharUrl;
    }

    if (typeof options.panUrl !== 'undefined') {
      normalizedPayload.panUrl = options.panUrl;
    }

    return await employeeRepository.updateById(eid, normalizedPayload);
  }
}

module.exports = new EmployeeService();
