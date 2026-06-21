const studentRepository = require('../repositories/student.repository');
const { AppError } = require('../../../middleware/error.middleware');
const { AcademicYear, Class, Section, sequelize } = require('../../../models');

/**
 * Student Service
 * Business logic for student operations
 */

class StudentService {
  getNextAdmissionNumber(lastAdmissionNumber) {
    if (!lastAdmissionNumber || typeof lastAdmissionNumber !== 'string') {
      return 'ADM0001';
    }

    const trimmed = lastAdmissionNumber.trim();
    const matched = trimmed.match(/^(.*?)(\d+)$/);

    if (!matched) {
      return 'ADM0001';
    }

    const prefix = matched[1] || 'ADM';
    const numericPart = matched[2] || '0000';
    const parsed = Number.parseInt(numericPart, 10);
    const nextValue = (Number.isNaN(parsed) ? 0 : parsed) + 1;
    const minWidth = Math.max(4, numericPart.length);

    return `${prefix}${String(nextValue).padStart(minWidth, '0')}`;
  }

  getNextRollNumber(existingRollNumbers = []) {
    const numericRolls = existingRollNumbers
      .map((rollNumber) => {
        if (typeof rollNumber !== 'string') {
          return null;
        }

        const matched = rollNumber.trim().match(/(\d+)/);
        if (!matched) {
          return null;
        }

        const parsed = Number.parseInt(matched[1], 10);
        return Number.isNaN(parsed) ? null : parsed;
      })
      .filter((value) => Number.isInteger(value) && value > 0);

    if (!numericRolls.length) {
      return '1';
    }

    return String(Math.max(...numericRolls) + 1);
  }

  pickSectionForAdmission(sections, preferredSectionId = null) {
    if (!Array.isArray(sections) || sections.length === 0) {
      return null;
    }

    const normalizedPreferred = preferredSectionId ? Number.parseInt(String(preferredSectionId), 10) : null;

    if (normalizedPreferred) {
      const preferred = sections.find((section) => section.id === normalizedPreferred);
      if (preferred) {
        return preferred;
      }
    }

    const withCapacity = sections.filter((section) => section.has_capacity);
    const candidates = withCapacity.length ? withCapacity : sections;

    return candidates.reduce((selected, current) => {
      if (!selected) {
        return current;
      }

      if (current.current_strength < selected.current_strength) {
        return current;
      }

      if (current.current_strength === selected.current_strength && String(current.name).localeCompare(String(selected.name)) < 0) {
        return current;
      }

      return selected;
    }, null);
  }

  resolveSchoolId(payload, context = {}) {
    const fromContext = context?.schoolId;
    if (fromContext) {
      return fromContext;
    }

    const candidate =
      payload?.student?.school_id ??
      payload?.student?.schoolId ??
      payload?.school_id ??
      payload?.schoolId;

    const parsedCandidate = candidate ? parseInt(candidate, 10) : null;
    if (parsedCandidate) {
      return parsedCandidate;
    }

    const envValue = process.env.DEFAULT_SCHOOL_ID ?? '1';
    const envDefault = parseInt(envValue, 10);

    if (!Number.isNaN(envDefault) && envDefault > 0) {
      return envDefault;
    }

    throw new AppError('School context is required', 400);
  }

