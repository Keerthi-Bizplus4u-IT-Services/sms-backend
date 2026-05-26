const classTimetableRepository = require('../repositories/class-timetable.repository');
const { Class, Section, Subject, Teacher, SchoolBranch, AcademicYear, TimetablePeriod } = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');

class ClassTimetableService {
  /**
   * Create a new timetable entry
   */
  async createEntry(payload, context) {
    const { schoolId } = context;
    const data = await this._validateAndNormalize(payload, schoolId);

    // Check slot conflict
    const slotTaken = await classTimetableRepository.isSlotOccupied(
      data.class_id, data.section_id, data.day_of_week, data.period_id
    );
    if (slotTaken) {
      throw new AppError('This slot is already occupied for the selected class, section, day, and period', 409);
    }

    // Check teacher double-booking
    const teacherBusy = await classTimetableRepository.isTeacherDoubleBooked(
      data.teacher_id, data.day_of_week, data.period_id
    );
    if (teacherBusy) {
      throw new AppError('This teacher is already assigned to another class at the same day and period', 409);
    }

    return classTimetableRepository.create(data);
  }

  /**
   * Update an existing timetable entry
   */
  async updateEntry(id, payload, context) {
    const { schoolId } = context;
    const existing = await classTimetableRepository.findByIdAndSchool(id, schoolId);

    const merged = {
      class_id: payload.class_id || existing.class_id,
      section_id: payload.section_id || existing.section_id,
      day_of_week: payload.day_of_week || existing.day_of_week,
      period_id: payload.period_id || existing.period_id,
      subject_id: payload.subject_id || existing.subject_id,
      teacher_id: payload.teacher_id || existing.teacher_id,
      room_number: payload.room_number !== undefined ? payload.room_number : existing.room_number,
      is_practical: payload.is_practical !== undefined ? payload.is_practical : existing.is_practical,
      effective_from: payload.effective_from !== undefined ? payload.effective_from : existing.effective_from,
      effective_to: payload.effective_to !== undefined ? payload.effective_to : existing.effective_to
    };

    // Check slot conflict (exclude self)
    const slotTaken = await classTimetableRepository.isSlotOccupied(
      merged.class_id, merged.section_id, merged.day_of_week, merged.period_id, id
    );
    if (slotTaken) {
      throw new AppError('This slot is already occupied for the selected class, section, day, and period', 409);
    }

    // Check teacher double-booking (exclude self)
    const teacherBusy = await classTimetableRepository.isTeacherDoubleBooked(
      merged.teacher_id, merged.day_of_week, merged.period_id, id
    );
    if (teacherBusy) {
      throw new AppError('This teacher is already assigned to another class at the same day and period', 409);
    }

    return classTimetableRepository.update(id, merged);
  }

  /**
   * Change teacher for an existing timetable entry
   */
  async changeTeacher(id, newTeacherId, context) {
    const { schoolId } = context;
    const existing = await classTimetableRepository.findByIdAndSchool(id, schoolId);

    // Validate the new teacher exists, is active, and belongs to school
    const teacherWhereClause = { id: newTeacherId, status: 'active' };
    if (schoolId) {
      teacherWhereClause.school_id = schoolId;
    }

    const teacher = await Teacher.findOne({ where: teacherWhereClause });
    if (!teacher) {
      throw new AppError('Teacher not found or inactive', 404);
    }

    // Check teacher double-booking (exclude self)
    const teacherBusy = await classTimetableRepository.isTeacherDoubleBooked(
      newTeacherId, existing.day_of_week, existing.period_id, id
    );
    if (teacherBusy) {
      throw new AppError('This teacher is already assigned to another class at the same day and period', 409);
    }

    return classTimetableRepository.update(id, { teacher_id: newTeacherId });
  }

  /**
   * Delete (soft) a timetable entry
   */
  async deleteEntry(id, context) {
    const { schoolId } = context;
    await classTimetableRepository.findByIdAndSchool(id, schoolId);
    return classTimetableRepository.softDelete(id);
  }

