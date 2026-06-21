const feeTermRepository = require('../repositories/fee-term.repository');
const { AppError } = require('../../../middleware/error.middleware');

class FeeTermService {
  normalizeDate(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return value;
  }

  validateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      throw new AppError('End date cannot be earlier than start date', 400);
    }
  }

  validateDueDate(startDate, endDate, dueDate) {
    if (!dueDate) {
      return;
    }

    const due = new Date(dueDate);
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (due < start || due > end) {
      throw new AppError('Due date must be within term start and end dates', 400);
    }
  }

  async getFeeTerms(query = {}, context = {}) {
    const academicYearId = query.academicYearId ? Number(query.academicYearId) : null;
    const includeInactive = query.includeInactive === true || query.includeInactive === 'true';

    return feeTermRepository.list(
      {
        academicYearId,
        includeInactive
      },
      context
    );
  }

  async createFeeTerm(payload = {}, context = {}) {
    const academicYearId = Number(payload.academicYearId);
    const lateFeePerDay = payload.lateFeePerDay === undefined ? 0 : Number(payload.lateFeePerDay);
    const lateFeeMax = payload.lateFeeMax === undefined ? 0 : Number(payload.lateFeeMax);
    const sortOrder = payload.sortOrder === undefined ? 1 : Number(payload.sortOrder);

    if (!academicYearId || academicYearId <= 0) {
      throw new AppError('Valid academic year is required', 400);
    }

    if (!payload.name || !String(payload.name).trim()) {
      throw new AppError('Term name is required', 400);
    }

    if (!this.normalizeDate(payload.startDate) || !this.normalizeDate(payload.endDate) || !this.normalizeDate(payload.dueDate)) {
      throw new AppError('Valid start date, end date and due date are required', 400);
    }

    if (Number.isNaN(lateFeePerDay) || lateFeePerDay < 0) {
      throw new AppError('Late fee per day must be zero or positive', 400);
    }

    if (Number.isNaN(lateFeeMax) || lateFeeMax < 0) {
      throw new AppError('Late fee max must be zero or positive', 400);
    }

    if (Number.isNaN(sortOrder) || sortOrder <= 0) {
      throw new AppError('Sort order must be greater than zero', 400);
    }

    this.validateDateRange(payload.startDate, payload.endDate);
    this.validateDueDate(payload.startDate, payload.endDate, payload.dueDate);

    const created = await feeTermRepository.create(
      {
        academicYearId,
        name: String(payload.name).trim(),
        startDate: payload.startDate,
        endDate: payload.endDate,
        dueDate: payload.dueDate,
        lateFeePerDay,
        lateFeeMax,
        sortOrder,
        isActive: payload.isActive === undefined ? true : Boolean(payload.isActive)
      },
      context
    );

    if (!created) {
      throw new AppError('Unable to create fee term', 500);
    }

    return created;
  }

  async updateFeeTerm(id, payload = {}, context = {}) {
    const termId = Number(id);

    if (!termId || termId <= 0) {
      throw new AppError('Valid fee term id is required', 400);
    }

    const existing = await feeTermRepository.findById(termId, context);
    if (!existing) {
      throw new AppError('Fee term not found', 404);
    }

    const updates = {};

    if (typeof payload.name !== 'undefined') {
      if (!String(payload.name).trim()) {
        throw new AppError('Term name cannot be empty', 400);
      }
      updates.name = String(payload.name).trim();
    }

    if (typeof payload.startDate !== 'undefined') {
      if (!this.normalizeDate(payload.startDate)) {
        throw new AppError('Invalid start date', 400);
      }
      updates.startDate = payload.startDate;
    }

    if (typeof payload.endDate !== 'undefined') {
      if (!this.normalizeDate(payload.endDate)) {
        throw new AppError('Invalid end date', 400);
      }
      updates.endDate = payload.endDate;
    }

    if (typeof payload.dueDate !== 'undefined') {
      if (!this.normalizeDate(payload.dueDate)) {
        throw new AppError('Invalid due date', 400);
      }
      updates.dueDate = payload.dueDate;
    }

    if (typeof payload.lateFeePerDay !== 'undefined') {
      const lateFeePerDay = Number(payload.lateFeePerDay);
      if (Number.isNaN(lateFeePerDay) || lateFeePerDay < 0) {
        throw new AppError('Late fee per day must be zero or positive', 400);
      }
      updates.lateFeePerDay = lateFeePerDay;
    }

    if (typeof payload.lateFeeMax !== 'undefined') {
      const lateFeeMax = Number(payload.lateFeeMax);
      if (Number.isNaN(lateFeeMax) || lateFeeMax < 0) {
        throw new AppError('Late fee max must be zero or positive', 400);
      }
      updates.lateFeeMax = lateFeeMax;
    }

    if (typeof payload.sortOrder !== 'undefined') {
      const sortOrder = Number(payload.sortOrder);
      if (Number.isNaN(sortOrder) || sortOrder <= 0) {
        throw new AppError('Sort order must be greater than zero', 400);
      }
      updates.sortOrder = sortOrder;
    }

    if (typeof payload.isActive !== 'undefined') {
      updates.isActive = Boolean(payload.isActive);
    }

    if (typeof payload.academicYearId !== 'undefined') {
      const academicYearId = Number(payload.academicYearId);
      if (!academicYearId || academicYearId <= 0) {
        throw new AppError('Valid academic year is required', 400);
      }
      updates.academicYearId = academicYearId;
    }

    const startDate = updates.startDate || existing.start_date;
    const endDate = updates.endDate || existing.end_date;
    const dueDate = updates.dueDate || existing.due_date;

    this.validateDateRange(startDate, endDate);
    this.validateDueDate(startDate, endDate, dueDate);

    return feeTermRepository.update(termId, updates, context);
  }

  async deleteFeeTerm(id, context = {}) {
    const termId = Number(id);

    if (!termId || termId <= 0) {
      throw new AppError('Valid fee term id is required', 400);
    }

    return feeTermRepository.delete(termId, context);
  }
}

module.exports = new FeeTermService();