  normalizeBranchId(branchId) {
    if (typeof branchId === 'undefined' || branchId === null) {
      return null;
    }
    const parsed = parseInt(branchId, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  /**
   * Get all students with filters
   */
  async getStudents(filters = {}, context = {}) {
    const schoolId = context.isSuperAdmin
      ? (filters.schoolId || null)
      : this.resolveSchoolId({ school_id: filters.schoolId }, context);

    const result = await studentRepository.findAll({
      ...filters,
      schoolId
    });

    return {
      ...result,
      students: result.students.map((student) => this.serializeStudent(student))
    };
  }

  /**
   * Get student by ID
   */
  async getStudentById(id, context = {}) {
    const schoolId = this.resolveSchoolId({}, context);
    const student = await studentRepository.findById(id, { schoolId });
    return student ? this.serializeStudent(student) : null;
  }

  /**
   * Get student by admission number
   */
  async getStudentByAdmissionNumber(admissionNumber, context = {}) {
    const schoolId = this.resolveSchoolId({}, context);
    const student = await studentRepository.findByAdmissionNumber(admissionNumber, { schoolId });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    return this.serializeStudent(student);
  }

  /**
   * Get student by roll number
   */
  async getStudentByRollNumber(rollNumber, context = {}) {
    const schoolId = this.resolveSchoolId({}, context);
    const student = await studentRepository.findByRollNumber(rollNumber, { schoolId });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    return this.serializeStudent(student);
  }

  /**
   * Get student profile by user ID (for logged-in student)
   */
  async getStudentByUserId(userId) {
    const student = await studentRepository.findByUserId(userId);

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    return this.serializeStudent(student);
  }

  /**
   * Auto-suggest admission number, section and roll number for new admission
   */
  async getAdmissionRollSuggestion(payload = {}, context = {}) {
    const classId = Number.parseInt(String(payload.classId || payload.class_id || ''), 10);
    const preferredSectionId = payload.sectionId || payload.section_id || null;

    if (Number.isNaN(classId) || classId <= 0) {
      throw new AppError('Class is required', 400);
    }

    const schoolId = this.resolveSchoolId({}, context);
    const [lastAdmissionNumber, sections] = await Promise.all([
      studentRepository.findLatestAdmissionNumber({ schoolId }),
      studentRepository.getSectionPlacementContext(classId, { schoolId })
    ]);

    if (!sections.length) {
      throw new AppError('No sections configured for selected class', 400);
    }

    const hasAnyCapacity = sections.some((section) => section.has_capacity);
    if (!hasAnyCapacity) {
      throw new AppError('All sections in this class are full. Please create a new section before admitting more students.', 409);
    }

    const selectedSection = this.pickSectionForAdmission(sections, preferredSectionId);
    const rollNumbers = await studentRepository.getSectionRollNumbers(selectedSection.id, {
      schoolId,
      classId
    });

    return {
      admissionNumber: this.getNextAdmissionNumber(lastAdmissionNumber),
      rollNumber: this.getNextRollNumber(rollNumbers),
      sectionId: selectedSection.id,
      sectionName: selectedSection.name,
      sections: sections.map((section) => ({
        id: section.id,
        name: section.name,
        maxStudents: section.max_students,
        currentStrength: section.current_strength,
        hasCapacity: section.has_capacity,
        suggested: section.id === selectedSection.id
      }))
    };
  }

  /**
   * Create student
   */
  async createStudent(data, context = {}) {
    const { student, person, user } = data;
    const schoolId = this.resolveSchoolId(data, context);
    const branchId = this.normalizeBranchId(
      student?.branch_id ??
        student?.branchId ??
        process.env.DEFAULT_BRANCH_ID ??
        '1'
    );

    if (!branchId) {
      throw new AppError('Branch is required for student enrollment', 400);
    }

    // Validate required fields
    if (!person.first_name || !person.last_name || !person.date_of_birth || !person.gender) {
      throw new AppError('Person details are incomplete', 400);
    }

    if (!student.class_id || !student.admission_date) {
      throw new AppError('Student details are incomplete', 400);
    }

    const sectionPlacement = await studentRepository.getSectionPlacementContext(student.class_id, {
      schoolId
    });

    const hasAnyCapacity = sectionPlacement.some((section) => section.has_capacity);
    if (!hasAnyCapacity) {
      throw new AppError('All sections in this class are full. Please create a new section before admitting more students.', 409);
    }

    const selectedSection = this.pickSectionForAdmission(sectionPlacement, student.section_id);
    if (!selectedSection) {
      throw new AppError('No sections configured for selected class', 400);
    }

    if (!selectedSection.has_capacity) {
      throw new AppError('Selected section is full. Please choose another section with available seats.', 409);
    }

    const [lastAdmissionNumber, rollNumbers] = await Promise.all([
      studentRepository.findLatestAdmissionNumber({ schoolId }),
      studentRepository.getSectionRollNumbers(selectedSection.id, {
        schoolId,
        classId: student.class_id
      })
    ]);

    const requestedAdmissionNumber =
      typeof student.admission_number === 'string' && student.admission_number.trim().length > 0
        ? student.admission_number.trim()
        : null;

    const admissionNumber = requestedAdmissionNumber || this.getNextAdmissionNumber(lastAdmissionNumber);

    const aparId =
      typeof student.apar_id === 'string' && student.apar_id.trim().length > 0
        ? student.apar_id.trim()
        : null;

    const existing = await studentRepository.findByAdmissionNumber(admissionNumber, {
      schoolId
    });

    if (existing) {
      throw new AppError('Admission number already exists', 409);
    }

    const requestedRollNumber =
      typeof student.roll_number === 'string' && student.roll_number.trim().length > 0
        ? student.roll_number.trim()
        : null;

    const rollNumber = requestedRollNumber || this.getNextRollNumber(rollNumbers);

    const normalizedStudent = {
      ...student,
      admission_number: admissionNumber,
      ...(aparId ? { apar_id: aparId } : {}),
      roll_number: rollNumber,
      section_id: selectedSection.id,
      school_id: schoolId,
      branch_id: branchId
    };

    const normalizedUser = user
      ? {
          ...user,
          school_id: schoolId
        }
      : null;

    const createdStudent = await studentRepository.create(normalizedStudent, person, normalizedUser);
    return this.serializeStudent(createdStudent);
  }

  /**
   * Update student
   */
  async updateStudent(id, data, context = {}) {
    const { student, person } = data;
    const schoolId = this.resolveSchoolId(data, context);
    const targetStudentId = Number.parseInt(id, 10);
    const existingStudent = await studentRepository.findById(id, { schoolId });

    if (!existingStudent) {
      throw new AppError('Student not found', 404);
    }

    const normalizeNullableString = (value) => {
      if (typeof value !== 'string') {
        return value;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    if (Object.prototype.hasOwnProperty.call(student || {}, 'admission_number')) {
      const requestedAdmissionNumber = normalizeNullableString(student.admission_number);
      const currentAdmissionNumber = normalizeNullableString(existingStudent.admission_number);

      if (requestedAdmissionNumber !== currentAdmissionNumber) {
        throw new AppError('Admission number cannot be changed once created', 400);
      }
    }

    if (Object.prototype.hasOwnProperty.call(student || {}, 'roll_number')) {
      const requestedRollNumber = normalizeNullableString(student.roll_number);
      const currentRollNumber = normalizeNullableString(existingStudent.roll_number);

      if (requestedRollNumber !== currentRollNumber) {
        throw new AppError('Roll number cannot be changed once created', 400);
      }
    }

    const sanitizedStudentPayload = { ...(student || {}) };
    delete sanitizedStudentPayload.admission_number;
    delete sanitizedStudentPayload.roll_number;

    // If admission number is being changed, check uniqueness
    if (sanitizedStudentPayload?.admission_number) {
      const existing = await studentRepository.findByAdmissionNumber(sanitizedStudentPayload.admission_number, {
        schoolId
      });

      const existingStudentId = Number.parseInt(existing?.id, 10);
      if (existing && (Number.isNaN(targetStudentId) || Number.isNaN(existingStudentId) || existingStudentId !== targetStudentId)) {
        throw new AppError('Admission number already exists', 409);
      }
    }

    if (sanitizedStudentPayload?.branch_id) {
      sanitizedStudentPayload.branch_id = this.normalizeBranchId(sanitizedStudentPayload.branch_id);
    }

    const updatedStudent = await studentRepository.update(id, sanitizedStudentPayload, person, { schoolId });
    return this.serializeStudent(updatedStudent);
  }

  /**
   * Delete student
   */
  async deleteStudent(id, context = {}) {
    const schoolId = this.resolveSchoolId({}, context);
    return await studentRepository.delete(id, { schoolId });
  }

  /**
   * Get students by class
   */
  async getStudentsByClass(classId, options = {}) {
    const schoolId = this.resolveSchoolId({}, options);
    const result = await studentRepository.findByClass(classId, {
      schoolId,
      page: options.page,
      limit: options.limit,
      status: options.status,
      search: options.search
    });

    return {
      ...result,
      students: (result.students || []).map((student) => this.serializeStudent(student))
    };
  }

  /**
   * Get students by section
   */
  async getStudentsBySection(classId, sectionId, options = {}) {
    const schoolId = this.resolveSchoolId({}, options);
    const result = await studentRepository.findBySection(classId, sectionId, {
      schoolId,
      page: options.page,
      limit: options.limit,
      status: options.status,
      search: options.search
    });

    return {
      ...result,
      students: (result.students || []).map((student) => this.serializeStudent(student))
    };
  }

  /**
   * Promote students between classes and academic years
   */
  async promoteStudents(payload, context = {}) {
    const schoolId = this.resolveSchoolId({}, context);
    const normalizedContext = { ...context, schoolId };

    const {
      fromAcademicYearId,
      toAcademicYearId,
      fromClassId,
      toClassId,
      studentIds
    } = payload;

    if (!fromAcademicYearId || !toAcademicYearId || !fromClassId || !toClassId) {
      throw new AppError('Incomplete promotion payload', 400);
    }

    if (fromAcademicYearId === toAcademicYearId) {
      throw new AppError('From and to academic years cannot be the same', 400);
    }

    if (fromClassId === toClassId) {
      throw new AppError('From and to classes cannot be the same', 400);
    }

    const [fromYear, toYear] = await Promise.all([
      AcademicYear.findByPk(fromAcademicYearId),
      AcademicYear.findByPk(toAcademicYearId)
    ]);

    if (normalizedContext?.schoolId) {
      if ((fromYear && fromYear.school_id !== normalizedContext.schoolId) || (toYear && toYear.school_id !== normalizedContext.schoolId)) {
        throw new AppError('Academic years do not belong to your school context', 403);
      }
    }

    if (!fromYear) {
      throw new AppError('Source academic year not found', 404);
    }

    if (!toYear) {
      throw new AppError('Destination academic year not found', 404);
    }

    const [fromClass, toClass] = await Promise.all([
      Class.findByPk(fromClassId),
      Class.findByPk(toClassId)
    ]);

    if (!fromClass) {
      throw new AppError('Source class not found', 404);
    }

    if (!toClass) {
      throw new AppError('Destination class not found', 404);
    }

    if (fromClass.academic_year_id !== fromYear.id) {
      throw new AppError('Source class does not belong to the selected academic year', 400);
    }

    if (toClass.academic_year_id !== toYear.id) {
      throw new AppError('Destination class does not belong to the selected academic year', 400);
    }

    const normalizedStudentIds = Array.isArray(studentIds)
      ? [...new Set(studentIds.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id)))]
      : [];

    const students = await studentRepository.findActiveByClassForPromotion(
      fromClassId,
      normalizedStudentIds,
      normalizedContext
    );

    if (!students.length) {
      throw new AppError('No active students found in the source class', 404);
    }

    if (normalizedStudentIds.length && students.length !== normalizedStudentIds.length) {
      const foundIds = students.map((student) => student.id);
      const missing = normalizedStudentIds.filter((id) => !foundIds.includes(id));
      throw new AppError(
        `Some students were not found in the source class: ${missing.join(', ')}`,
        404
      );
    }

    const toSections = await Section.findAll({
      where: { class_id: toClassId },
      order: [['name', 'ASC']]
    });

    if (!toSections.length) {
      throw new AppError('Destination class does not have any sections configured', 400);
    }

    const sectionLookup = new Map();
    toSections.forEach((section) => {
      if (section.name) {
        sectionLookup.set(section.name.trim().toLowerCase(), section);
      }
    });

    const defaultSection = toSections[0];
    const updatesBySection = new Map();

    students.forEach((student) => {
      const sourceSectionName = student.section?.name?.trim().toLowerCase();
      const targetSection = sourceSectionName ? sectionLookup.get(sourceSectionName) : null;
      const resolvedSection = targetSection || defaultSection;

      if (!updatesBySection.has(resolvedSection.id)) {
        updatesBySection.set(resolvedSection.id, []);
      }
      updatesBySection.get(resolvedSection.id).push(student.id);
    });

    const promotedCount = students.length;

    await sequelize.transaction(async (transaction) => {
      for (const [sectionId, ids] of updatesBySection.entries()) {
        await studentRepository.bulkUpdateClassAndSection(ids, toClassId, sectionId, transaction);
      }

      await this.recordPromotionAudit(
        {
          fromAcademicYearId: fromYear.id,
          toAcademicYearId: toYear.id,
          fromYearName: fromYear.name,
          toYearName: toYear.name,
          fromClassId: fromClass.id,
          toClassId: toClass.id,
          fromClassName: fromClass.name,
          toClassName: toClass.name,
          requestedBy: normalizedContext?.userId || null
        },
        transaction
      );
    });

    return {
      promotedCount,
      fromAcademicYear: { id: fromYear.id, name: fromYear.name },
      toAcademicYear: { id: toYear.id, name: toYear.name },
      fromClass: { id: fromClass.id, name: fromClass.name },
      toClass: { id: toClass.id, name: toClass.name }
    };
  }

  async recordPromotionAudit(details, transaction) {
    const sql =
      'INSERT INTO promotion (cursession, prosession, profromclass, protoclass) VALUES (?, ?, ?, ?)';

    try {
      await sequelize.query(sql, {
        replacements: [
          details.fromYearName,
          details.toYearName,
          details.fromClassName || String(details.fromClassId),
          details.toClassName || String(details.toClassId)
        ],
        transaction
      });
    } catch (error) {
      console.warn('Promotion audit logging skipped:', error.message);
    }
  }

  serializeStudent(student) {
    if (!student) {
      return null;
    }

    const person = student.person || {};
    const user = person.user || {};
    const branch = student.branch || {};
    const classInfo = student.class || {};
    const section = student.section || {};

    const className =
      classInfo.name ||
      classInfo.cname ||
      classInfo.cn ||
      null;

    const sectionName =
      section.name ||
      section.sname ||
      section.secname ||
      null;

    return {
      id: student.id,
      personId: student.person_id,
      admissionNumber: student.admission_number,
      aparId: student.apar_id || null,
      rollNumber: student.roll_number,
      classId: student.class_id,
      sectionId: student.section_id,
      admissionDate: student.admission_date,
      status: student.status,
      firstName: person.first_name || null,
      lastName: person.last_name || null,
      middleName: person.middle_name || null,
      gender: person.gender || 'other',
      dateOfBirth: person.date_of_birth || null,
      bloodGroup: person.blood_group || null,
      phone: person.phone || student.emergency_contact || null,
      email: user.email || person.email || person.father_email || person.mother_email || null,
      addressLine1: person.address_line1 || null,
      addressLine2: person.address_line2 || null,
      city: person.city || null,
      state: person.state || null,
      postalCode: person.postal_code || null,
      country: person.country || null,
      photo: person.photo_url || null,
      aadharUrl: person.aadhar_url || null,
      branch: branch.name || null,
      branchCode: branch.code || null,
      className,
      sectionName
    };
  }
}

module.exports = new StudentService();
