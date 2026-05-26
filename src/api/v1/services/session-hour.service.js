const sessionHourRepository = require('../repositories/session-hour.repository');
const { Class, Section, AcademicYear } = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');

const VALID_SCOPES = ['SCHOOL', 'CLASS', 'SECTION'];

class SessionHourService {
  async listSessionHours(filters = {}, context = {}) {
    const { schoolId } = context;
    return sessionHourRepository.findAll({
      ...filters,
      schoolId
    });
  }

  async getEffectiveSessionHours(params = {}, context = {}) {
    const { schoolId } = context;
    const classId = params.classId ? parseInt(params.classId, 10) : null;
    const sectionId = params.sectionId ? parseInt(params.sectionId, 10) : null;

    await this.validateEffectiveScope({ classId, sectionId, schoolId });

    return sessionHourRepository.findEffective({
      schoolId,
      classId,
      sectionId
    });
  }

  async validateEffectiveScope({ classId, sectionId, schoolId }) {
    if (!schoolId) {
      throw new AppError('School context is required', 400);
    }

    let classRecord = null;

    if (classId) {
      classRecord = await Class.findOne({
        where: { id: classId },
        include: [{ model: AcademicYear, as: 'academicYear', attributes: ['id', 'school_id'] }]
      });

      if (!classRecord) {
        throw new AppError('Class not found', 404);
      }

      if (!classRecord.academicYear || Number(classRecord.academicYear.school_id) !== Number(schoolId)) {
        throw new AppError('Class does not belong to your school', 403);
      }
    }

    if (sectionId) {
      const sectionWhereClause = { id: sectionId };
      if (classId) {
        sectionWhereClause.class_id = classId;
      }

      const sectionRecord = await Section.findOne({ where: sectionWhereClause });

      if (!sectionRecord) {
        throw new AppError(classId ? 'Section not found in selected class' : 'Section not found', 404);
      }

      if (!classId) {
        classRecord = await Class.findOne({
          where: { id: sectionRecord.class_id },
          include: [{ model: AcademicYear, as: 'academicYear', attributes: ['id', 'school_id'] }]
        });

        if (!classRecord || !classRecord.academicYear || Number(classRecord.academicYear.school_id) !== Number(schoolId)) {
          throw new AppError('Section does not belong to your school', 403);
        }
      }
    }
  }

  async createSessionHour(payload = {}, context = {}) {
    const { schoolId } = context;
    const data = await this.validateAndNormalizePayload(payload, schoolId);

    return sessionHourRepository.create({
      ...data,
      school_id: schoolId
    });
  }

  async updateSessionHour(id, payload = {}, context = {}) {
    const { schoolId } = context;
    const existing = await sessionHourRepository.findById(id, schoolId);
    const baseValues = {
      scope: existing.scope,
      class_id: existing.class_id,
      section_id: existing.section_id,
      start_time: existing.start_time,
      end_time: existing.end_time,
      period_label: existing.period_label
    };
    const mergedPayload = { ...baseValues, ...payload };
    const data = await this.validateAndNormalizePayload(mergedPayload, schoolId, { isUpdate: true });
    return sessionHourRepository.update(id, data, schoolId);
  }

  async deleteSessionHour(id, context = {}) {
    const { schoolId } = context;
    return sessionHourRepository.delete(id, schoolId);
  }

  async validateAndNormalizePayload(payload, schoolId, options = {}) {
    const errors = [];

    const scope = (payload.scope || 'SCHOOL').toUpperCase();
    if (!VALID_SCOPES.includes(scope)) {
      errors.push('Invalid scope value');
    }

    const startTime = payload.start_time || payload.startTime;
    const endTime = payload.end_time || payload.endTime;

    if (!startTime) {
      errors.push('start_time is required');
    }

    if (!endTime) {
      errors.push('end_time is required');
    }

    if (startTime && endTime && startTime >= endTime) {
      errors.push('end_time must be greater than start_time');
    }

    if (errors.length) {
      throw new AppError(errors.join(', '), 400);
    }

    let classRecord = null;
    let sectionRecord = null;
    const classId = payload.class_id || payload.classId || null;
    const sectionId = payload.section_id || payload.sectionId || null;

    if (scope !== 'SCHOOL') {
      if (!classId) {
        throw new AppError('class_id is required for class or section scope', 400);
      }

      classRecord = await Class.findOne({
        where: { id: classId },
        include: [{ model: AcademicYear, as: 'academicYear', attributes: ['id', 'school_id'] }]
      });

      if (!classRecord) {
        throw new AppError(`Class with id ${classId} not found`, 404);
      }

      if (!classRecord.academicYear) {
        throw new AppError(`Class ${classId} has no associated academic year`, 404);
      }

      if (Number(classRecord.academicYear.school_id) !== Number(schoolId)) {
        throw new AppError('Class not found', 404);
      }
    }

    if (scope === 'SECTION') {
      if (!sectionId) {
        throw new AppError('section_id is required for section scope', 400);
      }

      sectionRecord = await Section.findOne({ where: { id: sectionId, class_id: classId } });

      if (!sectionRecord) {
        throw new AppError('Section not found in selected class', 404);
      }
    }

    const normalized = {
      scope,
      start_time: startTime,
      end_time: endTime,
      period_label: payload.period_label || payload.periodLabel || null,
      class_id: scope === 'SCHOOL' ? null : classRecord?.id || classId,
      section_id: scope === 'SECTION' ? sectionRecord?.id || sectionId : null
    };

    return normalized;
  }
}

module.exports = new SessionHourService();
