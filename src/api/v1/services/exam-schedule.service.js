const examScheduleRepository = require('../repositories/exam-schedule.repository');
const parentDashboardRepository = require('../repositories/parent-dashboard.repository');
const { AppError } = require('../../../middleware/error.middleware');
const { AcademicYear } = require('../../../models');

const parsePositiveInt = (value) => {
  if (typeof value === 'undefined' || value === null || value === '') {
    return null;
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
};

const normalizeRoleName = (roleName) => {
  if (!roleName || typeof roleName !== 'string') {
    return '';
  }

  return roleName.trim().toLowerCase();
};

const normalizeDate = (value) => {
  const parsedDate = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError('Invalid exam date', 400);
  }

  return parsedDate.toISOString().split('T')[0];
};

const parseSingleTime = (value) => {
  const normalizedValue = String(value || '').trim().toUpperCase();
  const match = normalizedValue.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/);

  if (!match) {
    throw new AppError('Invalid exam time format', 400);
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3] || '0', 10);
  const meridiem = match[4] || null;

  if (minutes > 59 || seconds > 59) {
    throw new AppError('Invalid exam time format', 400);
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      throw new AppError('Invalid exam time format', 400);
    }

    if (meridiem === 'AM') {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
  } else if (hours > 23) {
    throw new AppError('Invalid exam time format', 400);
  }

  return {
    totalMinutes: (hours * 60) + minutes,
    value: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  };
};

const parseDurationToMinutes = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  const hourMatch = normalizedValue.match(/(\d+(?:\.\d+)?)\s*h(?:our|ours)?/);
  const minuteMatch = normalizedValue.match(/(\d+)\s*m(?:in|ins|inute|inutes)?/);

  const hours = hourMatch ? parseFloat(hourMatch[1]) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;

  if (!hours && !minutes) {
    return null;
  }

  return Math.round((hours * 60) + minutes);
};

