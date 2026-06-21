const { Op, fn, col, where } = require('sequelize');
const { AcademicYear, Class, Exam, ExamSchedule, Subject, Student, Person } = require('../../../models');

const formatTimeLabel = (value) => {
  if (!value) {
    return '';
  }

  const [hourPart = '0', minutePart = '0'] = String(value).split(':');
  let hours = parseInt(hourPart, 10);
  const minutes = parseInt(minutePart, 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return String(value);
  }

  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${meridiem}`;
};

const toMinutes = (value) => {
  if (!value) {
    return null;
  }

  const [hourPart = '0', minutePart = '0'] = String(value).split(':');
  const hours = parseInt(hourPart, 10);
  const minutes = parseInt(minutePart, 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return (hours * 60) + minutes;
};

const formatDurationLabel = (startTime, endTime) => {
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return '';
  }

  const durationMinutes = endMinutes - startMinutes;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours && minutes) {
    return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  if (hours) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};

class ExamScheduleRepository {
  buildAcademicYearWhere(schoolId, academicYearId = null) {
    const academicYearWhere = { school_id: schoolId };

    if (academicYearId) {
      academicYearWhere.id = academicYearId;
    }

    return academicYearWhere;
  }

  toLegacySchedule(schedule) {
    return {
      id: schedule.id,
      eid: schedule.exam?.name || '',
      ename: schedule.exam?.name || '',
      subject: schedule.subject?.name || '',
      sclass: schedule.class?.name || '',
      date: schedule.exam_date,
      time: `${formatTimeLabel(schedule.start_time)} - ${formatTimeLabel(schedule.end_time)}`.trim(),
      duration: formatDurationLabel(schedule.start_time, schedule.end_time),
      cid: schedule.class_id,
      classId: schedule.class_id,
      className: schedule.class?.name || ''
    };
  }

  async findAll({ schoolId, academicYearId = null, classIds = null } = {}) {
    const classWhere = {};
    if (Array.isArray(classIds) && classIds.length > 0) {
      classWhere.id = { [Op.in]: classIds };
    }

    const schedules = await ExamSchedule.findAll({
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'name', 'exam_type', 'academic_year_id'],
          required: true,
          include: [
            {
              model: AcademicYear,
              as: 'academicYear',
              attributes: ['id', 'name', 'is_current'],
              required: true,
              where: this.buildAcademicYearWhere(schoolId, academicYearId)
            }
          ]
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'numeric_grade'],
          where: classWhere,
          required: true
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'name', 'code'],
          required: true
        }
      ],
      order: [
        ['exam_date', 'ASC'],
        ['start_time', 'ASC'],
        [{ model: Exam, as: 'exam' }, 'name', 'ASC'],
        [{ model: Class, as: 'class' }, 'name', 'ASC'],
        [{ model: Subject, as: 'subject' }, 'name', 'ASC']
      ]
    });

    const uniqueSchedules = new Map();

    schedules.forEach((schedule) => {
      const uniqueKey = `${schedule.exam_id}:${schedule.class_id}:${schedule.subject_id}`;
      const existing = uniqueSchedules.get(uniqueKey);

      if (!existing || Number(schedule.id) > Number(existing.id)) {
        uniqueSchedules.set(uniqueKey, schedule);
      }
    });

    return Array.from(uniqueSchedules.values())
      .sort((a, b) => {
        const dateA = String(a.exam_date || '');
        const dateB = String(b.exam_date || '');
        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }

        const startA = String(a.start_time || '');
        const startB = String(b.start_time || '');
        if (startA !== startB) {
          return startA.localeCompare(startB);
        }

        const examA = String(a.exam?.name || '');
        const examB = String(b.exam?.name || '');
        if (examA !== examB) {
          return examA.localeCompare(examB);
        }

        const classA = String(a.class?.name || '');
        const classB = String(b.class?.name || '');
        if (classA !== classB) {
          return classA.localeCompare(classB);
        }

        const subjectA = String(a.subject?.name || '');
        const subjectB = String(b.subject?.name || '');
        return subjectA.localeCompare(subjectB);
      })
      .map((schedule) => this.toLegacySchedule(schedule));
  }

  async findStudentByUserId(userId, schoolId) {
    const person = await Person.findOne({
      where: { user_id: userId },
      include: [
        {
          model: Student,
          as: 'student',
          required: true,
          where: schoolId ? { school_id: schoolId } : undefined
        }
      ]
    });

    return person?.student || null;
  }

  async findExamByName(examName, schoolId) {
    return Exam.findOne({
      attributes: ['id', 'name', 'exam_type', 'academic_year_id'],
      include: [
        {
          model: AcademicYear,
          as: 'academicYear',
          attributes: ['id', 'name', 'is_current'],
          required: true,
          where: this.buildAcademicYearWhere(schoolId)
        }
      ],
      where: {
        name: where(fn('LOWER', col('Exam.name')), String(examName).trim().toLowerCase())
      },
      order: [
        [{ model: AcademicYear, as: 'academicYear' }, 'is_current', 'DESC'],
        ['start_date', 'ASC'],
        ['name', 'ASC']
      ]
    });
  }

  async findClassById(classId, schoolId) {
    return Class.findOne({
      attributes: ['id', 'name', 'numeric_grade', 'academic_year_id'],
      include: [
        {
          model: AcademicYear,
          as: 'academicYear',
          attributes: ['id', 'school_id'],
          required: true,
          where: { school_id: schoolId }
        }
      ],
      where: { id: classId }
    });
  }

  async findSubjectByName(subjectName, schoolId) {
    const normalizedName = String(subjectName).trim().toLowerCase();

    const exactMatch = await Subject.findOne({
      attributes: ['id', 'name', 'code', 'school_id'],
      where: {
        school_id: schoolId,
        name: where(fn('LOWER', col('name')), normalizedName)
      },
      order: [['name', 'ASC']]
    });

    if (exactMatch) {
      return exactMatch;
    }

    const partialMatches = await Subject.findAll({
      attributes: ['id', 'name', 'code', 'school_id'],
      where: {
        school_id: schoolId,
        [Op.and]: [where(fn('LOWER', col('name')), { [Op.like]: `%${normalizedName}%` })]
      },
      order: [['name', 'ASC']],
      limit: 2
    });

    return partialMatches.length === 1 ? partialMatches[0] : null;
  }

  async findByKeys({ examId, classId, subjectId }) {
    return ExamSchedule.findOne({
      where: {
        exam_id: examId,
        class_id: classId,
        subject_id: subjectId
      }
    });
  }

  async create(payload) {
    const record = await ExamSchedule.create(payload);
    return this.findById(record.id);
  }

  async update(id, payload) {
    const record = await ExamSchedule.findByPk(id);

    if (!record) {
      return null;
    }

    await record.update(payload);
    return this.findById(id);
  }

  async findById(id) {
    const schedule = await ExamSchedule.findByPk(id, {
      include: [
        {
          model: Exam,
          as: 'exam',
          attributes: ['id', 'name', 'exam_type', 'academic_year_id'],
          include: [
            {
              model: AcademicYear,
              as: 'academicYear',
              attributes: ['id', 'name', 'is_current']
            }
          ]
        },
        {
          model: Class,
          as: 'class',
          attributes: ['id', 'name', 'numeric_grade']
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    return schedule ? this.toLegacySchedule(schedule) : null;
  }

  async deleteById(id, schoolId) {
    const schedule = await ExamSchedule.findOne({
      include: [
        {
          model: Exam,
          as: 'exam',
          required: true,
          include: [
            {
              model: AcademicYear,
              as: 'academicYear',
              required: true,
              where: { school_id: schoolId }
            }
          ]
        }
      ],
      where: { id }
    });

    if (!schedule) {
      return false;
    }

    await schedule.destroy();
    return true;
  }
}

module.exports = new ExamScheduleRepository();