const { schoolRepository, schoolBranchRepository, schoolSettingsRepository } = require('../repositories/school.repository');
const { AppError } = require('../../../middleware/error.middleware');
const { QueryTypes, Op } = require('sequelize');
const {
  sequelize,
  SchoolBranch,
  AcademicYear,
  Class,
  Section,
  Student,
  Teacher,
  Parent,
  Person,
  User,
  Role,
  Subject,
  Exam,
  ExamSchedule,
  GradingScale,
  SessionHour,
  Holiday,
  TimetablePeriod,
  ClassTimetable,
  AttendanceSession,
  AttendanceRecord
} = require('../../../models');
const { resolveTableName, getTableColumns } = require('../repositories/helpers/schema.utils');

const VALID_SCHOOL_TYPES = ['primary', 'secondary', 'higher_secondary', 'k12', 'college', 'university'];
const VALID_BRANCH_TYPES = ['main', 'branch', 'campus', 'satellite', 'annexe'];
const DUMMY_PREFIX = 'DMY';
const DUMMY_RECORD_COUNT = 10;
const DUMMY_EMAIL_DOMAIN = 'dummy.local';

const wrapIdentifier = (value) => `"${String(value).replace(/"/g, '')}"`;

const normalizeBoolean = value => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }
  return false;
};

const sanitizeText = value => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