const addMinutes = (timeValue, additionalMinutes) => {
  const parsed = parseSingleTime(timeValue);
  const totalMinutes = parsed.totalMinutes + additionalMinutes;

  if (totalMinutes <= parsed.totalMinutes || totalMinutes > (24 * 60)) {
    throw new AppError('Invalid exam duration', 400);
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
};

const parseTimeRange = (timeRange, duration) => {
  const normalizedValue = String(timeRange || '').replace(/\u2013|\u2014/g, '-').trim();
  const parts = normalizedValue.split(/\s*-\s*/).filter(Boolean);

  if (parts.length >= 2) {
    const startTime = parseSingleTime(parts[0]);
    const endTime = parseSingleTime(parts[1]);

    if (endTime.totalMinutes <= startTime.totalMinutes) {
      throw new AppError('Exam end time must be after start time', 400);
    }

    return {
      startTime: startTime.value,
      endTime: endTime.value
    };
  }

  const durationMinutes = parseDurationToMinutes(duration);
  if (parts.length === 1 && durationMinutes) {
    return {
      startTime: parseSingleTime(parts[0]).value,
      endTime: addMinutes(parts[0], durationMinutes)
    };
  }

  throw new AppError('Exam time must be a time range like 09:00 AM - 11:00 AM', 400);
};

const getMaxMarksForExamType = (examType) => {
  switch (examType) {
    case 'unit_test':
      return 25;
    case 'mid_term':
      return 50;
    case 'practical':
      return 30;
    case 'project':
      return 20;
    case 'final':
    default:
      return 100;
  }
};

class ExamScheduleService {
  async resolveAcademicYearId(schoolId, academicYearId) {
    const parsedAcademicYearId = parsePositiveInt(academicYearId);

    if (parsedAcademicYearId) {
      return parsedAcademicYearId;
    }

    const currentYear = await AcademicYear.findOne({
      where: {
        school_id: schoolId,
        is_current: true
      },
      attributes: ['id']
    });

    return currentYear?.id || null;
  }

  async getExamSchedules(filters = {}, context = {}) {
    const schoolId = parsePositiveInt(context.schoolId);
    const userId = parsePositiveInt(context.userId);
    const normalizedRole = normalizeRoleName(context.roleName);

    if (!schoolId) {
      throw new AppError('School context is required to fetch exam schedules', 400);
    }

    const academicYearId = await this.resolveAcademicYearId(schoolId, filters.academicYearId);
    let classIds = null;

    if (normalizedRole === 'student') {
      const student = await examScheduleRepository.findStudentByUserId(userId, schoolId);
      if (!student) {
        throw new AppError('Student profile not found', 404);
      }
      classIds = [student.class_id];
    }

    if (normalizedRole === 'parent') {
      const parent = await parentDashboardRepository.findParentByUserId(userId);
      if (!parent) {
        throw new AppError('Parent record not found', 404);
      }

      const linkedStudentIds = await parentDashboardRepository.getStudentIdsByParentId(parent.id);
      if (!linkedStudentIds.length) {
        return [];
      }

      const requestedStudentId = parsePositiveInt(filters.studentId);
      const selectedStudentId = requestedStudentId || linkedStudentIds[0];
      const hasAccess = linkedStudentIds.some((id) => Number(id) === Number(selectedStudentId));

      if (!hasAccess) {
        throw new AppError('You do not have access to this child', 403);
      }

      const selectedStudents = await parentDashboardRepository.getStudentsByIds([selectedStudentId]);
      if (!selectedStudents.length) {
        throw new AppError('Student not found', 404);
      }

      classIds = [selectedStudents[0].class_id];
    }

    return examScheduleRepository.findAll({ schoolId, academicYearId, classIds });
  }

  async createLegacySchedule(payload = {}, context = {}) {
    const schoolId = parsePositiveInt(context.schoolId);

    if (!schoolId) {
      throw new AppError('School context is required to create exam schedules', 400);
    }

    const examName = String(payload.eid || '').trim();
    const subjectName = String(payload.subject || '').trim();
    const classId = parsePositiveInt(payload.sclass);

    if (!examName || examName === '-1') {
      throw new AppError('Exam name is required', 400);
    }

    if (!subjectName) {
      throw new AppError('Subject is required', 400);
    }

    if (!classId) {
      throw new AppError('Class is required', 400);
    }

    const [exam, classRecord, subject] = await Promise.all([
      examScheduleRepository.findExamByName(examName, schoolId),
      examScheduleRepository.findClassById(classId, schoolId),
      examScheduleRepository.findSubjectByName(subjectName, schoolId)
    ]);

    if (!exam) {
      throw new AppError('Exam not found for this school', 404);
    }

    if (!classRecord) {
      throw new AppError('Class not found for this school', 404);
    }

    if (!subject) {
      throw new AppError('Subject not found for this school', 404);
    }

    const { startTime, endTime } = parseTimeRange(payload.time, payload.duration);
    const normalizedDate = normalizeDate(payload.date);
    const maxMarks = getMaxMarksForExamType(exam.exam_type);
    const passingMarks = Math.round(maxMarks * 0.33);
    const schedulePayload = {
      exam_id: exam.id,
      class_id: classRecord.id,
      subject_id: subject.id,
      exam_date: normalizedDate,
      start_time: startTime,
      end_time: endTime,
      max_marks: maxMarks,
      passing_marks: passingMarks,
      room_number: null
    };

    const existingSchedule = await examScheduleRepository.findByKeys({
      examId: exam.id,
      classId: classRecord.id,
      subjectId: subject.id
    });

    if (existingSchedule) {
      return examScheduleRepository.update(existingSchedule.id, schedulePayload, schoolId);
    }

    return examScheduleRepository.create(schedulePayload, schoolId);
  }

  async deleteLegacySchedule(id, context = {}) {
    const schoolId = parsePositiveInt(context.schoolId);
    const scheduleId = parsePositiveInt(id);

    if (!schoolId) {
      throw new AppError('School context is required to delete exam schedules', 400);
    }

    if (!scheduleId) {
      throw new AppError('Invalid exam schedule ID', 400);
    }

    const deleted = await examScheduleRepository.deleteById(scheduleId, schoolId);

    if (!deleted) {
      throw new AppError('Exam schedule not found', 404);
    }

    return { deleted: true };
  }
}

module.exports = new ExamScheduleService();