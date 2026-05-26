const { sequelize } = require('../../../config/database');
const { QueryTypes } = require('sequelize');
const {
  ClassTimetable,
  TimetablePeriod,
  Class,
  Section,
  Subject,
  Teacher,
  Person,
  SchoolBranch,
  AcademicYear
} = require('../../../models');
const { AppError } = require('../../../middleware/error.middleware');

class ClassTimetableRepository {
  /**
   * Create a new timetable entry
   */
  async create(data) {
    const entry = await ClassTimetable.create(data);
    return this.findById(entry.id);
  }

  /**
   * Find a timetable entry by ID with joins
   */
  async findById(id) {
    const entry = await ClassTimetable.findOne({
      where: { id, is_active: true },
      include: [
        { model: Class, as: 'class', attributes: ['id', 'name', 'numeric_grade'] },
        { model: Section, as: 'section', attributes: ['id', 'name'] },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        {
          model: Teacher, as: 'teacher',
          attributes: ['id', 'employee_id'],
          include: [{ model: Person, as: 'person', attributes: ['first_name', 'last_name'] }]
        },
        { model: TimetablePeriod, as: 'period', attributes: ['id', 'period_name', 'period_number', 'start_time', 'end_time', 'is_break'] }
      ]
    });

    if (!entry) {
      throw new AppError('Timetable entry not found', 404);
    }

    return entry;
  }

  /**
   * Find timetable entry by ID scoped to a school
   */
  async findByIdAndSchool(id, schoolId) {
    const entry = await this.findById(id);

    if (schoolId) {
      const classRecord = await Class.findOne({
        where: { id: entry.class_id },
        include: [{
          model: SchoolBranch, as: 'branch',
          attributes: ['school_id'],
          where: { school_id: schoolId }
        }]
      });

      if (!classRecord) {
        throw new AppError('Timetable entry not found in your school', 404);
      }
    }

    return entry;
  }

  /**
   * Find timetable entries for a class+section
   */
  async findByClassSection(classId, sectionId, schoolId) {
    const whereClause = { is_active: true };
    if (classId) whereClause.class_id = classId;
    if (sectionId) whereClause.section_id = sectionId;

    const entries = await ClassTimetable.findAll({
      where: whereClause,
      include: [
        {
          model: Class, as: 'class',
          attributes: ['id', 'name', 'numeric_grade'],
          include: schoolId ? [{
            model: SchoolBranch, as: 'branch',
            attributes: [],
            where: { school_id: schoolId }
          }] : []
        },
        { model: Section, as: 'section', attributes: ['id', 'name'] },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        {
          model: Teacher, as: 'teacher',
          attributes: ['id', 'employee_id'],
          include: [{ model: Person, as: 'person', attributes: ['first_name', 'last_name'] }]
        },
        { model: TimetablePeriod, as: 'period', attributes: ['id', 'period_name', 'period_number', 'start_time', 'end_time', 'is_break', 'duration_minutes'] }
      ],
      order: [
        [sequelize.literal(`CASE day_of_week
          WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3
          WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5 WHEN 'saturday' THEN 6
          WHEN 'sunday' THEN 7 END`), 'ASC'],
        [{ model: TimetablePeriod, as: 'period' }, 'start_time', 'ASC']
      ]
    });

    return entries;
  }

  /**
   * Update a timetable entry
   */
  async update(id, data) {
    const entry = await ClassTimetable.findOne({ where: { id, is_active: true } });
    if (!entry) {
      throw new AppError('Timetable entry not found', 404);
    }
    await entry.update(data);
    return this.findById(id);
  }

  /**
   * Soft-delete a timetable entry (set is_active=false)
   */
  async softDelete(id) {
    const entry = await ClassTimetable.findOne({ where: { id, is_active: true } });
    if (!entry) {
      throw new AppError('Timetable entry not found', 404);
    }
    await entry.update({ is_active: false });
    return { deleted: true };
  }

