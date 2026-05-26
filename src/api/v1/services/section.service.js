const { Class, AcademicYear, SchoolBranch, Teacher } = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');
const sectionRepository = require('../repositories/section.repository');

const sanitizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const parseRequiredPositiveInt = (value, fieldName) => {
  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be a positive integer`, 400);
  }
  return parsed;
};

class SectionService {
  async validateClassScope(classId, schoolId) {
    const classRecord = await Class.findOne({
      where: { id: classId },
      include: [
        { model: SchoolBranch, as: 'branch', attributes: ['school_id'] },
        { model: AcademicYear, as: 'academicYear', attributes: ['school_id'] }
      ]
    });

    const classSchoolId = classRecord?.branch?.school_id ?? classRecord?.academicYear?.school_id;

    if (!classRecord || Number(classSchoolId) !== Number(schoolId)) {
      throw new AppError('Class not found', 404);
    }

    return classRecord;
  }

  async validateClassTeacherScope(classTeacherId, schoolId) {
    const teacher = await Teacher.findOne({
      where: {
        id: classTeacherId,
        school_id: schoolId
      }
    });

    if (!teacher) {
      throw new AppError('Class teacher not found in school', 400);
    }

    return teacher;
  }

  async getSectionsByClass(classId, context = {}) {
    const { schoolId } = context;
    await this.validateClassScope(classId, schoolId);
    return sectionRepository.findAllByClass(classId);
  }

  async createSection(payload = {}, context = {}) {
    const { schoolId } = context;
    const classId = parseInt(payload.class_id, 10);

    if (!classId) {
      throw new AppError('class_id is required', 400);
    }

    await this.validateClassScope(classId, schoolId);

    const name = sanitizeText(payload.name);
    if (!name) {
      throw new AppError('Section name is required', 400);
    }

    const classTeacherId = parseRequiredPositiveInt(payload.class_teacher_id, 'class_teacher_id');
    await this.validateClassTeacherScope(classTeacherId, schoolId);

    const duplicate = await sectionRepository.findByClassAndName(classId, name);
    if (duplicate) {
      throw new AppError('Section with this name already exists in the class', 409);
    }

    return sectionRepository.create({
      class_id: classId,
      name,
      max_students: payload.max_students ? parseInt(payload.max_students, 10) : 40,
      room_number: sanitizeText(payload.room_number) || null,
      class_teacher_id: classTeacherId
    });
  }

  async updateSection(sectionId, payload = {}, context = {}) {
    const { schoolId } = context;

    const section = await sectionRepository.findById(sectionId);
    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await this.validateClassScope(section.class_id, schoolId);

    const updates = {};

    if (payload.name !== undefined) {
      const name = sanitizeText(payload.name);
      if (!name) {
        throw new AppError('Section name cannot be empty', 400);
      }

      if (name !== section.name) {
        const duplicate = await sectionRepository.findByClassAndName(section.class_id, name);
        if (duplicate && duplicate.id !== section.id) {
          throw new AppError('Section with this name already exists in the class', 409);
        }
      }

      updates.name = name;
    }

    if (payload.max_students !== undefined) {
      updates.max_students = parseInt(payload.max_students, 10);
    }

    if (payload.room_number !== undefined) {
      updates.room_number = sanitizeText(payload.room_number) || null;
    }

    if (payload.class_teacher_id !== undefined) {
      const classTeacherId = parseRequiredPositiveInt(payload.class_teacher_id, 'class_teacher_id');
      await this.validateClassTeacherScope(classTeacherId, schoolId);
      updates.class_teacher_id = classTeacherId;
    }

    return sectionRepository.update(sectionId, updates);
  }

  async deleteSection(sectionId, context = {}) {
    const { schoolId } = context;

    const section = await sectionRepository.findById(sectionId);
    if (!section) {
      throw new AppError('Section not found', 404);
    }

    await this.validateClassScope(section.class_id, schoolId);
    await sectionRepository.delete(sectionId);
    return true;
  }
}

module.exports = new SectionService();
