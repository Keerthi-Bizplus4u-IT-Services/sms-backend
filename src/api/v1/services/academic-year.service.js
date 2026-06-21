const academicYearRepository = require('../repositories/academic-year.repository');
const { AppError } = require('../../../middleware/error.middleware');
const { sequelize, AcademicYear, Class, Section, Student, StudentMark, ExamSchedule } = require('../../../models');
const { Op } = require('sequelize');

class AcademicYearService {
  resolveSchoolId(context = {}, payload = {}, errorMessage = 'School context is required') {
    if (context?.schoolId) {
      return context.schoolId;
    }

    const candidate = payload?.school_id ?? payload?.schoolId;

    const parsedCandidate = candidate ? parseInt(candidate, 10) : null;
    if (parsedCandidate) {
      return parsedCandidate;
    }

    const envValue = process.env.DEFAULT_SCHOOL_ID ?? '1';
    const envDefault = parseInt(envValue, 10);

    if (!Number.isNaN(envDefault) && envDefault > 0) {
      return envDefault;
    }

    throw new AppError(errorMessage, 400);
  }

  validateDates(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new AppError('Start date and end date are required', 400);
    }

    if (new Date(endDate) <= new Date(startDate)) {
      throw new AppError('End date must be after start date', 400);
    }
  }

  async getAcademicYears(filters = {}, context = {}) {
    const schoolId = this.resolveSchoolId(context, filters, 'School context is required to fetch academic years');

    return academicYearRepository.findAll({
      ...filters,
      schoolId
    });
  }

  async getAcademicYearById(id, context = {}) {
    const schoolId = this.resolveSchoolId(context, {}, 'School context is required to fetch academic years');
    return academicYearRepository.findById(id, { schoolId });
  }

  async getCurrentAcademicYear(context = {}) {
    const schoolId = this.resolveSchoolId(context, {}, 'School context is required to fetch academic years');
    const academicYear = await academicYearRepository.findCurrent({ schoolId });

    if (!academicYear) {
      throw new AppError('Current academic year is not configured', 404);
    }

    return academicYear;
  }

  async createAcademicYear(payload, context = {}) {
    this.validateDates(payload.start_date, payload.end_date);

    const schoolId = this.resolveSchoolId(context, payload, 'School context is required to create academic years');

    return academicYearRepository.create({
      name: payload.name.trim(),
      start_date: payload.start_date,
      end_date: payload.end_date,
      is_current: Boolean(payload.is_current),
      school_id: schoolId
    });
  }

  async updateAcademicYear(id, payload, context = {}) {
    const schoolId = this.resolveSchoolId(context, payload, 'School context is required to update academic years');

    const existing = await academicYearRepository.findById(id, { schoolId });

    const startDate = payload.start_date || existing.start_date;
    const endDate = payload.end_date || existing.end_date;

    this.validateDates(startDate, endDate);

    const updates = { ...payload };

    if (updates.name) {
      updates.name = updates.name.trim();
    }

    const updatedYear = await academicYearRepository.update(id, updates, { schoolId });

    if (payload?.is_current) {
      return academicYearRepository.setCurrent(id, { schoolId });
    }

    return updatedYear;
  }

  async setCurrentAcademicYear(id, context = {}) {
    const schoolId = this.resolveSchoolId(context, {}, 'School context is required to update academic years');
    return academicYearRepository.setCurrent(id, { schoolId });
  }

  async createMigrationDraft(payload, context = {}) {
    const schoolId = this.resolveSchoolId(context, payload, 'School context is required to create migration draft');
    const fromAcademicYearId = parseInt(payload.fromAcademicYearId, 10);

    if (!fromAcademicYearId) {
      throw new AppError('fromAcademicYearId is required', 400);
    }

    const sourceYear = await academicYearRepository.findById(fromAcademicYearId, { schoolId });
    if (!sourceYear) {
      throw new AppError('Source academic year not found', 404);
    }

    let targetYear = null;

    if (payload.toAcademicYearId) {
      targetYear = await academicYearRepository.findById(payload.toAcademicYearId, { schoolId });
    } else {
      if (!payload.targetYear?.name || !payload.targetYear?.start_date || !payload.targetYear?.end_date) {
        throw new AppError('targetYear with name, start_date and end_date is required', 400);
      }

      const existingYear = await academicYearRepository.findByName(payload.targetYear.name, { schoolId });
      if (existingYear) {
        targetYear = existingYear;
      } else {
        targetYear = await academicYearRepository.create({
          school_id: schoolId,
          name: payload.targetYear.name.trim(),
          start_date: payload.targetYear.start_date,
          end_date: payload.targetYear.end_date,
          is_current: false
        });
      }
    }

    const classMap = await this.ensureTargetYearClassStructure(sourceYear.id, targetYear.id, schoolId, payload.newClasses || []);
    const promotionPreview = await this.buildPromotionPreview(sourceYear.id, targetYear.id, schoolId, classMap);

    return {
      sourceAcademicYear: sourceYear,
      targetAcademicYear: targetYear,
      classMappings: classMap,
      promotionPreview,
      status: 'draft'
    };
  }

  async finalizeMigration(payload, context = {}) {
    const schoolId = this.resolveSchoolId(context, payload, 'School context is required to finalize migration');
    const fromAcademicYearId = parseInt(payload.fromAcademicYearId, 10);
    const toAcademicYearId = parseInt(payload.toAcademicYearId, 10);

    if (!fromAcademicYearId || !toAcademicYearId) {
      throw new AppError('fromAcademicYearId and toAcademicYearId are required', 400);
    }

    if (fromAcademicYearId === toAcademicYearId) {
      throw new AppError('Source and destination academic years cannot be the same', 400);
    }

    const [sourceYear, targetYear] = await Promise.all([
      academicYearRepository.findById(fromAcademicYearId, { schoolId }),
      academicYearRepository.findById(toAcademicYearId, { schoolId })
    ]);

    if (!sourceYear || !targetYear) {
      throw new AppError('Academic year not found in this school', 404);
    }

    const classMap = await this.ensureTargetYearClassStructure(sourceYear.id, targetYear.id, schoolId, payload.newClasses || []);
    const preview = await this.buildPromotionPreview(sourceYear.id, targetYear.id, schoolId, classMap);

    const overrides = new Map();
    if (Array.isArray(payload.overrides)) {
      payload.overrides.forEach((item) => {
        const studentId = parseInt(item.studentId, 10);
        if (studentId) {
          overrides.set(studentId, {
            decision: item.decision,
            targetClassId: item.targetClassId ? parseInt(item.targetClassId, 10) : null
          });
        }
      });
    }

    const targetSectionsCache = new Map();
    let promotedCount = 0;
    let detainedCount = 0;
    let reviewCount = 0;

    await sequelize.transaction(async (transaction) => {
      for (const candidate of preview.candidates) {
        const override = overrides.get(candidate.studentId);
        const decision = override?.decision || candidate.suggestedDecision;
        const targetClassId = override?.targetClassId || candidate.suggestedTargetClassId;

        if (!targetClassId || decision === 'review') {
          reviewCount += 1;
          continue;
        }

        let targetSections = targetSectionsCache.get(targetClassId);
        if (!targetSections) {
          targetSections = await Section.findAll({
            where: { class_id: targetClassId },
            order: [['name', 'ASC']],
            transaction
          });
          targetSectionsCache.set(targetClassId, targetSections);
        }

        if (!targetSections.length) {
          reviewCount += 1;
          continue;
        }

        const preferred = targetSections.find((section) => section.name?.trim().toLowerCase() === candidate.currentSectionName?.trim().toLowerCase());
        const chosenSection = preferred || targetSections[0];

        await Student.update(
          {
            class_id: targetClassId,
            section_id: chosenSection.id
          },
          {
            where: { id: candidate.studentId, school_id: schoolId },
            transaction
          }
        );

        if (decision === 'promote') {
          promotedCount += 1;
        } else {
          detainedCount += 1;
        }
      }

      try {
        await sequelize.query(
          'INSERT INTO promotion (cursession, prosession, profromclass, protoclass) VALUES (?, ?, ?, ?)',
          {
            replacements: [sourceYear.name, targetYear.name, 'Auto migration', 'Auto migration'],
            transaction
          }
        );
      } catch (_error) {
        // Non-blocking audit insert to keep migration resilient across environments.
      }
    });

    return {
      sourceAcademicYear: { id: sourceYear.id, name: sourceYear.name },
      targetAcademicYear: { id: targetYear.id, name: targetYear.name },
      promotedCount,
      detainedCount,
      reviewCount,
      status: 'finalized'
    };
  }

  async ensureTargetYearClassStructure(sourceAcademicYearId, targetAcademicYearId, schoolId, newClasses = []) {
    const sourceClasses = await Class.findAll({
      where: { academic_year_id: sourceAcademicYearId },
      include: [{
        model: AcademicYear,
        as: 'academicYear',
        where: { school_id: schoolId },
        attributes: ['id']
      }],
      order: [['numeric_grade', 'ASC'], ['id', 'ASC']]
    });

    const mapping = [];
    const classIdBySourceId = new Map();

    for (const sourceClass of sourceClasses) {
      let targetClass = await Class.findOne({
        where: {
          academic_year_id: targetAcademicYearId,
          branch_id: sourceClass.branch_id,
          name: sourceClass.name
        }
      });

      if (!targetClass) {
        targetClass = await Class.create({
          academic_year_id: targetAcademicYearId,
          branch_id: sourceClass.branch_id,
          name: sourceClass.name,
          numeric_grade: sourceClass.numeric_grade,
          display_order: sourceClass.display_order
        });
      }

      classIdBySourceId.set(sourceClass.id, targetClass.id);

      const sourceSections = await Section.findAll({
        where: { class_id: sourceClass.id },
        order: [['name', 'ASC']]
      });

      for (const sourceSection of sourceSections) {
        const existingSection = await Section.findOne({
          where: {
            class_id: targetClass.id,
            name: sourceSection.name
          }
        });

        if (!existingSection) {
          await Section.create({
            class_id: targetClass.id,
            name: sourceSection.name,
            max_students: sourceSection.max_students,
            room_number: sourceSection.room_number
          });
        }
      }

      mapping.push({
        sourceClassId: sourceClass.id,
        sourceClassName: sourceClass.name,
        sourceNumericGrade: sourceClass.numeric_grade,
        targetClassId: targetClass.id,
        targetClassName: targetClass.name,
        targetNumericGrade: targetClass.numeric_grade,
        branchId: sourceClass.branch_id
      });
    }

    for (const newClass of newClasses) {
      const target = await Class.create({
        academic_year_id: targetAcademicYearId,
        branch_id: parseInt(newClass.branch_id, 10),
        name: String(newClass.name || '').trim(),
        numeric_grade: newClass.numeric_grade ? parseInt(newClass.numeric_grade, 10) : null,
        display_order: newClass.display_order ? parseInt(newClass.display_order, 10) : null
      });

      const sections = Array.isArray(newClass.sections) ? newClass.sections : [];
      for (const section of sections) {
        await Section.create({
          class_id: target.id,
          name: String(section.name || '').trim(),
          max_students: section.max_students ? parseInt(section.max_students, 10) : 40,
          room_number: section.room_number ? String(section.room_number).trim() : null
        });
      }
    }

    return mapping;
  }

  async buildPromotionPreview(sourceAcademicYearId, targetAcademicYearId, schoolId, classMappings = []) {
    const sourceClasses = await Class.findAll({
      where: { academic_year_id: sourceAcademicYearId },
      include: [{
        model: AcademicYear,
        as: 'academicYear',
        where: { school_id: schoolId },
        attributes: ['id']
      }],
      order: [['numeric_grade', 'ASC'], ['id', 'ASC']]
    });

    const targetClasses = await Class.findAll({
      where: { academic_year_id: targetAcademicYearId },
      order: [['numeric_grade', 'ASC'], ['id', 'ASC']]
    });

    const targetByGrade = new Map();
    const targetByName = new Map();
    targetClasses.forEach((item) => {
      if (item.numeric_grade) {
        targetByGrade.set(item.numeric_grade, item);
      }
      targetByName.set(String(item.name || '').trim().toLowerCase(), item);
    });

    const students = await Student.findAll({
      where: {
        school_id: schoolId,
        class_id: {
          [Op.in]: sourceClasses.map((cls) => cls.id)
        },
        status: 'active'
      },
      include: [{
        model: Section,
        as: 'section',
        attributes: ['id', 'name']
      }],
      order: [['id', 'ASC']]
    });

    const studentIds = students.map((student) => student.id);
    const marksRows = studentIds.length
      ? await StudentMark.findAll({
          where: {
            student_id: {
              [Op.in]: studentIds
            },
            is_absent: false,
            marks_obtained: {
              [Op.ne]: null
            }
          },
          include: [{
            model: ExamSchedule,
            as: 'schedule',
            attributes: ['id', 'max_marks']
          }]
        })
      : [];

    const markStats = new Map();
    marksRows.forEach((row) => {
      const key = row.student_id;
      const obtained = parseFloat(row.marks_obtained || 0);
      const maxMarks = parseFloat(row.schedule?.max_marks || 0);
      if (!markStats.has(key)) {
        markStats.set(key, { obtained: 0, max: 0 });
      }
      const item = markStats.get(key);
      item.obtained += Number.isNaN(obtained) ? 0 : obtained;
      item.max += Number.isNaN(maxMarks) ? 0 : maxMarks;
    });

    const candidates = students.map((student) => {
      const currentClass = sourceClasses.find((cls) => cls.id === student.class_id);
      const stats = markStats.get(student.id);
      const percentage = stats && stats.max > 0 ? (stats.obtained / stats.max) * 100 : null;

      const pass = percentage !== null ? percentage >= 40 : null;

      const nextByGrade = currentClass?.numeric_grade ? targetByGrade.get(currentClass.numeric_grade + 1) : null;
      const sameByName = targetByName.get(String(currentClass?.name || '').trim().toLowerCase()) || null;
      const fallbackTarget = nextByGrade || sameByName || null;

      const suggestedDecision = pass === null ? 'review' : pass ? 'promote' : 'detain';
      const suggestedTarget = suggestedDecision === 'detain' ? sameByName || fallbackTarget : fallbackTarget;

      return {
        studentId: student.id,
        currentClassId: student.class_id,
        currentClassName: currentClass?.name || null,
        currentSectionName: student.section?.name || null,
        percentage,
        suggestedDecision,
        suggestedTargetClassId: suggestedTarget?.id || null,
        suggestedTargetClassName: suggestedTarget?.name || null
      };
    });

    const totals = {
      totalStudents: candidates.length,
      promote: candidates.filter((item) => item.suggestedDecision === 'promote').length,
      detain: candidates.filter((item) => item.suggestedDecision === 'detain').length,
      review: candidates.filter((item) => item.suggestedDecision === 'review').length
    };

    return {
      totals,
      candidates,
      classMappings
    };
  }
}

module.exports = new AcademicYearService();