  /**
   * Check if a slot is already occupied for a class+section+day+period
   */
  async isSlotOccupied(classId, sectionId, dayOfWeek, periodId, excludeId = null) {
    const where = {
      class_id: classId,
      section_id: sectionId,
      day_of_week: dayOfWeek,
      period_id: periodId,
      is_active: true
    };

    if (excludeId) {
      const { Op } = require('sequelize');
      where.id = { [Op.ne]: excludeId };
    }

    const existing = await ClassTimetable.findOne({ where });
    return !!existing;
  }

  /**
   * Check if a teacher is already booked for a given day+period
   */
  async isTeacherDoubleBooked(teacherId, dayOfWeek, periodId, excludeId = null) {
    const where = {
      teacher_id: teacherId,
      day_of_week: dayOfWeek,
      period_id: periodId,
      is_active: true
    };

    if (excludeId) {
      const { Op } = require('sequelize');
      where.id = { [Op.ne]: excludeId };
    }

    const existing = await ClassTimetable.findOne({ where });
    return !!existing;
  }

  /**
   * Get teacher workload summary: hours/week, classes, subjects
   */
  async getTeacherWorkload(schoolId) {
    const schoolFilter = schoolId ? 'AND branch.school_id = :schoolId' : '';

    const query = `
      SELECT
        tch.id AS teacher_id,
        tch.employee_id,
        TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS teacher_name,
        COUNT(ct.id) AS total_periods_per_week,
        COALESCE(SUM(tp.duration_minutes), 0) AS total_minutes_per_week,
        COUNT(DISTINCT CONCAT(ct.class_id, '-', ct.section_id)) AS unique_class_sections,
        COUNT(DISTINCT ct.subject_id) AS unique_subjects
      FROM class_timetable ct
      INNER JOIN teachers tch ON ct.teacher_id = tch.id AND tch.deleted_at IS NULL
      INNER JOIN persons p ON tch.person_id = p.id AND p.deleted_at IS NULL
      INNER JOIN timetable_periods tp ON ct.period_id = tp.id
      INNER JOIN classes cls ON ct.class_id = cls.id AND cls.deleted_at IS NULL
      INNER JOIN school_branches branch ON cls.branch_id = branch.id AND branch.deleted_at IS NULL
      WHERE ct.is_active = true
        AND (ct.effective_from IS NULL OR ct.effective_from <= CURRENT_DATE)
        AND (ct.effective_to IS NULL OR ct.effective_to >= CURRENT_DATE)
        ${schoolFilter}
      GROUP BY tch.id, tch.employee_id, p.first_name, p.last_name
      ORDER BY teacher_name ASC
    `;

    const teachers = await sequelize.query(query, {
      replacements: schoolId ? { schoolId } : {},
      type: QueryTypes.SELECT
    });

    return teachers;
  }

  /**
   * Get detailed workload for a specific teacher (per-day breakdown)
   */
  async getTeacherWorkloadDetail(teacherId, schoolId) {
    const schoolFilter = schoolId ? 'AND branch.school_id = :schoolId' : '';

    const query = `
      SELECT
        ct.day_of_week,
        tp.period_name,
        tp.start_time,
        tp.end_time,
        tp.duration_minutes,
        sub.name AS subject_name,
        cls.name AS class_name,
        sec.name AS section_name,
        ct.room_number
      FROM class_timetable ct
      INNER JOIN timetable_periods tp ON ct.period_id = tp.id
      INNER JOIN subjects sub ON ct.subject_id = sub.id AND sub.deleted_at IS NULL
      INNER JOIN classes cls ON ct.class_id = cls.id AND cls.deleted_at IS NULL
      INNER JOIN sections sec ON ct.section_id = sec.id AND sec.deleted_at IS NULL
      INNER JOIN school_branches branch ON cls.branch_id = branch.id AND branch.deleted_at IS NULL
      WHERE ct.teacher_id = :teacherId
        AND ct.is_active = true
        AND (ct.effective_from IS NULL OR ct.effective_from <= CURRENT_DATE)
        AND (ct.effective_to IS NULL OR ct.effective_to >= CURRENT_DATE)
        ${schoolFilter}
      ORDER BY
        CASE ct.day_of_week
          WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3
          WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5 WHEN 'saturday' THEN 6
          WHEN 'sunday' THEN 7
        END ASC,
        tp.start_time ASC
    `;

    return sequelize.query(query, {
      replacements: schoolId ? { teacherId, schoolId } : { teacherId },
      type: QueryTypes.SELECT
    });
  }