  /**
   * Get timetable for a class+section
   */
  async getByClassSection(params, context) {
    const { schoolId } = context;
    return classTimetableRepository.findByClassSection(
      params.classId, params.sectionId, schoolId
    );
  }

  /**
   * Get teacher workload summary
   */
  async getTeacherWorkload(context) {
    const { schoolId } = context;
    return classTimetableRepository.getTeacherWorkload(schoolId);
  }

  /**
   * Get detailed workload for a specific teacher
   */
  async getTeacherWorkloadDetail(teacherId, context) {
    const { schoolId } = context;
    return classTimetableRepository.getTeacherWorkloadDetail(teacherId, schoolId);
  }

  /**
   * Get timetable periods for an academic year
   */
  async getTimetablePeriods(academicYearId, context = {}) {
    const { schoolId } = context;
    if (academicYearId) {
      return classTimetableRepository.findPeriodsByAcademicYear(academicYearId, schoolId);
    }
    return classTimetableRepository.findAllActivePeriods(schoolId);
  }

  /**
   * Get timetable for a student's class+section (for parent view)
   */
  async getScheduleForStudent(studentId, schoolId) {
    return classTimetableRepository.findScheduleByClassSection(
      null, null, schoolId
    );
  }

  /**
   * Validate and normalize payload
   */
  async _validateAndNormalize(payload, schoolId) {
    // Validate class belongs to school
    const classRecord = await Class.findOne({
      where: { id: payload.class_id },
      include: [{
        model: SchoolBranch, as: 'branch',
        attributes: ['school_id']
      }, {
        model: AcademicYear, as: 'academicYear',
        attributes: ['id', 'school_id']
      }]
    });

    if (!classRecord) {
      throw new AppError('Class not found', 404);
    }

    if (schoolId && classRecord.branch?.school_id !== schoolId) {
      throw new AppError('Class does not belong to your school', 403);
    }

    if (schoolId && Number(classRecord.academicYear?.school_id) !== Number(schoolId)) {
      throw new AppError('Class academic year does not belong to your school', 403);
    }

    // Validate section belongs to class
    const section = await Section.findOne({
      where: { id: payload.section_id, class_id: payload.class_id }
    });
    if (!section) {
      throw new AppError('Section not found in selected class', 404);
    }

    // Validate subject exists
    const subjectWhereClause = { id: payload.subject_id };
    if (schoolId) {
      subjectWhereClause.school_id = schoolId;
    }

    const subject = await Subject.findOne({ where: subjectWhereClause });
    if (!subject) {
      throw new AppError('Subject not found', 404);
    }

    // Validate teacher exists and is active
    const teacherWhereClause = { id: payload.teacher_id, status: 'active' };
    if (schoolId) {
      teacherWhereClause.school_id = schoolId;
    }

    const teacher = await Teacher.findOne({ where: teacherWhereClause });
    if (!teacher) {
      throw new AppError('Teacher not found or inactive', 404);
    }

    // Validate period belongs to selected class academic year and school
    const period = await TimetablePeriod.findOne({
      where: {
        id: payload.period_id,
        academic_year_id: classRecord.academicYear?.id || classRecord.academic_year_id,
        is_active: true
      },
      include: [{
        model: AcademicYear,
        as: 'academicYear',
        attributes: ['id', 'school_id']
      }]
    });

    if (!period) {
      throw new AppError('Period not found for selected class academic year', 404);
    }

    if (schoolId && Number(period.academicYear?.school_id) !== Number(schoolId)) {
      throw new AppError('Period does not belong to your school', 403);
    }

    return {
      academic_year_id: classRecord.academicYear?.id || classRecord.academic_year_id,
      class_id: payload.class_id,
      section_id: payload.section_id,
      day_of_week: payload.day_of_week.toLowerCase(),
      period_id: payload.period_id,
      subject_id: payload.subject_id,
      teacher_id: payload.teacher_id,
      room_number: payload.room_number || null,
      is_practical: payload.is_practical || false,
      is_active: true,
      effective_from: payload.effective_from || null,
      effective_to: payload.effective_to || null
    };
  }
}

module.exports = new ClassTimetableService();