class SchoolService {
  async getRoleByName(name, transaction) {
    return Role.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('name')),
        String(name || '').toLowerCase()
      ),
      transaction
    });
  }

  async findOrCreateDummyUser({ schoolId, email, roleId, passwordHash = 'Dummy@123' }, transaction) {
    let user = await User.findOne({
      where: { email },
      paranoid: false,
      transaction
    });

    if (user && user.deleted_at) {
      await user.restore({ transaction });
      await user.update({ school_id: schoolId, role_id: roleId, is_active: true }, { transaction });
      return user;
    }

    if (user) {
      if (user.school_id !== schoolId || user.role_id !== roleId || !user.is_active) {
        await user.update({ school_id: schoolId, role_id: roleId, is_active: true }, { transaction });
      }
      return user;
    }

    return User.create(
      {
        school_id: schoolId,
        email,
        password_hash: passwordHash,
        role_id: roleId,
        is_active: true
      },
      { transaction }
    );
  }

  async upsertPersonForUser(userId, payload, transaction) {
    const existing = await Person.findOne({
      where: { user_id: userId },
      paranoid: false,
      transaction
    });

    if (existing && existing.deleted_at) {
      await existing.restore({ transaction });
    }

    if (existing) {
      await existing.update(payload, { transaction });
      return existing;
    }

    return Person.create({ ...payload, user_id: userId }, { transaction });
  }

  async ensureStudentParentLink({ studentId, parentId, columns, tableName, studentCol, parentCol }, transaction) {
    const existing = await sequelize.query(
      `SELECT 1 FROM ${wrapIdentifier(tableName)} WHERE ${wrapIdentifier(studentCol)} = :studentId AND ${wrapIdentifier(parentCol)} = :parentId LIMIT 1`,
      {
        replacements: { studentId, parentId },
        type: QueryTypes.SELECT,
        transaction
      }
    );

    if (existing.length > 0) {
      return false;
    }

    const insertColumns = [studentCol, parentCol];
    const insertValues = [':studentId', ':parentId'];
    const replacements = { studentId, parentId };

    if (columns.has('relationship_type')) {
      insertColumns.push('relationship_type');
      insertValues.push(':relationshipType');
      replacements.relationshipType = 'father';
    }

    if (columns.has('is_primary_contact')) {
      insertColumns.push('is_primary_contact');
      insertValues.push('TRUE');
    }

    if (columns.has('is_emergency_contact')) {
      insertColumns.push('is_emergency_contact');
      insertValues.push('TRUE');
    }

    if (columns.has('created_at')) {
      insertColumns.push('created_at');
      insertValues.push('CURRENT_TIMESTAMP');
    }

    if (columns.has('updated_at')) {
      insertColumns.push('updated_at');
      insertValues.push('CURRENT_TIMESTAMP');
    }

    await sequelize.query(
      `INSERT INTO ${wrapIdentifier(tableName)} (${insertColumns.map((column) => wrapIdentifier(column)).join(', ')}) VALUES (${insertValues.join(', ')})`,
      {
        replacements,
        transaction
      }
    );

    return true;
  }

  resolveCloneScopes(cloneScopes = {}) {
    return {
      class_structure:
        cloneScopes?.class_structure === undefined ? true : normalizeBoolean(cloneScopes.class_structure),
      subjects: normalizeBoolean(cloneScopes?.subjects),
      exams: normalizeBoolean(cloneScopes?.exams),
      fees: normalizeBoolean(cloneScopes?.fees)
    };
  }

  async listSchools({ includeInactive = false } = {}) {
    return schoolRepository.findAll({ includeInactive });
  }

  async getSchoolById(id) {
    const school = await schoolRepository.findById(id);
    if (!school) {
      throw new AppError('School not found', 404);
    }
    return school;
  }

  async createSchool(payload = {}) {
    const code = sanitizeText(payload.code).toUpperCase();
    const name = sanitizeText(payload.name);
    const shortName = sanitizeText(payload.short_name);
    const schoolType = sanitizeText(payload.school_type).toLowerCase();
    const isActive = payload.is_active === undefined ? true : normalizeBoolean(payload.is_active);

    if (!code) {
      throw new AppError('School code is required', 400);
    }
    if (!name) {
      throw new AppError('School name is required', 400);
    }
    if (!VALID_SCHOOL_TYPES.includes(schoolType)) {
      throw new AppError('Invalid school type', 400);
    }

    const existing = await schoolRepository.findByCode(code);
    if (existing) {
      throw new AppError('School code already exists', 409);
    }

    const school = await schoolRepository.create({
      code,
      name,
      short_name: shortName || null,
      school_type: schoolType,
      is_active: isActive
    });

    return school;
  }

  async createSchoolOnboarding(payload = {}) {
    const mode = sanitizeText(payload.mode).toLowerCase() || 'fresh';
    const schoolPayload = payload.school || payload;

    const school = await this.createSchool(schoolPayload);

    const branchInput = payload.branch || {
      code: `${school.code}-MAIN`,
      name: `${school.name} Main Branch`,
      branch_type: 'main',
      is_active: true
    };

    let branch = null;
    if (branchInput?.code && branchInput?.name) {
      branch = await schoolBranchRepository.create({
        school_id: school.id,
        code: sanitizeText(branchInput.code).toUpperCase(),
        name: sanitizeText(branchInput.name),
        branch_type: sanitizeText(branchInput.branch_type).toLowerCase() || 'main',
        is_active: branchInput.is_active === undefined ? true : normalizeBoolean(branchInput.is_active)
      });
    }

    if (mode === 'clone' || payload.clone_from_school_id) {
      if (!payload.clone_from_school_id) {
        throw new AppError('clone_from_school_id is required when mode is clone', 400);
      }

      const cloneSummary = await this.cloneSchoolSettings(
        school.id,
        payload.clone_from_school_id,
        payload.clone_scopes
      );
      return {
        school,
        branch,
        mode: 'clone',
        cloneSummary
      };
    }

    if (payload.academic_year?.name && payload.academic_year?.start_date && payload.academic_year?.end_date) {
      await AcademicYear.create({
        name: sanitizeText(payload.academic_year.name),
        start_date: payload.academic_year.start_date,
        end_date: payload.academic_year.end_date,
        is_current: normalizeBoolean(payload.academic_year.is_current),
        school_id: school.id
      });
    }

    return {
      school,
      branch,
      mode: 'fresh'
    };
  }

  async getOnboardingChecklist(schoolId) {
    const school = await schoolRepository.findById(schoolId);
    if (!school) {
      throw new AppError('School not found', 404);
    }

    const [branchCount, yearCount, classCount, sectionCount, studentCount, subjectCount, examCount, gradingScaleCount, sessionHourCount, holidayCount] = await Promise.all([
      SchoolBranch.count({ where: { school_id: schoolId } }),
      AcademicYear.count({ where: { school_id: schoolId } }),
      Class.count({
        include: [{
          model: AcademicYear,
          as: 'academicYear',
          where: { school_id: schoolId },
          attributes: []
        }]
      }),
      Section.count({
        include: [{
          model: Class,
          as: 'class',
          include: [{
            model: AcademicYear,
            as: 'academicYear',
            where: { school_id: schoolId },
            attributes: []
          }],
          attributes: []
        }]
      }),
      Student.count({ where: { school_id: schoolId } }),
      Subject.count({ where: { school_id: schoolId } }),
      Exam.count({
        include: [{
          model: AcademicYear,
          as: 'academicYear',
          where: { school_id: schoolId },
          attributes: []
        }]
      }),
      GradingScale.count({
        include: [{
          model: AcademicYear,
          as: 'academicYear',
          where: { school_id: schoolId },
          attributes: []
        }]
      }),
      SessionHour.count({ where: { school_id: schoolId } }),
      Holiday.count({ where: { school_id: schoolId } })
    ]);

    const hasSchoolProfile = !!(school.name && (school.address_line1 || school.city));

    const steps = [
      { key: 'school_profile', title: 'Configure School Name & Location', completed: hasSchoolProfile, is_mandatory: true, route: '/school-settings', icon: 'flaticon-healthcare', category: 'core', details: hasSchoolProfile ? `${school.name} — ${school.city || school.address_line1 || 'Location set'}` : 'Set school name, address, and contact info' },
      { key: 'branches', title: 'Create School Branches', completed: branchCount > 0, is_mandatory: true, route: '/add-school-branch', icon: 'flaticon-buildings', category: 'core', details: branchCount > 0 ? `${branchCount} branch(es) configured` : 'Add at least one branch' },
      { key: 'academic_years', title: 'Configure Academic Years', completed: yearCount > 0, is_mandatory: true, route: '/settings/year-migration', icon: 'flaticon-calendar', category: 'core', details: yearCount > 0 ? `${yearCount} academic year(s)` : 'Set up your academic year' },
      { key: 'classes_sections', title: 'Configure Classes & Sections', completed: classCount > 0 && sectionCount > 0, is_mandatory: true, route: '/class-section', icon: 'flaticon-classmates', category: 'academic', details: classCount > 0 || sectionCount > 0 ? `${classCount} classes, ${sectionCount} sections` : 'Create classes and sections' },
      { key: 'subjects', title: 'Configure Subjects', completed: subjectCount > 0, is_mandatory: true, route: '/all-subjects', icon: 'flaticon-open-book', category: 'academic', details: subjectCount > 0 ? `${subjectCount} subject(s)` : 'Add subjects for your curriculum' },
      { key: 'exams', title: 'Configure Exams', completed: examCount > 0 || gradingScaleCount > 0, is_mandatory: false, route: '/exam-schedule', icon: 'flaticon-script', category: 'academic', details: examCount > 0 ? `${examCount} exam(s) configured` : 'Set up exam structures and grading' },
      { key: 'fees', title: 'Configure Fee Structures', completed: false, is_mandatory: false, route: '/all-fees', icon: 'flaticon-money', category: 'operational', details: 'Set up fee structures and payment plans' },
      { key: 'library', title: 'Configure Library', completed: false, is_mandatory: false, route: '/all-books', icon: 'flaticon-book', category: 'operational', details: 'Add books to library catalog' },
      { key: 'timetable', title: 'Configure Timetable', completed: false, is_mandatory: false, route: '/all-class', icon: 'flaticon-clock', category: 'operational', details: 'Set up class timetables and routines' },
      { key: 'session_hours', title: 'Configure Session Hours', completed: sessionHourCount > 0, is_mandatory: false, route: '/session-hours', icon: 'flaticon-time', category: 'operational', details: sessionHourCount > 0 ? `${sessionHourCount} session(s) configured` : 'Define school session timings' },
      { key: 'holidays', title: 'Configure Holidays', completed: holidayCount > 0, is_mandatory: false, route: '/holidays', icon: 'flaticon-sun', category: 'operational', details: holidayCount > 0 ? `${holidayCount} holiday(s)` : 'Set up holiday calendar' },
      { key: 'students', title: 'Enroll Students', completed: studentCount > 0, is_mandatory: false, route: '/all-student', icon: 'flaticon-couple', category: 'operational', details: studentCount > 0 ? `${studentCount} student(s) enrolled` : 'Start enrolling students' }
    ];

    const mandatorySteps = steps.filter(s => s.is_mandatory);
    const optionalSteps = steps.filter(s => !s.is_mandatory);
    const mandatoryCompleted = mandatorySteps.filter(s => s.completed).length;
    const optionalCompleted = optionalSteps.filter(s => s.completed).length;
    const totalCompleted = steps.filter(s => s.completed).length;

    return {
      school,
      is_setup_complete: mandatoryCompleted === mandatorySteps.length,
      mandatory_pending: mandatorySteps.length - mandatoryCompleted,
      optional_pending: optionalSteps.length - optionalCompleted,
      total_progress: Math.round((totalCompleted / steps.length) * 100),
      summary: {
        branches: branchCount,
        academicYears: yearCount,
        classes: classCount,
        sections: sectionCount,
        students: studentCount,
        subjects: subjectCount,
        exams: examCount,
        sessionHours: sessionHourCount,
        holidays: holidayCount
      },
      steps
    };
  }

  async cloneSchoolSettings(targetSchoolId, sourceSchoolId, cloneScopes = {}) {
    const [targetSchool, sourceSchool] = await Promise.all([
      schoolRepository.findById(targetSchoolId),
      schoolRepository.findById(sourceSchoolId)
    ]);

    if (!targetSchool) {
      throw new AppError('Target school not found', 404);
    }

    if (!sourceSchool) {
      throw new AppError('Source school not found', 404);
    }

    if (targetSchool.id === sourceSchool.id) {
      throw new AppError('Source and target schools cannot be the same', 400);
    }

    const scopes = this.resolveCloneScopes(cloneScopes);

    return sequelize.transaction(async (transaction) => {
      const branchMap = new Map();
      const yearMap = new Map();
      const classMap = new Map();

      const sourceBranches = await SchoolBranch.findAll({
        where: { school_id: sourceSchool.id },
        order: [['id', 'ASC']],
        transaction
      });

      for (const sourceBranch of sourceBranches) {
        const targetCode = sourceBranch.code;
        let targetBranch = await SchoolBranch.findOne({
          where: {
            school_id: targetSchool.id,
            code: targetCode
          },
          transaction
        });

        if (!targetBranch) {
          targetBranch = await SchoolBranch.create(
            {
              school_id: targetSchool.id,
              code: targetCode,
              name: sourceBranch.name,
              branch_type: sourceBranch.branch_type,
              is_active: sourceBranch.is_active
            },
            { transaction }
          );
        }

        branchMap.set(sourceBranch.id, targetBranch.id);
      }

      const sourceYears = await AcademicYear.findAll({
        where: { school_id: sourceSchool.id },
        order: [['start_date', 'ASC'], ['id', 'ASC']],
        transaction
      });

      for (const sourceYear of sourceYears) {
        let targetYear = await AcademicYear.findOne({
          where: {
            school_id: targetSchool.id,
            name: sourceYear.name
          },
          transaction
        });

        if (!targetYear) {
          targetYear = await AcademicYear.create(
            {
              school_id: targetSchool.id,
              name: sourceYear.name,
              start_date: sourceYear.start_date,
              end_date: sourceYear.end_date,
              is_current: false
            },
            { transaction }
          );
        }

        yearMap.set(sourceYear.id, targetYear.id);
      }

      let clonedClasses = 0;
      let clonedSections = 0;
      if (scopes.class_structure) {
        const sourceClasses = await Class.findAll({
          include: [{
            model: AcademicYear,
            as: 'academicYear',
            where: { school_id: sourceSchool.id },
            attributes: ['id']
          }],
          order: [['id', 'ASC']],
          transaction
        });

        for (const sourceClass of sourceClasses) {
          const targetAcademicYearId = yearMap.get(sourceClass.academic_year_id);
          const targetBranchId = branchMap.get(sourceClass.branch_id);

          if (!targetAcademicYearId || !targetBranchId) {
            continue;
          }

          let targetClass = await Class.findOne({
            where: {
              academic_year_id: targetAcademicYearId,
              branch_id: targetBranchId,
              name: sourceClass.name
            },
            transaction
          });

          if (!targetClass) {
            targetClass = await Class.create(
              {
                academic_year_id: targetAcademicYearId,
                branch_id: targetBranchId,
                name: sourceClass.name,
                numeric_grade: sourceClass.numeric_grade,
                display_order: sourceClass.display_order
              },
              { transaction }
            );
            clonedClasses += 1;
          }

          classMap.set(sourceClass.id, targetClass.id);
        }

        const sourceSections = await Section.findAll({
          include: [{
            model: Class,
            as: 'class',
            include: [{
              model: AcademicYear,
              as: 'academicYear',
              where: { school_id: sourceSchool.id },
              attributes: ['id']
            }],
            attributes: ['id']
          }],
          order: [['id', 'ASC']],
          transaction
        });

        for (const sourceSection of sourceSections) {
          const targetClassId = classMap.get(sourceSection.class_id);
          if (!targetClassId) {
            continue;
          }

          const existingSection = await Section.findOne({
            where: {
              class_id: targetClassId,
              name: sourceSection.name
            },
            transaction
          });

          if (!existingSection) {
            await Section.create(
              {
                class_id: targetClassId,
                name: sourceSection.name,
                max_students: sourceSection.max_students,
                room_number: sourceSection.room_number
              },
              { transaction }
            );
            clonedSections += 1;
          }
        }
      }

      const subjectMap = new Map();
      let clonedSubjects = 0;
      if (scopes.subjects) {
        const sourceSubjects = await Subject.findAll({
          where: { school_id: sourceSchool.id },
          order: [['id', 'ASC']],
          transaction
        });

        for (const sourceSubject of sourceSubjects) {
          let targetSubject = await Subject.findOne({
            where: {
              school_id: targetSchool.id,
              name: sourceSubject.name
            },
            transaction
          });

          if (!targetSubject) {
            targetSubject = await Subject.create(
              {
                school_id: targetSchool.id,
                name: sourceSubject.name,
                code: null,
                description: sourceSubject.description,
                credit_hours: sourceSubject.credit_hours,
                is_mandatory: sourceSubject.is_mandatory,
                type: sourceSubject.type
              },
              { transaction }
            );
            clonedSubjects += 1;
          }

          subjectMap.set(sourceSubject.id, targetSubject.id);
        }
      }

      let clonedExams = 0;
      let clonedExamSchedules = 0;
      let clonedGradingScales = 0;
      if (scopes.exams) {
        const sourceExams = await Exam.findAll({
          include: [{
            model: AcademicYear,
            as: 'academicYear',
            where: { school_id: sourceSchool.id },
            attributes: ['id']
          }],
          order: [['id', 'ASC']],
          transaction
        });

        const examMap = new Map();

        for (const sourceExam of sourceExams) {
          const targetYearId = yearMap.get(sourceExam.academic_year_id);
          if (!targetYearId) {
            continue;
          }

          let targetExam = await Exam.findOne({
            where: {
              academic_year_id: targetYearId,
              name: sourceExam.name,
              exam_type: sourceExam.exam_type
            },
            transaction
          });

          if (!targetExam) {
            targetExam = await Exam.create(
              {
                academic_year_id: targetYearId,
                name: sourceExam.name,
                exam_type: sourceExam.exam_type,
                start_date: sourceExam.start_date,
                end_date: sourceExam.end_date,
                result_date: sourceExam.result_date
              },
              { transaction }
            );
            clonedExams += 1;
          }

          examMap.set(sourceExam.id, targetExam.id);
        }

        const sourceScales = await GradingScale.findAll({
          include: [{
            model: AcademicYear,
            as: 'academicYear',
            where: { school_id: sourceSchool.id },
            attributes: ['id']
          }],
          order: [['id', 'ASC']],
          transaction
        });

        for (const scale of sourceScales) {
          const targetYearId = yearMap.get(scale.academic_year_id);
          if (!targetYearId) {
            continue;
          }

          const existingScale = await GradingScale.findOne({
            where: {
              academic_year_id: targetYearId,
              grade_name: scale.grade_name,
              min_percentage: scale.min_percentage,
              max_percentage: scale.max_percentage
            },
            transaction
          });

          if (!existingScale) {
            await GradingScale.create(
              {
                academic_year_id: targetYearId,
                grade_name: scale.grade_name,
                min_percentage: scale.min_percentage,
                max_percentage: scale.max_percentage,
                grade_point: scale.grade_point,
                description: scale.description
              },
              { transaction }
            );
            clonedGradingScales += 1;
          }
        }

        const sourceSchedules = await ExamSchedule.findAll({
          include: [{
            model: Exam,
            as: 'exam',
            include: [{
              model: AcademicYear,
              as: 'academicYear',
              where: { school_id: sourceSchool.id },
              attributes: ['id']
            }],
            attributes: ['id']
          }],
          order: [['id', 'ASC']],
          transaction
        });

        for (const schedule of sourceSchedules) {
          const targetExamId = examMap.get(schedule.exam_id);
          const targetClassId = classMap.get(schedule.class_id);
          const targetSubjectId = subjectMap.get(schedule.subject_id);

          if (!targetExamId || !targetClassId || !targetSubjectId) {
            continue;
          }

          const existingSchedule = await ExamSchedule.findOne({
            where: {
              exam_id: targetExamId,
              class_id: targetClassId,
              subject_id: targetSubjectId,
              exam_date: schedule.exam_date,
              start_time: schedule.start_time
            },
            transaction
          });

          if (!existingSchedule) {
            await ExamSchedule.create(
              {
                exam_id: targetExamId,
                class_id: targetClassId,
                subject_id: targetSubjectId,
                exam_date: schedule.exam_date,
                start_time: schedule.start_time,
                end_time: schedule.end_time,
                max_marks: schedule.max_marks,
                passing_marks: schedule.passing_marks,
                room_number: schedule.room_number
              },
              { transaction }
            );
            clonedExamSchedules += 1;
          }
        }
      }

      let clonedFeeStructures = 0;
      if (scopes.fees) {
        const feeRows = await sequelize.query(
          'SELECT * FROM fee_structures WHERE school_id = ?',
          {
            replacements: [sourceSchool.id],
            type: QueryTypes.SELECT,
            transaction
          }
        );

        const queryInterface = sequelize.getQueryInterface();
        for (const row of feeRows) {
          const sourceClassId = row.class_id;
          const targetClassId = classMap.get(sourceClassId);
          const targetYearId = yearMap.get(row.academic_year_id);

          if (!targetClassId || !targetYearId) {
            continue;
          }

          const existing = await sequelize.query(
            'SELECT id FROM fee_structures WHERE school_id = ? AND academic_year_id = ? AND class_id = ? AND fee_type = ? AND due_term = ? LIMIT 1',
            {
              replacements: [targetSchool.id, targetYearId, targetClassId, row.fee_type, row.due_term],
              type: QueryTypes.SELECT,
              transaction
            }
          );

          if (!existing.length) {
            const insertData = {
              school_id: targetSchool.id,
              academic_year_id: targetYearId,
              class_id: targetClassId,
              fee_type: row.fee_type,
              due_term: row.due_term,
              amount: row.amount,
              description: row.description || null,
              created_at: row.created_at || new Date(),
              updated_at: row.updated_at || new Date()
            };

            await queryInterface.bulkInsert('fee_structures', [insertData], { transaction });
            clonedFeeStructures += 1;
          }
        }
      }

      return {
        sourceSchoolId: sourceSchool.id,
        targetSchoolId: targetSchool.id,
        scopes,
        cloned: {
          branches: branchMap.size,
          academicYears: yearMap.size,
          classes: scopes.class_structure ? classMap.size : 0,
          sections: scopes.class_structure ? clonedSections : 0,
          subjects: scopes.subjects ? clonedSubjects : 0,
          exams: scopes.exams ? clonedExams : 0,
          examSchedules: scopes.exams ? clonedExamSchedules : 0,
          gradingScales: scopes.exams ? clonedGradingScales : 0,
          feeStructures: scopes.fees ? clonedFeeStructures : 0
        }
      };
    });
  }

  async updateSchool(id, payload = {}) {
    const school = await schoolRepository.findById(id);
    if (!school) {
      throw new AppError('School not found', 404);
    }

    const data = {};
    if (payload.name !== undefined) data.name = sanitizeText(payload.name);
    if (payload.short_name !== undefined) data.short_name = sanitizeText(payload.short_name) || null;
    if (payload.school_type !== undefined) {
      const schoolType = sanitizeText(payload.school_type).toLowerCase();
      if (!VALID_SCHOOL_TYPES.includes(schoolType)) {
        throw new AppError('Invalid school type', 400);
      }
      data.school_type = schoolType;
    }
    if (payload.is_active !== undefined) data.is_active = normalizeBoolean(payload.is_active);

    if (payload.code !== undefined) {
      const code = sanitizeText(payload.code).toUpperCase();
      if (code && code !== school.code) {
        const existing = await schoolRepository.findByCode(code);
        if (existing) {
          throw new AppError('School code already exists', 409);
        }
        data.code = code;
      }
    }

    return schoolRepository.update(id, data);
  }

  async getSchoolSettings(schoolId) {
    const school = await schoolRepository.findById(schoolId);
    if (!school) {
      throw new AppError('School not found', 404);
    }

    const settings = await schoolSettingsRepository.findOrCreateBySchoolId(school.id);

    return {
      school: {
        id: school.id,
        code: school.code,
        name: school.name,
        short_name: school.short_name,
        school_type: school.school_type,
        is_active: school.is_active
      },
      features: {
        transport: normalizeBoolean(settings.transport_enabled),
        stock: normalizeBoolean(settings.stock_enabled),
        hostel: normalizeBoolean(settings.hostel_enabled)
      },
      bunny_cdn: {
        api_password: settings.bunny_cdn_api_key || '',
        hostname: settings.bunny_cdn_storage_zone || '',
        pull_zone: settings.bunny_cdn_pull_zone || '',
        storage_zone_name: settings.bunny_cdn_storage_zone_name || ''
      },
      smtp: {
        host: settings.smtp_host || '',
        port: settings.smtp_port || null,
        user: settings.smtp_user || '',
        password: settings.smtp_password ? '********' : '',
        from_email: settings.smtp_from_email || '',
        from_name: settings.smtp_from_name || '',
        secure: normalizeBoolean(settings.smtp_secure)
      }
    };
  }

  async updateSchoolSettings(schoolId, payload = {}) {
    const school = await schoolRepository.findById(schoolId);
    if (!school) {
      throw new AppError('School not found', 404);
    }

    const schoolPayload = payload.school || {};
    const featuresPayload = payload.features || {};
    const bunnyCdnPayload = payload.bunny_cdn || {};
    const smtpPayload = payload.smtp || {};

    if (Object.keys(schoolPayload).length > 0) {
      await this.updateSchool(schoolId, schoolPayload);
    }

    const settingsUpdate = {};
    if (featuresPayload.transport !== undefined) {
      settingsUpdate.transport_enabled = normalizeBoolean(featuresPayload.transport);
    }
    if (featuresPayload.stock !== undefined) {
      settingsUpdate.stock_enabled = normalizeBoolean(featuresPayload.stock);
    }
    if (featuresPayload.hostel !== undefined) {
      settingsUpdate.hostel_enabled = normalizeBoolean(featuresPayload.hostel);
    }

    // Bunny CDN settings
    const bunnyApiPasswordRaw =
      bunnyCdnPayload.api_password !== undefined ? bunnyCdnPayload.api_password : bunnyCdnPayload.api_key;
    const bunnyHostnameRaw =
      bunnyCdnPayload.hostname !== undefined ? bunnyCdnPayload.hostname : bunnyCdnPayload.storage_zone;

    const hasBunnyPayload = Object.keys(bunnyCdnPayload).length > 0;
    const bunnyApiPassword = sanitizeText(bunnyApiPasswordRaw);
    const bunnyHostname = sanitizeText(bunnyHostnameRaw);
    const bunnyStorageZoneName = sanitizeText(bunnyCdnPayload.storage_zone_name);

    if (hasBunnyPayload && (!bunnyApiPassword || !bunnyHostname || !bunnyStorageZoneName)) {
      throw new AppError('Bunny CDN API password, hostname and storage zone name are required', 400);
    }

    if (bunnyApiPasswordRaw !== undefined) {
      settingsUpdate.bunny_cdn_api_key = bunnyApiPassword || null;
    }
    if (bunnyHostnameRaw !== undefined) {
      settingsUpdate.bunny_cdn_storage_zone = bunnyHostname || null;
    }
    if (bunnyCdnPayload.pull_zone !== undefined) {
      settingsUpdate.bunny_cdn_pull_zone = sanitizeText(bunnyCdnPayload.pull_zone) || null;
    }
    if (bunnyCdnPayload.storage_zone_name !== undefined) {
      settingsUpdate.bunny_cdn_storage_zone_name = bunnyStorageZoneName || null;
    }

    // SMTP settings
    if (smtpPayload.host !== undefined) {
      settingsUpdate.smtp_host = sanitizeText(smtpPayload.host) || null;
    }
    if (smtpPayload.port !== undefined) {
      settingsUpdate.smtp_port = smtpPayload.port ? parseInt(smtpPayload.port, 10) : null;
    }
    if (smtpPayload.user !== undefined) {
      settingsUpdate.smtp_user = sanitizeText(smtpPayload.user) || null;
    }
    if (smtpPayload.password !== undefined && smtpPayload.password !== '********') {
      settingsUpdate.smtp_password = smtpPayload.password || null;
    }
    if (smtpPayload.from_email !== undefined) {
      settingsUpdate.smtp_from_email = sanitizeText(smtpPayload.from_email) || null;
    }
    if (smtpPayload.from_name !== undefined) {
      settingsUpdate.smtp_from_name = sanitizeText(smtpPayload.from_name) || null;
    }
    if (smtpPayload.secure !== undefined) {
      settingsUpdate.smtp_secure = normalizeBoolean(smtpPayload.secure);
    }

    if (Object.keys(settingsUpdate).length > 0) {
      await schoolSettingsRepository.updateBySchoolId(schoolId, settingsUpdate);
    } else {
      await schoolSettingsRepository.findOrCreateBySchoolId(schoolId);
    }

    return this.getSchoolSettings(schoolId);
  }

  async importDummyData(schoolId) {
    const school = await schoolRepository.findById(schoolId);
    if (!school) {
      throw new AppError('School not found', 404);
    }

    return sequelize.transaction(async (transaction) => {
      const counts = {
        school_branches: 0,
        academic_years: 0,
        classes: 0,
        sections: 0,
        subjects: 0,
        exams: 0,
        exam_schedules: 0,
        grading_scales: 0,
        holidays: 0,
        session_hours: 0,
        teachers: 0,
        students: 0,
        parents: 0,
        parent_student_links: 0,
        class_teacher_assignments: 0,
        librarian_users: 0,
        employee_users: 0,
        transport_routes: 0,
        transport_stops: 0,
        transport_vehicles: 0,
        student_transport_assignments: 0,
        library_books: 0,
        library_book_copies: 0,
        library_transactions: 0,
        timetable_periods: 0,
        class_timetable_entries: 0,
        attendance_sessions: 0,
        attendance_records: 0
      };

      // Ensure a branch exists
      let branch = await SchoolBranch.findOne({
        where: { school_id: school.id },
        transaction
      });
      if (!branch) {
        branch = await SchoolBranch.create({
          school_id: school.id,
          code: `${school.code}-MAIN`,
          name: `${school.name} Main Branch`,
          branch_type: 'main',
          is_active: true
        }, { transaction });
      }
      counts.school_branches = 1;

      // Create 10 deterministic academic years for predictable cleanup.
      const currentYear = new Date().getFullYear();
      const academicYears = [];
      for (let i = 0; i < DUMMY_RECORD_COUNT; i++) {
        const startYear = currentYear + i;
        const [academicYear] = await AcademicYear.findOrCreate({
          where: {
            school_id: school.id,
            name: `${DUMMY_PREFIX}-${String(i + 1).padStart(2, '0')}`
          },
          defaults: {
            school_id: school.id,
            name: `${DUMMY_PREFIX}-${String(i + 1).padStart(2, '0')}`,
            start_date: `${startYear}-04-01`,
            end_date: `${startYear + 1}-03-31`,
            is_current: i === 0
          },
          transaction
        });
        academicYears.push(academicYear);
      }
      counts.academic_years = academicYears.length;
      const primaryAcademicYear = academicYears[0];

      // Create classes
      const createdClasses = [];
      for (let i = 0; i < DUMMY_RECORD_COUNT; i++) {
        const className = `${DUMMY_PREFIX} Grade ${i + 1}`;
        const [cls] = await Class.findOrCreate({
          where: {
            academic_year_id: primaryAcademicYear.id,
            branch_id: branch.id,
            name: className
          },
          defaults: {
            academic_year_id: primaryAcademicYear.id,
            branch_id: branch.id,
            name: className,
            numeric_grade: i + 1,
            display_order: i + 1
          },
          transaction
        });
        createdClasses.push(cls);
      }
      counts.classes = createdClasses.length;

      // Create one deterministic dummy section per class.
      for (let i = 0; i < createdClasses.length; i++) {
        const cls = createdClasses[i];
        await Section.findOrCreate({
          where: { class_id: cls.id, name: `${DUMMY_PREFIX}-${String(i + 1).padStart(2, '0')}` },
          defaults: {
            class_id: cls.id,
            name: `${DUMMY_PREFIX}-${String(i + 1).padStart(2, '0')}`,
            max_students: 40
          },
          transaction
        });
      }
      counts.sections = createdClasses.length;

      // Create subjects
      const subjectNames = Array.from({ length: DUMMY_RECORD_COUNT }, (_, idx) => `${DUMMY_PREFIX} Subject ${idx + 1}`);
      const createdSubjects = [];
      for (const subName of subjectNames) {
        const [subject] = await Subject.findOrCreate({
          where: { school_id: school.id, name: subName },
          defaults: {
            school_id: school.id,
            name: subName,
            is_mandatory: true
          },
          transaction
        });
        createdSubjects.push(subject);
      }
      counts.subjects = createdSubjects.length;

      // Create exams
      const examTypes = ['unit_test', 'mid_term', 'final', 'practical', 'project', 'other'];
      const createdExams = [];
      for (let i = 0; i < DUMMY_RECORD_COUNT; i++) {
        const examDef = {
          name: `${DUMMY_PREFIX} Exam ${i + 1}`,
          exam_type: examTypes[i % examTypes.length]
        };
        const [exam] = await Exam.findOrCreate({
          where: {
            academic_year_id: primaryAcademicYear.id,
            name: examDef.name,
            exam_type: examDef.exam_type
          },
          defaults: {
            academic_year_id: primaryAcademicYear.id,
            name: examDef.name,
            exam_type: examDef.exam_type,
            start_date: `${currentYear}-06-01`,
            end_date: `${currentYear}-06-15`
          },
          transaction
        });
        createdExams.push(exam);
      }
      counts.exams = createdExams.length;

      // Create exam schedules
      for (let i = 0; i < DUMMY_RECORD_COUNT; i++) {
        await ExamSchedule.findOrCreate({
          where: {
            exam_id: createdExams[i].id,
            class_id: createdClasses[i].id,
            subject_id: createdSubjects[i].id
          },
          defaults: {
            exam_id: createdExams[i].id,
            class_id: createdClasses[i].id,
            subject_id: createdSubjects[i].id,
            exam_date: `${currentYear}-07-${String(i + 1).padStart(2, '0')}`,
            start_time: '09:00:00',
            end_time: '11:00:00',
            max_marks: 100,
            passing_marks: 35,
            room_number: `R-${i + 1}`
          },
          transaction
        });
      }
      counts.exam_schedules = DUMMY_RECORD_COUNT;

      // Create grading scales
      for (let i = 0; i < DUMMY_RECORD_COUNT; i++) {
        const minPercentage = i * 10;
        const gDef = {
          grade_name: `${DUMMY_PREFIX}${i + 1}`,
          min_percentage: minPercentage,
          max_percentage: i === DUMMY_RECORD_COUNT - 1 ? 100 : minPercentage + 9.99,
          grade_point: DUMMY_RECORD_COUNT - i
        };
        await GradingScale.findOrCreate({
          where: {
            academic_year_id: primaryAcademicYear.id,
            grade_name: gDef.grade_name
          },
          defaults: {
            academic_year_id: primaryAcademicYear.id,
            ...gDef,
            description: `Grade ${gDef.grade_name}`
          },
          transaction
        });
      }
      counts.grading_scales = DUMMY_RECORD_COUNT;

      // Create session hours
      for (let i = 0; i < DUMMY_RECORD_COUNT; i++) {
        await SessionHour.findOrCreate({
          where: {
            school_id: school.id,
            scope: 'SCHOOL',
            period_label: `${DUMMY_PREFIX} Period ${i + 1}`
          },
          defaults: {
            school_id: school.id,
            scope: 'SCHOOL',
            period_label: `${DUMMY_PREFIX} Period ${i + 1}`,
            start_time: `${String(8 + i).padStart(2, '0')}:00:00`,
            end_time: `${String(8 + i).padStart(2, '0')}:45:00`
          },
          transaction
        });
      }
      counts.session_hours = DUMMY_RECORD_COUNT;

      // Create holidays
      for (let i = 0; i < DUMMY_RECORD_COUNT; i++) {
        await Holiday.findOrCreate({
          where: {
            school_id: school.id,
            name: `${DUMMY_PREFIX} Holiday ${i + 1}`
          },
          defaults: {
            school_id: school.id,
            name: `${DUMMY_PREFIX} Holiday ${i + 1}`,
            start_date: `${currentYear}-12-${String(i + 1).padStart(2, '0')}`,
            end_date: `${currentYear}-12-${String(i + 1).padStart(2, '0')}`
          },
          transaction
        });
      }
      counts.holidays = DUMMY_RECORD_COUNT;

      const scopedPrefix = `${DUMMY_PREFIX}-${school.id}`;
      const scopedEmailPrefix = scopedPrefix.toLowerCase();

      const [teacherRole, studentRole, parentRole, libraryRole, accountsRole] = await Promise.all([
        this.getRoleByName('teacher', transaction),
        this.getRoleByName('student', transaction),
        this.getRoleByName('parent', transaction),
        this.getRoleByName('library', transaction),
        this.getRoleByName('accounts', transaction)
      ]);

      if (!teacherRole || !studentRole || !parentRole) {
        throw new AppError('Required roles (teacher, student, parent) are missing', 500);
      }

      const teachers = [];
      const teacherUserIds = [];
      for (let i = 0; i < DUMMY_RECORD_COUNT; i++) {
        const index = String(i + 1).padStart(3, '0');
        const user = await this.findOrCreateDummyUser(
          {
            schoolId: school.id,
            email: `${scopedEmailPrefix}-teacher-${index}@${DUMMY_EMAIL_DOMAIN}`,
            roleId: teacherRole.id
          },
          transaction
        );

        const person = await this.upsertPersonForUser(
          user.id,
          {
            first_name: `${DUMMY_PREFIX}Teacher${i + 1}`,
            last_name: `School${school.id}`,
            gender: i % 2 === 0 ? 'male' : 'female',
            date_of_birth: `198${i % 10}-01-15`,
            phone: `91${String(school.id).padStart(3, '0')}8${String(i + 1).padStart(6, '0')}`,
            city: 'Dummy City',
            state: 'Dummy State',
            country: 'India'
          },
          transaction
        );

        const employeeId = `${scopedPrefix}-TCH-${index}`;
        let teacher = await Teacher.findOne({ where: { employee_id: employeeId }, paranoid: false, transaction });
        if (teacher && teacher.deleted_at) {
          await teacher.restore({ transaction });
        }

        if (!teacher) {
          teacher = await Teacher.create(
            {
              school_id: school.id,
              branch_id: branch.id,
              person_id: person.id,
              employee_id: employeeId,
              join_date: `${currentYear - 1}-06-01`,
              designation: `Dummy Teacher ${i + 1}`,
              status: 'active'
            },
            { transaction }
          );
        } else {
          await teacher.update(
            {
              school_id: school.id,
              branch_id: branch.id,
              person_id: person.id,
              join_date: `${currentYear - 1}-06-01`,
              status: 'active'
            },
            { transaction }
          );
        }

        teachers.push(teacher);
        teacherUserIds.push(user.id);
      }
      counts.teachers = teachers.length;

      const sections = await Section.findAll({
        where: {
          class_id: createdClasses.map((item) => item.id),
          name: { [Op.like]: `${DUMMY_PREFIX}-%` }
        },
        order: [['id', 'ASC']],
        transaction
      });

      for (let i = 0; i < sections.length; i++) {
        const teacher = teachers[i % teachers.length];
        await sections[i].update({ class_teacher_id: teacher.id }, { transaction });
      }
      counts.class_teacher_assignments = sections.length;

      const students = [];
      for (let i = 0; i < DUMMY_RECORD_COUNT; i++) {
        const index = String(i + 1).padStart(3, '0');
        const user = await this.findOrCreateDummyUser(
          {
            schoolId: school.id,
            email: `${scopedEmailPrefix}-student-${index}@${DUMMY_EMAIL_DOMAIN}`,
            roleId: studentRole.id
          },
          transaction
        );

        const person = await this.upsertPersonForUser(
          user.id,
          {
            first_name: `${DUMMY_PREFIX}Student${i + 1}`,
            last_name: `School${school.id}`,
            gender: i % 2 === 0 ? 'male' : 'female',
            date_of_birth: `201${i % 6}-06-10`,
            phone: `91${String(school.id).padStart(3, '0')}7${String(i + 1).padStart(6, '0')}`,
            father_name: `${DUMMY_PREFIX}Parent${i + 1}`,
            mother_name: `${DUMMY_PREFIX}Parent${DUMMY_RECORD_COUNT + i + 1}`,
            city: 'Dummy City',
            state: 'Dummy State',
            country: 'India'
          },
          transaction
        );

        const selectedClass = createdClasses[i % createdClasses.length];
        const selectedSection = sections.find((section) => section.class_id === selectedClass.id) || sections[0];
        const admissionNumber = `${scopedPrefix}-STU-${index}`;
        let student = await Student.findOne({ where: { admission_number: admissionNumber }, paranoid: false, transaction });
        if (student && student.deleted_at) {
          await student.restore({ transaction });
        }

        if (!student) {
          student = await Student.create(
            {
              person_id: person.id,
              school_id: school.id,
              branch_id: branch.id,
              admission_number: admissionNumber,
              roll_number: `R-${index}`,
              class_id: selectedClass.id,
              section_id: selectedSection.id,
              admission_date: `${currentYear - 1}-04-15`,
              status: 'active'
            },
            { transaction }
          );
        } else {
          await student.update(
            {
              person_id: person.id,
              school_id: school.id,
              branch_id: branch.id,
              class_id: selectedClass.id,
              section_id: selectedSection.id,
              status: 'active'
            },
            { transaction }
          );
        }

        students.push(student);
      }
      counts.students = students.length;

      const parents = [];
      for (let i = 0; i < DUMMY_RECORD_COUNT * 2; i++) {
        const index = String(i + 1).padStart(3, '0');
        const user = await this.findOrCreateDummyUser(
          {
            schoolId: school.id,
            email: `${scopedEmailPrefix}-parent-${index}@${DUMMY_EMAIL_DOMAIN}`,
            roleId: parentRole.id
          },
          transaction
        );

        const person = await this.upsertPersonForUser(
          user.id,
          {
            first_name: `${DUMMY_PREFIX}Parent${i + 1}`,
            last_name: `School${school.id}`,
            gender: i % 2 === 0 ? 'male' : 'female',
            date_of_birth: `197${i % 10}-02-20`,
            phone: `91${String(school.id).padStart(3, '0')}6${String(i + 1).padStart(6, '0')}`,
            city: 'Dummy City',
            state: 'Dummy State',
            country: 'India'
          },
          transaction
        );

        const panNumber = `${scopedPrefix}-PAR-${index}`;
        let parent = await Parent.findOne({ where: { pan_number: panNumber }, paranoid: false, transaction });
        if (parent && parent.deleted_at) {
          await parent.restore({ transaction });
        }

        if (!parent) {
          parent = await Parent.create(
            {
              person_id: person.id,
              occupation: 'Dummy Occupation',
              annual_income: 500000,
              pan_number: panNumber
            },
            { transaction }
          );
        } else {
          await parent.update(
            {
              person_id: person.id,
              occupation: 'Dummy Occupation',
              annual_income: 500000
            },
            { transaction }
          );
        }

        parents.push(parent);
      }
      counts.parents = parents.length;

      const relationTable = await resolveTableName(['student_parents']);
      if (relationTable) {
        const relationColumns = await getTableColumns(relationTable);
        const parentCol = relationColumns.has('parent_id') ? 'parent_id' : relationColumns.has('pid') ? 'pid' : null;
        const studentCol = relationColumns.has('student_id') ? 'student_id' : relationColumns.has('sid') ? 'sid' : null;

        if (parentCol && studentCol) {
          let linksCreated = 0;
          for (let i = 0; i < students.length; i++) {
            const father = parents[i];
            const mother = parents[i + DUMMY_RECORD_COUNT];
            // eslint-disable-next-line no-await-in-loop
            const fatherCreated = await this.ensureStudentParentLink(
              {
                tableName: relationTable,
                columns: relationColumns,
                parentCol,
                studentCol,
                studentId: students[i].id,
                parentId: father.id
              },
              transaction
            );
            // eslint-disable-next-line no-await-in-loop
            const motherCreated = await this.ensureStudentParentLink(
              {
                tableName: relationTable,
                columns: relationColumns,
                parentCol,
                studentCol,
                studentId: students[i].id,
                parentId: mother.id
              },
              transaction
            );

            linksCreated += fatherCreated ? 1 : 0;
            linksCreated += motherCreated ? 1 : 0;
          }

          counts.parent_student_links = linksCreated;
        }
      }

      let librarianUserId = null;
      if (libraryRole) {
        const librarian = await this.findOrCreateDummyUser(
          {
            schoolId: school.id,
            email: `${scopedEmailPrefix}-librarian@${DUMMY_EMAIL_DOMAIN}`,
            roleId: libraryRole.id
          },
          transaction
        );

        await this.upsertPersonForUser(
          librarian.id,
          {
            first_name: `${DUMMY_PREFIX}Librarian`,
            last_name: `School${school.id}`,
            gender: 'female',
            date_of_birth: '1985-01-01',
            phone: `91${String(school.id).padStart(3, '0')}5000001`,
            city: 'Dummy City',
            state: 'Dummy State',
            country: 'India'
          },
          transaction
        );

        librarianUserId = librarian.id;
        counts.librarian_users = 1;
      }

      if (accountsRole) {
        const employeeRoles = [
          { label: 'accounts', roleId: accountsRole.id },
          { label: 'employee', roleId: accountsRole.id }
        ];

        for (let i = 0; i < employeeRoles.length; i++) {
          const employee = await this.findOrCreateDummyUser(
            {
              schoolId: school.id,
              email: `${scopedEmailPrefix}-${employeeRoles[i].label}@${DUMMY_EMAIL_DOMAIN}`,
              roleId: employeeRoles[i].roleId
            },
            transaction
          );

          await this.upsertPersonForUser(
            employee.id,
            {
              first_name: `${DUMMY_PREFIX}${employeeRoles[i].label === 'accounts' ? 'Accounts' : 'Employee'}`,
              last_name: `School${school.id}`,
              gender: i % 2 === 0 ? 'male' : 'female',
              date_of_birth: `198${i + 2}-05-05`,
              phone: `91${String(school.id).padStart(3, '0')}500000${i + 2}`,
              city: 'Dummy City',
              state: 'Dummy State',
              country: 'India'
            },
            transaction
          );
        }

        counts.employee_users = employeeRoles.length;
      }

      const transportRoutesTable = await resolveTableName(['transport_routes']);
      const transportStopsTable = await resolveTableName(['transport_stops']);
      const transportVehiclesTable = await resolveTableName(['transport_vehicles']);
      const studentTransportTable = await resolveTableName(['student_transport']);
      const libraryBooksTable = await resolveTableName(['library_books']);
      const libraryBookCopiesTable = await resolveTableName(['library_book_copies']);
      const libraryTransactionsTable = await resolveTableName(['library_transactions']);

      if (transportRoutesTable && transportStopsTable && transportVehiclesTable && studentTransportTable) {
        const routeIds = [];
        for (let i = 0; i < 2; i++) {
          const routeCode = `${scopedPrefix}-R${String(i + 1).padStart(2, '0')}`;
          const existing = await sequelize.query(
            `SELECT id FROM ${wrapIdentifier(transportRoutesTable)} WHERE school_id = :schoolId AND route_code = :routeCode AND deleted_at IS NULL LIMIT 1`,
            {
              replacements: { schoolId: school.id, routeCode },
              type: QueryTypes.SELECT,
              transaction
            }
          );

          let routeId = existing?.[0]?.id || null;
          if (!routeId) {
            const inserted = await sequelize.query(
              `INSERT INTO ${wrapIdentifier(transportRoutesTable)} (school_id, route_code, route_name, route_description, total_distance_km, estimated_duration_minutes, start_point, end_point, monthly_fee, is_active, created_at, updated_at)
               VALUES (:schoolId, :routeCode, :routeName, :routeDescription, :distance, :duration, :startPoint, :endPoint, :monthlyFee, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               RETURNING id`,
              {
                replacements: {
                  schoolId: school.id,
                  routeCode,
                  routeName: `${DUMMY_PREFIX} Route ${i + 1}`,
                  routeDescription: `Dummy transport route ${i + 1}`,
                  distance: 8 + i,
                  duration: 35 + i * 5,
                  startPoint: `${DUMMY_PREFIX} Hub ${i + 1}`,
                  endPoint: `${DUMMY_PREFIX} Campus ${i + 1}`,
                  monthlyFee: 1200 + i * 150
                },
                type: QueryTypes.INSERT,
                transaction
              }
            );
            routeId = inserted?.[0]?.[0]?.id || inserted?.[0]?.id || null;
          }

          if (routeId) {
            routeIds.push(routeId);
          }
        }
        counts.transport_routes = routeIds.length;

        const stopIds = [];
        for (let i = 0; i < routeIds.length; i++) {
          for (let j = 0; j < 2; j++) {
            const stopName = `${DUMMY_PREFIX} Stop ${i + 1}-${j + 1}`;
            const existingStop = await sequelize.query(
              `SELECT id FROM ${wrapIdentifier(transportStopsTable)} WHERE route_id = :routeId AND stop_name = :stopName LIMIT 1`,
              {
                replacements: { routeId: routeIds[i], stopName },
                type: QueryTypes.SELECT,
                transaction
              }
            );

            let stopId = existingStop?.[0]?.id || null;
            if (!stopId) {
              const insertedStop = await sequelize.query(
                `INSERT INTO ${wrapIdentifier(transportStopsTable)} (route_id, stop_name, stop_order, pickup_time, drop_time, distance_from_school_km, landmark, stop_fee, is_active, created_at, updated_at)
                 VALUES (:routeId, :stopName, :stopOrder, :pickupTime, :dropTime, :distance, :landmark, :stopFee, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 RETURNING id`,
                {
                  replacements: {
                    routeId: routeIds[i],
                    stopName,
                    stopOrder: j + 1,
                    pickupTime: j === 0 ? '07:30:00' : '07:45:00',
                    dropTime: j === 0 ? '15:30:00' : '15:45:00',
                    distance: 3 + j,
                    landmark: `${DUMMY_PREFIX} Landmark ${i + 1}-${j + 1}`,
                    stopFee: 800 + j * 100
                  },
                  type: QueryTypes.INSERT,
                  transaction
                }
              );
              stopId = insertedStop?.[0]?.[0]?.id || insertedStop?.[0]?.id || null;
            }

            if (stopId) {
              stopIds.push(stopId);
            }
          }
        }
        counts.transport_stops = stopIds.length;

        const vehicleIds = [];
        for (let i = 0; i < 2; i++) {
          const vehicleNumber = `${scopedPrefix}-BUS-${String(i + 1).padStart(2, '0')}`;
          const existingVehicle = await sequelize.query(
            `SELECT id FROM ${wrapIdentifier(transportVehiclesTable)} WHERE school_id = :schoolId AND vehicle_number = :vehicleNumber AND deleted_at IS NULL LIMIT 1`,
            {
              replacements: { schoolId: school.id, vehicleNumber },
              type: QueryTypes.SELECT,
              transaction
            }
          );

          let vehicleId = existingVehicle?.[0]?.id || null;
          if (!vehicleId) {
            const insertedVehicle = await sequelize.query(
              `INSERT INTO ${wrapIdentifier(transportVehiclesTable)} (school_id, vehicle_number, vehicle_name, vehicle_type, capacity, fuel_type, status, created_at, updated_at)
               VALUES (:schoolId, :vehicleNumber, :vehicleName, :vehicleType, :capacity, :fuelType, :status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               RETURNING id`,
              {
                replacements: {
                  schoolId: school.id,
                  vehicleNumber,
                  vehicleName: `${DUMMY_PREFIX} Bus ${i + 1}`,
                  vehicleType: 'bus',
                  capacity: 45,
                  fuelType: 'diesel',
                  status: 'active'
                },
                type: QueryTypes.INSERT,
                transaction
              }
            );
            vehicleId = insertedVehicle?.[0]?.[0]?.id || insertedVehicle?.[0]?.id || null;
          }

          if (vehicleId) {
            vehicleIds.push(vehicleId);
          }
        }
        counts.transport_vehicles = vehicleIds.length;

        let transportAssignments = 0;
        const targetStudents = students.slice(0, Math.min(students.length, stopIds.length));
        for (let i = 0; i < targetStudents.length; i++) {
          const existingAssignment = await sequelize.query(
            `SELECT id FROM ${wrapIdentifier(studentTransportTable)}
             WHERE school_id = :schoolId AND student_id = :studentId AND academic_year_id = :academicYearId AND status = 'active'
             LIMIT 1`,
            {
              replacements: { schoolId: school.id, studentId: targetStudents[i].id, academicYearId: primaryAcademicYear.id },
              type: QueryTypes.SELECT,
              transaction
            }
          );

          if (!existingAssignment.length) {
            await sequelize.query(
              `INSERT INTO ${wrapIdentifier(studentTransportTable)}
               (school_id, student_id, route_id, stop_id, vehicle_id, academic_year_id, transport_fee, due_term, start_date, shift, status, remarks, created_at, updated_at)
               VALUES (:schoolId, :studentId, :routeId, :stopId, :vehicleId, :academicYearId, :transportFee, :dueTerm, :startDate, :shift, :status, :remarks, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              {
                replacements: {
                  schoolId: school.id,
                  studentId: targetStudents[i].id,
                  routeId: routeIds[i % routeIds.length],
                  stopId: stopIds[i % stopIds.length],
                  vehicleId: vehicleIds[i % vehicleIds.length] || null,
                  academicYearId: primaryAcademicYear.id,
                  transportFee: 1200,
                  dueTerm: 'annual',
                  startDate: `${currentYear}-04-01`,
                  shift: 'both',
                  status: 'active',
                  remarks: `${DUMMY_PREFIX} transport assignment`
                },
                transaction
              }
            );
            transportAssignments += 1;
          }
        }
        counts.student_transport_assignments = transportAssignments;
      }

      if (libraryBooksTable) {
        const libraryBookColumns = await getTableColumns(libraryBooksTable);
        const libraryBookCopyColumns = libraryBookCopiesTable
          ? await getTableColumns(libraryBookCopiesTable)
          : new Set();
        const createdBookIds = [];
        for (let i = 0; i < 5; i++) {
          const isbn = `${scopedPrefix}-ISBN-${String(i + 1).padStart(3, '0')}`;
          const existingBookMatch = libraryBookColumns.has('isbn')
            ? 'isbn = :isbn'
            : 'title = :title';
          const existingBookDeletedClause = libraryBookColumns.has('deleted_at') ? ' AND deleted_at IS NULL' : '';
          const existingBook = await sequelize.query(
            `SELECT id FROM ${wrapIdentifier(libraryBooksTable)} WHERE school_id = :schoolId AND ${existingBookMatch}${existingBookDeletedClause} LIMIT 1`,
            {
              replacements: { schoolId: school.id, isbn, title: `${DUMMY_PREFIX} Book ${i + 1}` },
              type: QueryTypes.SELECT,
              transaction
            }
          );

          let bookId = existingBook?.[0]?.id || null;
          if (!bookId) {
            const insertColumns = ['school_id'];
            const insertValues = [':schoolId'];
            const replacements = { schoolId: school.id };

            const pushColumn = (columnName, key, value) => {
              if (!libraryBookColumns.has(columnName)) {
                return;
              }
              insertColumns.push(columnName);
              insertValues.push(`:${key}`);
              replacements[key] = value;
            };

            pushColumn('isbn', 'isbn', isbn);
            pushColumn('title', 'title', `${DUMMY_PREFIX} Book ${i + 1}`);
            pushColumn('authors', 'authors', `${DUMMY_PREFIX} Author ${i + 1}`);
            pushColumn('category', 'category', i % 2 === 0 ? 'Academic' : 'Reference');
            pushColumn('language', 'language', 'English');
            pushColumn('book_type', 'bookType', 'physical');
            pushColumn('total_copies', 'totalCopies', 2);
            pushColumn('available_copies', 'availableCopies', 2);
            pushColumn('shelf_location', 'shelfLocation', `S-${i + 1}`);
            pushColumn('condition_status', 'conditionStatus', 'new');
            pushColumn('acquired_date', 'acquiredDate', `${currentYear}-01-10`);

            if (libraryBookColumns.has('created_at')) {
              insertColumns.push('created_at');
              insertValues.push('CURRENT_TIMESTAMP');
            }

            if (libraryBookColumns.has('updated_at')) {
              insertColumns.push('updated_at');
              insertValues.push('CURRENT_TIMESTAMP');
            }

            const insertedBook = await sequelize.query(
              `INSERT INTO ${wrapIdentifier(libraryBooksTable)}
               (${insertColumns.map((column) => wrapIdentifier(column)).join(', ')})
               VALUES (${insertValues.join(', ')})
               RETURNING id`,
              {
                replacements,
                type: QueryTypes.INSERT,
                transaction
              }
            );
            bookId = insertedBook?.[0]?.[0]?.id || insertedBook?.[0]?.id || null;
          }

          if (bookId) {
            createdBookIds.push(bookId);
          }
        }
        counts.library_books = createdBookIds.length;

        if (libraryBookCopiesTable) {
          let copyCount = 0;
          for (let i = 0; i < createdBookIds.length; i++) {
            for (let copyNumber = 1; copyNumber <= 2; copyNumber++) {
              const accessionNumber = `${scopedPrefix}-ACC-${String(i + 1).padStart(2, '0')}-${copyNumber}`;
              const copyMatch = libraryBookCopyColumns.has('accession_number')
                ? 'accession_number = :accessionNumber'
                : 'barcode = :barcode';
              const existingCopy = await sequelize.query(
                `SELECT id FROM ${wrapIdentifier(libraryBookCopiesTable)} WHERE ${copyMatch} LIMIT 1`,
                {
                  replacements: {
                    accessionNumber,
                    barcode: `${scopedPrefix}-BC-${String(i + 1).padStart(2, '0')}-${copyNumber}`
                  },
                  type: QueryTypes.SELECT,
                  transaction
                }
              );

              if (!existingCopy.length) {
                const insertColumns = [];
                const insertValues = [];
                const replacements = {};

                const pushCopyColumn = (columnName, key, value) => {
                  if (!libraryBookCopyColumns.has(columnName)) {
                    return;
                  }
                  insertColumns.push(columnName);
                  insertValues.push(`:${key}`);
                  replacements[key] = value;
                };

                pushCopyColumn('school_id', 'schoolId', school.id);
                pushCopyColumn('book_id', 'bookId', createdBookIds[i]);
                pushCopyColumn('accession_number', 'accessionNumber', accessionNumber);
                pushCopyColumn('barcode', 'barcode', `${scopedPrefix}-BC-${String(i + 1).padStart(2, '0')}-${copyNumber}`);
                pushCopyColumn('copy_number', 'copyNumber', copyNumber);
                pushCopyColumn('condition_status', 'conditionStatus', 'new');
                pushCopyColumn('is_available', 'isAvailable', true);
                pushCopyColumn('shelf_location', 'shelfLocation', `S-${i + 1}`);

                if (libraryBookCopyColumns.has('created_at')) {
                  insertColumns.push('created_at');
                  insertValues.push('CURRENT_TIMESTAMP');
                }

                if (libraryBookCopyColumns.has('updated_at')) {
                  insertColumns.push('updated_at');
                  insertValues.push('CURRENT_TIMESTAMP');
                }

                await sequelize.query(
                  `INSERT INTO ${wrapIdentifier(libraryBookCopiesTable)}
                   (${insertColumns.map((column) => wrapIdentifier(column)).join(', ')})
                   VALUES (${insertValues.join(', ')})`,
                  {
                    replacements,
                    transaction
                  }
                );
                copyCount += 1;
              }
            }
          }
          counts.library_book_copies = copyCount;
        }

        if (libraryTransactionsTable && libraryBookCopiesTable && createdBookIds.length > 0) {
          const createdAtUserId = librarianUserId || teacherUserIds[0] || null;
          if (createdAtUserId) {
            const copyRows = await sequelize.query(
              `SELECT id, book_id FROM ${wrapIdentifier(libraryBookCopiesTable)} WHERE school_id = :schoolId AND accession_number LIKE :accPrefix ORDER BY id ASC`,
              {
                replacements: { schoolId: school.id, accPrefix: `${scopedPrefix}-ACC-%` },
                type: QueryTypes.SELECT,
                transaction
              }
            );

            let txnCount = 0;
            if (copyRows.length > 0 && students.length > 0) {
              const issueDate = `${currentYear}-04-10`;
              const dueDate = `${currentYear}-04-25`;

              const firstCopy = copyRows[0];
              const firstExists = await sequelize.query(
                `SELECT id FROM ${wrapIdentifier(libraryTransactionsTable)}
                 WHERE school_id = :schoolId AND copy_id = :copyId AND borrower_type = 'student' AND borrower_id = :borrowerId AND issue_date = :issueDate
                 LIMIT 1`,
                {
                  replacements: { schoolId: school.id, copyId: firstCopy.id, borrowerId: students[0].id, issueDate },
                  type: QueryTypes.SELECT,
                  transaction
                }
              );

              if (!firstExists.length) {
                await sequelize.query(
                  `INSERT INTO ${wrapIdentifier(libraryTransactionsTable)}
                   (school_id, book_id, copy_id, borrower_type, borrower_id, issue_date, due_date, status, issued_by, fine_amount, fine_paid, created_at, updated_at)
                   VALUES (:schoolId, :bookId, :copyId, 'student', :borrowerId, :issueDate, :dueDate, 'issued', :issuedBy, 0, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                  {
                    replacements: {
                      schoolId: school.id,
                      bookId: firstCopy.book_id,
                      copyId: firstCopy.id,
                      borrowerId: students[0].id,
                      issueDate,
                      dueDate,
                      issuedBy: createdAtUserId
                    },
                    transaction
                  }
                );

                await sequelize.query(
                  `UPDATE ${wrapIdentifier(libraryBookCopiesTable)}
                   SET is_available = FALSE, current_borrower_type = 'student', current_borrower_id = :borrowerId, updated_at = CURRENT_TIMESTAMP
                   WHERE id = :copyId`,
                  {
                    replacements: { borrowerId: students[0].id, copyId: firstCopy.id },
                    transaction
                  }
                );

                await sequelize.query(
                  `UPDATE ${wrapIdentifier(libraryBooksTable)}
                   SET available_copies = GREATEST(0, available_copies - 1), updated_at = CURRENT_TIMESTAMP
                   WHERE id = :bookId`,
                  {
                    replacements: { bookId: firstCopy.book_id },
                    transaction
                  }
                );

                txnCount += 1;
              }

              if (copyRows[1] && teachers.length > 0) {
                const secondCopy = copyRows[1];
                const secondIssueDate = `${currentYear}-04-01`;
                const secondDueDate = `${currentYear}-04-10`;
                const secondReturnDate = `${currentYear}-04-09`;
                const secondExists = await sequelize.query(
                  `SELECT id FROM ${wrapIdentifier(libraryTransactionsTable)}
                   WHERE school_id = :schoolId AND copy_id = :copyId AND borrower_type = 'teacher' AND borrower_id = :borrowerId AND issue_date = :issueDate
                   LIMIT 1`,
                  {
                    replacements: { schoolId: school.id, copyId: secondCopy.id, borrowerId: teachers[0].id, issueDate: secondIssueDate },
                    type: QueryTypes.SELECT,
                    transaction
                  }
                );

                if (!secondExists.length) {
                  await sequelize.query(
                    `INSERT INTO ${wrapIdentifier(libraryTransactionsTable)}
                     (school_id, book_id, copy_id, borrower_type, borrower_id, issue_date, due_date, return_date, status, issued_by, returned_to, fine_amount, fine_paid, created_at, updated_at)
                     VALUES (:schoolId, :bookId, :copyId, 'teacher', :borrowerId, :issueDate, :dueDate, :returnDate, 'returned', :issuedBy, :returnedTo, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    {
                      replacements: {
                        schoolId: school.id,
                        bookId: secondCopy.book_id,
                        copyId: secondCopy.id,
                        borrowerId: teachers[0].id,
                        issueDate: secondIssueDate,
                        dueDate: secondDueDate,
                        returnDate: secondReturnDate,
                        issuedBy: createdAtUserId,
                        returnedTo: createdAtUserId
                      },
                      transaction
                    }
                  );

                  txnCount += 1;
                }
              }
            }

            counts.library_transactions = txnCount;
          }
        }
      }

      const periodTemplate = [
        { number: 1, name: `${DUMMY_PREFIX} TT P1`, start: '09:00:00', end: '09:40:00', isBreak: false },
        { number: 2, name: `${DUMMY_PREFIX} TT P2`, start: '09:45:00', end: '10:25:00', isBreak: false },
        { number: 3, name: `${DUMMY_PREFIX} TT P3`, start: '10:30:00', end: '11:10:00', isBreak: false },
        { number: 4, name: `${DUMMY_PREFIX} TT Break`, start: '11:10:00', end: '11:30:00', isBreak: true },
        { number: 5, name: `${DUMMY_PREFIX} TT P4`, start: '11:30:00', end: '12:10:00', isBreak: false },
        { number: 6, name: `${DUMMY_PREFIX} TT P5`, start: '12:15:00', end: '12:55:00', isBreak: false }
      ];

      const createdPeriods = [];
      for (const periodDef of periodTemplate) {
        const [period] = await TimetablePeriod.findOrCreate({
          where: {
            academic_year_id: primaryAcademicYear.id,
            period_number: periodDef.number
          },
          defaults: {
            academic_year_id: primaryAcademicYear.id,
            period_number: periodDef.number,
            period_name: periodDef.name,
            start_time: periodDef.start,
            end_time: periodDef.end,
            duration_minutes: 40,
            is_break: periodDef.isBreak,
            display_order: periodDef.number,
            is_active: true
          },
          transaction
        });

        if (period.period_name !== periodDef.name) {
          await period.update({ period_name: periodDef.name, is_break: periodDef.isBreak }, { transaction });
        }

        createdPeriods.push(period);
      }
      counts.timetable_periods = createdPeriods.length;

      const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      let timetableEntries = 0;
      const timetableClasses = createdClasses.slice(0, 2);
      for (let classIndex = 0; classIndex < timetableClasses.length; classIndex++) {
        const classEntry = timetableClasses[classIndex];
        const sectionEntry = sections.find((item) => item.class_id === classEntry.id);
        if (!sectionEntry) {
          continue;
        }

        for (let dayIndex = 0; dayIndex < weekDays.length; dayIndex++) {
          for (let periodIndex = 0; periodIndex < createdPeriods.length; periodIndex++) {
            const period = createdPeriods[periodIndex];
            if (period.is_break) {
              continue;
            }

            const subject = createdSubjects[(classIndex + periodIndex) % createdSubjects.length];
            const teacher = teachers[(classIndex + dayIndex + periodIndex) % teachers.length];
            const [entry] = await ClassTimetable.findOrCreate({
              where: {
                academic_year_id: primaryAcademicYear.id,
                class_id: classEntry.id,
                section_id: sectionEntry.id,
                day_of_week: weekDays[dayIndex],
                period_id: period.id,
                is_active: true
              },
              defaults: {
                academic_year_id: primaryAcademicYear.id,
                class_id: classEntry.id,
                section_id: sectionEntry.id,
                day_of_week: weekDays[dayIndex],
                period_id: period.id,
                subject_id: subject.id,
                teacher_id: teacher.id,
                room_number: `D-${classIndex + 1}`,
                is_practical: false,
                is_active: true,
                effective_from: `${currentYear}-04-01`,
                effective_to: null
              },
              transaction
            });

            await entry.update({ subject_id: subject.id, teacher_id: teacher.id }, { transaction });
            timetableEntries += 1;
          }
        }
      }
      counts.class_timetable_entries = timetableEntries;

      const sessionHoursForAttendance = await SessionHour.findAll({
        where: {
          school_id: school.id,
          scope: 'SCHOOL',
          period_label: { [Op.like]: `${DUMMY_PREFIX} Period %` }
        },
        order: [['start_time', 'ASC']],
        transaction
      });
      const primarySessionHour = sessionHoursForAttendance[0] || null;

      if (primarySessionHour && teacherUserIds.length > 0) {
        const attendanceDates = [`${currentYear}-04-08`, `${currentYear}-04-09`, `${currentYear}-04-10`];
        let attendanceSessionsCount = 0;
        let attendanceRecordsCount = 0;

        for (let i = 0; i < attendanceDates.length; i++) {
          const date = attendanceDates[i];
          const studentSlice = students.slice(i * 3, i * 3 + 3);
          if (studentSlice.length === 0) {
            continue;
          }

          const sampleStudent = studentSlice[0];
          const [attendanceSession] = await AttendanceSession.findOrCreate({
            where: {
              class_id: sampleStudent.class_id,
              section_id: sampleStudent.section_id,
              session_hour_id: primarySessionHour.id,
              session_date: date,
              school_id: school.id
            },
            defaults: {
              class_id: sampleStudent.class_id,
              section_id: sampleStudent.section_id,
              session_hour_id: primarySessionHour.id,
              session_date: date,
              school_id: school.id,
              created_by: teacherUserIds[i % teacherUserIds.length]
            },
            transaction
          });

          attendanceSessionsCount += 1;

          for (let studentIndex = 0; studentIndex < studentSlice.length; studentIndex++) {
            const status = studentIndex === 0 ? 'P' : studentIndex === 1 ? 'A' : 'L';
            const [record, created] = await AttendanceRecord.findOrCreate({
              where: {
                session_id: attendanceSession.id,
                student_id: studentSlice[studentIndex].id
              },
              defaults: {
                session_id: attendanceSession.id,
                student_id: studentSlice[studentIndex].id,
                status,
                remarks: `${DUMMY_PREFIX} attendance sample`
              },
              transaction
            });

            if (!created && record.status !== status) {
              await record.update({ status, remarks: `${DUMMY_PREFIX} attendance sample` }, { transaction });
            }

            attendanceRecordsCount += 1;
          }
        }

        counts.attendance_sessions = attendanceSessionsCount;
        counts.attendance_records = attendanceRecordsCount;
      }

      return {
        school_id: school.id,
        school_name: school.name,
        imported: counts
      };
    });
  }

  async deleteDummyData(schoolId) {
    const school = await schoolRepository.findById(schoolId);
    if (!school) {
      throw new AppError('School not found', 404);
    }

    return sequelize.transaction(async (transaction) => {
      const counts = {
        session_hours: 0,
        holidays: 0,
        grading_scales: 0,
        exam_schedules: 0,
        exams: 0,
        subjects: 0,
        sections: 0,
        classes: 0,
        academic_years: 0,
        teachers: 0,
        students: 0,
        parents: 0,
        parent_student_links: 0,
        users: 0,
        persons: 0,
        class_teacher_assignments: 0,
        transport_routes: 0,
        transport_stops: 0,
        transport_vehicles: 0,
        student_transport_assignments: 0,
        library_books: 0,
        library_book_copies: 0,
        library_transactions: 0,
        timetable_periods: 0,
        class_timetable_entries: 0,
        attendance_sessions: 0,
        attendance_records: 0
      };

      const dummyNamePrefix = `${DUMMY_PREFIX}%`;
      const scopedPrefix = `${DUMMY_PREFIX}-${school.id}`;
      const scopedEmailPrefix = `${scopedPrefix.toLowerCase()}-%@${DUMMY_EMAIL_DOMAIN}`;

      const dummyTeachers = await Teacher.findAll({
        where: {
          school_id: school.id,
          employee_id: { [Op.like]: `${scopedPrefix}-TCH-%` }
        },
        paranoid: false,
        transaction
      });
      const teacherIds = dummyTeachers.map((row) => row.id);

      const dummyStudents = await Student.findAll({
        where: {
          school_id: school.id,
          admission_number: { [Op.like]: `${scopedPrefix}-STU-%` }
        },
        paranoid: false,
        transaction
      });
      const studentIds = dummyStudents.map((row) => row.id);

      const dummyParents = await Parent.findAll({
        where: {
          pan_number: { [Op.like]: `${scopedPrefix}-PAR-%` }
        },
        paranoid: false,
        transaction
      });
      const parentIds = dummyParents.map((row) => row.id);

      const dummyUsers = await User.findAll({
        where: {
          school_id: school.id,
          email: { [Op.like]: scopedEmailPrefix }
        },
        paranoid: false,
        transaction
      });
      const userIds = dummyUsers.map((row) => row.id);

      const dummyPersons = await Person.findAll({
        where: {
          user_id: userIds.length > 0 ? userIds : [-1]
        },
        paranoid: false,
        transaction
      });
      const personIds = dummyPersons.map((row) => row.id);

      if (teacherIds.length > 0) {
        counts.class_teacher_assignments = await Section.update(
          { class_teacher_id: null },
          {
            where: { class_teacher_id: teacherIds },
            transaction
          }
        ).then(([affected]) => affected || 0);
      }

      const transportRoutesTable = await resolveTableName(['transport_routes']);
      const transportStopsTable = await resolveTableName(['transport_stops']);
      const transportVehiclesTable = await resolveTableName(['transport_vehicles']);
      const studentTransportTable = await resolveTableName(['student_transport']);
      const libraryBooksTable = await resolveTableName(['library_books']);
      const libraryBookCopiesTable = await resolveTableName(['library_book_copies']);
      const libraryTransactionsTable = await resolveTableName(['library_transactions']);

      if (studentTransportTable) {
        const deletedAssignments = await sequelize.query(
          `DELETE FROM ${wrapIdentifier(studentTransportTable)}
           WHERE school_id = :schoolId
             AND (
               student_id IN (:studentIds)
               OR route_id IN (SELECT id FROM ${wrapIdentifier(transportRoutesTable || 'transport_routes')} WHERE school_id = :schoolId AND route_code LIKE :routePrefix)
             )`,
          {
            replacements: {
              schoolId: school.id,
              studentIds: studentIds.length > 0 ? studentIds : [-1],
              routePrefix: `${scopedPrefix}-R%`
            },
            transaction
          }
        );

        counts.student_transport_assignments = Number(deletedAssignments?.[1]?.rowCount || deletedAssignments?.[1]?.affectedRows || 0);
      }

      if (transportStopsTable && transportRoutesTable) {
        const deletedStops = await sequelize.query(
          `DELETE FROM ${wrapIdentifier(transportStopsTable)}
           WHERE route_id IN (
             SELECT id FROM ${wrapIdentifier(transportRoutesTable)}
             WHERE school_id = :schoolId AND route_code LIKE :routePrefix AND deleted_at IS NULL
           )`,
          {
            replacements: { schoolId: school.id, routePrefix: `${scopedPrefix}-R%` },
            transaction
          }
        );
        counts.transport_stops = Number(deletedStops?.[1]?.rowCount || deletedStops?.[1]?.affectedRows || 0);
      }

      if (transportRoutesTable) {
        const deletedRoutes = await sequelize.query(
          `DELETE FROM ${wrapIdentifier(transportRoutesTable)}
           WHERE school_id = :schoolId AND route_code LIKE :routePrefix`,
          {
            replacements: { schoolId: school.id, routePrefix: `${scopedPrefix}-R%` },
            transaction
          }
        );
        counts.transport_routes = Number(deletedRoutes?.[1]?.rowCount || deletedRoutes?.[1]?.affectedRows || 0);
      }

      if (transportVehiclesTable) {
        const deletedVehicles = await sequelize.query(
          `DELETE FROM ${wrapIdentifier(transportVehiclesTable)}
           WHERE school_id = :schoolId AND vehicle_number LIKE :vehiclePrefix`,
          {
            replacements: { schoolId: school.id, vehiclePrefix: `${scopedPrefix}-BUS-%` },
            transaction
          }
        );
        counts.transport_vehicles = Number(deletedVehicles?.[1]?.rowCount || deletedVehicles?.[1]?.affectedRows || 0);
      }

      if (libraryTransactionsTable && libraryBookCopiesTable) {
        const deletedTransactions = await sequelize.query(
          `DELETE FROM ${wrapIdentifier(libraryTransactionsTable)}
           WHERE school_id = :schoolId
             AND copy_id IN (
               SELECT id FROM ${wrapIdentifier(libraryBookCopiesTable)}
               WHERE school_id = :schoolId AND accession_number LIKE :accessionPrefix
             )`,
          {
            replacements: { schoolId: school.id, accessionPrefix: `${scopedPrefix}-ACC-%` },
            transaction
          }
        );
        counts.library_transactions = Number(deletedTransactions?.[1]?.rowCount || deletedTransactions?.[1]?.affectedRows || 0);
      }

      if (libraryBookCopiesTable) {
        const deletedCopies = await sequelize.query(
          `DELETE FROM ${wrapIdentifier(libraryBookCopiesTable)}
           WHERE school_id = :schoolId AND accession_number LIKE :accessionPrefix`,
          {
            replacements: { schoolId: school.id, accessionPrefix: `${scopedPrefix}-ACC-%` },
            transaction
          }
        );
        counts.library_book_copies = Number(deletedCopies?.[1]?.rowCount || deletedCopies?.[1]?.affectedRows || 0);
      }

      if (libraryBooksTable) {
        const deletedBooks = await sequelize.query(
          `UPDATE ${wrapIdentifier(libraryBooksTable)}
           SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE school_id = :schoolId AND isbn LIKE :isbnPrefix AND deleted_at IS NULL`,
          {
            replacements: { schoolId: school.id, isbnPrefix: `${scopedPrefix}-ISBN-%` },
            transaction
          }
        );
        counts.library_books = Number(deletedBooks?.[1]?.rowCount || deletedBooks?.[1]?.affectedRows || 0);
      }

      const relationTable = await resolveTableName(['student_parents']);
      if (relationTable) {
        const relationColumns = await getTableColumns(relationTable);
        const parentCol = relationColumns.has('parent_id') ? 'parent_id' : relationColumns.has('pid') ? 'pid' : null;
        const studentCol = relationColumns.has('student_id') ? 'student_id' : relationColumns.has('sid') ? 'sid' : null;

        if (parentCol && studentCol && (studentIds.length > 0 || parentIds.length > 0)) {
          const whereParts = [];
          const replacements = {};

          if (studentIds.length > 0) {
            whereParts.push(`${wrapIdentifier(studentCol)} IN (:studentIds)`);
            replacements.studentIds = studentIds;
          }

          if (parentIds.length > 0) {
            whereParts.push(`${wrapIdentifier(parentCol)} IN (:parentIds)`);
            replacements.parentIds = parentIds;
          }

          const links = await sequelize.query(
            `SELECT COUNT(*) AS total FROM ${wrapIdentifier(relationTable)} WHERE ${whereParts.join(' OR ')}`,
            {
              replacements,
              type: QueryTypes.SELECT,
              transaction
            }
          );

          await sequelize.query(
            `DELETE FROM ${wrapIdentifier(relationTable)} WHERE ${whereParts.join(' OR ')}`,
            {
              replacements,
              transaction
            }
          );

          counts.parent_student_links = Number(links?.[0]?.total || 0);
        }
      }

      const yearIdsForCleanup = (await AcademicYear.findAll({
        where: {
          school_id: school.id,
          name: { [Op.like]: dummyNamePrefix }
        },
        transaction
      })).map((y) => y.id);

      const classIdsForCleanup = (await Class.findAll({
        where: {
          academic_year_id: yearIdsForCleanup.length > 0 ? yearIdsForCleanup : [-1],
          name: { [Op.like]: `${DUMMY_PREFIX} Grade %` }
        },
        transaction
      })).map((c) => c.id);

      if (classIdsForCleanup.length > 0) {
        counts.attendance_records = await AttendanceRecord.destroy({
          where: {
            session_id: {
              [Op.in]: sequelize.literal(`(SELECT id FROM attendance_sessions WHERE school_id = ${Number(school.id)} AND class_id IN (${classIdsForCleanup.map((id) => Number(id)).join(',')}))`)
            }
          },
          force: true,
          transaction
        });

        counts.attendance_sessions = await AttendanceSession.destroy({
          where: {
            school_id: school.id,
            class_id: classIdsForCleanup
          },
          force: true,
          transaction
        });

        counts.class_timetable_entries = await ClassTimetable.destroy({
          where: {
            class_id: classIdsForCleanup,
            is_active: true
          },
          force: true,
          transaction
        });
      }

      if (teacherIds.length > 0) {
        counts.teachers = await Teacher.destroy({
          where: { id: teacherIds },
          force: true,
          transaction
        });
      }

      if (studentIds.length > 0) {
        counts.students = await Student.destroy({
          where: { id: studentIds },
          force: true,
          transaction
        });
      }

      if (parentIds.length > 0) {
        counts.parents = await Parent.destroy({
          where: { id: parentIds },
          force: true,
          transaction
        });
      }

      if (personIds.length > 0) {
        counts.persons = await Person.destroy({
          where: { id: personIds },
          force: true,
          transaction
        });
      }

      if (userIds.length > 0) {
        counts.users = await User.destroy({
          where: { id: userIds },
          force: true,
          transaction
        });
      }

      counts.session_hours = await SessionHour.destroy({
        where: {
          school_id: school.id,
          period_label: { [Op.like]: `${DUMMY_PREFIX} Period %` }
        },
        force: true,
        transaction
      });

      counts.holidays = await Holiday.destroy({
        where: {
          school_id: school.id,
          name: { [Op.like]: `${DUMMY_PREFIX} Holiday %` }
        },
        force: true,
        transaction
      });

      // Get dummy academic years for this school
      const yearIds = yearIdsForCleanup;

      if (yearIds.length > 0) {
        // Get classes and subjects created by dummy import.
        const classes = await Class.findAll({
          where: {
            academic_year_id: yearIds,
            name: { [Op.like]: `${DUMMY_PREFIX} Grade %` }
          },
          transaction
        });
        const classIds = classes.map(c => c.id);

        const subjects = await Subject.findAll({
          where: {
            school_id: school.id,
            name: { [Op.like]: `${DUMMY_PREFIX} Subject %` }
          },
          transaction
        });
        const subjectIds = subjects.map(s => s.id);

        counts.timetable_periods = await TimetablePeriod.destroy({
          where: {
            academic_year_id: yearIds,
            period_name: { [Op.like]: `${DUMMY_PREFIX} TT %` }
          },
          force: true,
          transaction
        });

        // Delete grading scales
        counts.grading_scales = await GradingScale.destroy({
          where: {
            academic_year_id: yearIds,
            grade_name: { [Op.like]: `${DUMMY_PREFIX}%` }
          },
          transaction
        });

        // Get exams for these years
        const exams = await Exam.findAll({
          where: {
            academic_year_id: yearIds,
            name: { [Op.like]: `${DUMMY_PREFIX} Exam %` }
          },
          transaction
        });
        const examIds = exams.map(e => e.id);

        if (examIds.length > 0 || classIds.length > 0 || subjectIds.length > 0) {
          // Delete exam schedules
          counts.exam_schedules = await ExamSchedule.destroy({
            where: {
              [Op.or]: [
                { exam_id: examIds.length > 0 ? examIds : [-1] },
                { class_id: classIds.length > 0 ? classIds : [-1] },
                { subject_id: subjectIds.length > 0 ? subjectIds : [-1] }
              ]
            },
            transaction
          });
        }

        if (examIds.length > 0) {
          // Delete exams
          counts.exams = await Exam.destroy({
            where: { id: examIds },
            transaction
          });
        }

        if (subjectIds.length > 0) {
          // Delete subjects
          counts.subjects = await Subject.destroy({
            where: { id: subjectIds },
            force: true,
            transaction
          });
        }

        if (classIds.length > 0) {
          // Delete sections
          counts.sections = await Section.destroy({
            where: {
              class_id: classIds,
              name: { [Op.like]: `${DUMMY_PREFIX}-%` }
            },
            force: true,
            transaction
          });

          // Delete classes
          counts.classes = await Class.destroy({
            where: { id: classIds },
            force: true,
            transaction
          });
        }

        counts.academic_years = await AcademicYear.destroy({
          where: { id: yearIds },
          transaction
        });
      }

      return {
        school_id: school.id,
        school_name: school.name,
        deleted: counts
      };
    });
  }

  async deleteSchool(id) {
    const school = await schoolRepository.findById(id);
    if (!school) {
      throw new AppError('School not found', 404);
    }
    await schoolRepository.delete(id);
    return true;
  }
}

class SchoolBranchService {
  async listBranches(schoolId) {
    const school = await schoolRepository.findById(schoolId);
    if (!school) {
      throw new AppError('School not found', 404);
    }
    return schoolBranchRepository.listBySchool(schoolId);
  }

  async createBranch(payload = {}) {
    const schoolId = parseInt(payload.school_id, 10);
    const code = sanitizeText(payload.code).toUpperCase();
    const name = sanitizeText(payload.name);
    const branchType = sanitizeText(payload.branch_type).toLowerCase();
    const isActive = payload.is_active === undefined ? true : normalizeBoolean(payload.is_active);

    if (!schoolId || Number.isNaN(schoolId)) {
      throw new AppError('School selection is required', 400);
    }
    if (!code) {
      throw new AppError('Branch code is required', 400);
    }
    if (!name) {
      throw new AppError('Branch name is required', 400);
    }
    if (!VALID_BRANCH_TYPES.includes(branchType)) {
      throw new AppError('Invalid branch type', 400);
    }

    const school = await schoolRepository.findById(schoolId);
    if (!school) {
      throw new AppError('Selected school was not found', 404);
    }

    const duplicateCode = await schoolBranchRepository.findByCodeWithinSchool(schoolId, code);
    if (duplicateCode) {
      throw new AppError('Branch code already exists for this school', 409);
    }

    const duplicateName = await schoolBranchRepository.findByNameWithinSchool(schoolId, name);
    if (duplicateName) {
      throw new AppError('Branch name already exists for this school', 409);
    }

    return schoolBranchRepository.create({
      school_id: schoolId,
      code,
      name,
      branch_type: branchType,
      is_active: isActive
    });
  }
}

module.exports = {
  schoolService: new SchoolService(),
  schoolBranchService: new SchoolBranchService()
};