  /**
   * Find timetable for a student by class_id + section_id (used by parent view)
   */
  async findScheduleByClassSection(classId, sectionId, schoolId) {
    const schoolFilter = schoolId ? 'AND branch.school_id = :schoolId' : '';

    const query = `
      SELECT
        ct.id,
        CASE ct.day_of_week
          WHEN 'sunday' THEN 0 WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2
          WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5
          WHEN 'saturday' THEN 6
        END AS day,
        ct.day_of_week AS day_name,
        cls.name AS class_name,
        sec.name AS sname,
        sub.name AS subname,
        TRIM(CONCAT(COALESCE(teacher_person.first_name, ''), ' ', COALESCE(teacher_person.last_name, ''))) AS fname,
        period.start_time AS stime,
        period.end_time AS etime,
        period.period_name,
        period.period_number,
        period.is_break,
        ct.room_number
      FROM class_timetable ct
      INNER JOIN classes cls ON ct.class_id = cls.id AND cls.deleted_at IS NULL
      INNER JOIN sections sec ON ct.section_id = sec.id AND sec.deleted_at IS NULL
      INNER JOIN school_branches branch ON cls.branch_id = branch.id AND branch.deleted_at IS NULL
      INNER JOIN subjects sub ON ct.subject_id = sub.id AND sub.deleted_at IS NULL
      INNER JOIN teachers tch ON ct.teacher_id = tch.id AND tch.deleted_at IS NULL
      INNER JOIN persons teacher_person ON tch.person_id = teacher_person.id AND teacher_person.deleted_at IS NULL
      INNER JOIN timetable_periods period ON ct.period_id = period.id
      WHERE ct.is_active = true
        AND ct.class_id = :classId
        AND ct.section_id = :sectionId
        AND (ct.effective_from IS NULL OR ct.effective_from <= CURRENT_DATE)
        AND (ct.effective_to IS NULL OR ct.effective_to >= CURRENT_DATE)
        ${schoolFilter}
      ORDER BY day ASC, period.start_time ASC
    `;

    return sequelize.query(query, {
      replacements: schoolId ? { classId, sectionId, schoolId } : { classId, sectionId },
      type: QueryTypes.SELECT
    });
  }

  /**
   * Get timetable periods for an academic year
   */
  async findPeriodsByAcademicYear(academicYearId, schoolId) {
    const academicYearInclude = {
      model: AcademicYear,
      as: 'academicYear',
      attributes: ['id', 'name', 'school_id'],
      required: true
    };

    if (schoolId) {
      academicYearInclude.where = { school_id: schoolId };
    }

    return TimetablePeriod.findAll({
      where: { academic_year_id: academicYearId, is_active: true },
      include: [academicYearInclude],
      order: [['display_order', 'ASC'], ['start_time', 'ASC']]
    });
  }

  /**
   * Get timetable periods across all academic years (when no year specified)
   */
  async findAllActivePeriods(schoolId) {
    const academicYearInclude = {
      model: AcademicYear,
      as: 'academicYear',
      attributes: ['id', 'name', 'start_date', 'end_date', 'school_id'],
      required: true
    };

    if (schoolId) {
      academicYearInclude.where = { school_id: schoolId };
    }

    return TimetablePeriod.findAll({
      where: { is_active: true },
      include: [academicYearInclude],
      order: [['academic_year_id', 'DESC'], ['display_order', 'ASC'], ['start_time', 'ASC']]
    });
  }
}

module.exports = new ClassTimetableRepository();
