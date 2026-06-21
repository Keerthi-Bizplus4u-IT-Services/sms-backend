const {
  AttendanceSession,
  AttendanceRecord,
  Student,
  Person,
  Class,
  Section,
  SessionHour,
  Teacher
} = require('../../../models');
const { Op } = require('sequelize');

class AttendanceRepository {
  async findTeacherByUserId(userId, schoolId) {
    if (!userId) {
      return null;
    }

    const person = await Person.findOne({
      where: { user_id: userId },
      include: [
        {
          model: Teacher,
          as: 'teacher',
          required: true,
          where: schoolId ? { school_id: schoolId } : undefined
        }
      ]
    });

    return person?.teacher || null;
  }

  async teacherCanTakeAttendance({ userId, schoolId, classId, sectionId }) {
    const teacher = await this.findTeacherByUserId(userId, schoolId);
    if (!teacher) {
      return false;
    }

    const mappingCount = await Section.count({
      where: {
        id: sectionId,
        class_id: classId,
        class_teacher_id: teacher.id
      }
    });

    return mappingCount > 0;
  }

  async findDailyAttendanceSession({ classId, sectionId, schoolId, sessionDate }) {
    return AttendanceSession.findOne({
      where: {
        class_id: classId,
        section_id: sectionId,
        school_id: schoolId,
        session_date: sessionDate
      }
    });
  }

  /**
   * Find or create an attendance session for a given class/section/date/session-hour.
   */
  async findOrCreateSession({ classId, sectionId, sessionHourId, sessionDate, schoolId, createdBy }) {
    const [session] = await AttendanceSession.findOrCreate({
      where: {
        class_id: classId,
        section_id: sectionId,
        session_hour_id: sessionHourId,
        session_date: sessionDate,
        school_id: schoolId
      },
      defaults: {
        created_by: createdBy
      }
    });
    return session;
  }

  async findEffectiveSessionHours({ schoolId, classId, sectionId }) {
    const scopedQueries = [];

    if (sectionId) {
      scopedQueries.push({ school_id: schoolId, scope: 'SECTION', section_id: sectionId });
    }

    if (classId) {
      scopedQueries.push({ school_id: schoolId, scope: 'CLASS', class_id: classId });
    }

    scopedQueries.push({ school_id: schoolId, scope: 'SCHOOL' });

    for (const where of scopedQueries) {
      const rows = await SessionHour.findAll({
        where,
        order: [['start_time', 'ASC']]
      });

      if (rows.length > 0) {
        return rows;
      }
    }

    return [];
  }

  formatSessionLabel(sessionHour) {
    if (!sessionHour) return 'Session';
    const start = String(sessionHour.start_time || '').slice(0, 5);
    const end = String(sessionHour.end_time || '').slice(0, 5);
    const label = sessionHour.period_label ? `${sessionHour.period_label}` : `${start} - ${end}`;
    return label || 'Session';
  }

  buildMonthDays(month, year) {
    const totalDays = new Date(year, month, 0).getDate();
    const days = [];
    for (let day = 1; day <= totalDays; day += 1) {
      days.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
    return days;
  }

  /**
   * Get students with month-wise day/session summary.
   * If studentId is provided, filter to only that student (for student role).
   */
  async getAttendance({ classId, sectionId, month, schoolId, studentId = null }) {
    const year = new Date().getFullYear();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = parseInt(month, 10);
    const lastDay = new Date(year, endMonth, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Build student filter
    const studentWhere = { class_id: classId, section_id: sectionId, current_status: 'active' };
    if (studentId) {
      studentWhere.id = studentId;
    }

    // Get all students in class/section (or single student)
    const students = await Student.findAll({
      where: studentWhere,
      include: [{
        model: Person,
        as: 'person',
        attributes: ['first_name', 'last_name']
      }],
      order: [['roll_number', 'ASC']]
    });

    if (!students.length) return [];

    const studentIds = students.map(s => s.id);

    const effectiveSessionHours = await this.findEffectiveSessionHours({
      schoolId,
      classId,
      sectionId
    });

    const expectedSessions = effectiveSessionHours.map((item) => ({
      key: `sh_${item.id}`,
      sessionHourId: item.id,
      label: this.formatSessionLabel(item)
    }));

    // Get all attendance sessions for the month
    const sessionWhere = {
      class_id: classId,
      section_id: sectionId,
      session_date: { [Op.between]: [startDate, endDate] },
      school_id: schoolId
    };
    const sessions = await AttendanceSession.findAll({
      where: sessionWhere,
      include: [{
        model: AttendanceRecord,
        as: 'records',
        where: { student_id: { [Op.in]: studentIds } },
        required: false
      }],
      order: [['session_date', 'ASC']]
    });

    // Build fast lookup: student|date|sessionKey => status
    const attendanceMap = {};
    const monthDays = this.buildMonthDays(month, year);

    const fallbackSessionMap = new Map();
    for (const session of sessions) {
      const sessionKey = session.session_hour_id ? `sh_${session.session_hour_id}` : `s_${session.id}`;
      if (!session.session_hour_id && !fallbackSessionMap.has(sessionKey)) {
        fallbackSessionMap.set(sessionKey, {
          key: sessionKey,
          sessionHourId: null,
          label: `Session ${fallbackSessionMap.size + 1}`
        });
      }
    }

    const expectedSessionPool = expectedSessions.length > 0
      ? expectedSessions
      : Array.from(fallbackSessionMap.values());

    for (const session of sessions) {
      const dateKey = String(session.session_date).slice(0, 10);
      const sessionKey = session.session_hour_id ? `sh_${session.session_hour_id}` : `s_${session.id}`;

      for (const record of (session.records || [])) {
        const studentIdKey = String(record.student_id);
        if (!attendanceMap[studentIdKey]) {
          attendanceMap[studentIdKey] = {};
        }
        if (!attendanceMap[studentIdKey][dateKey]) {
          attendanceMap[studentIdKey][dateKey] = {};
        }
        attendanceMap[studentIdKey][dateKey][sessionKey] = record.status;
      }
    }

    return students.map((student) => {
      const sid = String(student.id);
      const studentDateMap = attendanceMap[sid] || {};

      const dailySummary = monthDays.map((date) => {
        const dayRecords = studentDateMap[date] || {};
        const attendedSessions = [];
        const missedSessions = [];

        for (const expected of expectedSessionPool) {
          const status = dayRecords[expected.key];
          if (status === 'P') {
            attendedSessions.push(expected.label);
          } else {
            missedSessions.push({
              sessionHourId: expected.sessionHourId,
              sessionLabel: expected.label,
              status: status || 'NOT_MARKED'
            });
          }
        }

        const expectedCount = expectedSessionPool.length;
        const attendedCount = attendedSessions.length;
        let status = 'none';

        if (expectedCount > 0) {
          if (attendedCount === expectedCount) {
            status = 'full';
          } else if (attendedCount > 0) {
            status = 'partial';
          } else {
            status = 'none';
          }
        }

        return {
          date,
          expectedSessions: expectedCount,
          attendedSessions: attendedCount,
          missedSessions: expectedCount - attendedCount,
          status,
          missedSessionDetails: missedSessions
        };
      });

      const latestStatus = dailySummary.find((item) => item.attendedSessions > 0 || item.missedSessions > 0)?.status;

      return {
        id: sid,
        name: `${student.person?.first_name || ''} ${student.person?.last_name || ''}`.trim(),
        roll: student.roll_number || '—',
        attendance: latestStatus === 'full' ? 'P' : latestStatus === 'partial' ? 'L' : 'A',
        dailySummary,
        sessionCatalog: expectedSessionPool.map((item) => ({
          id: item.sessionHourId,
          label: item.label
        }))
      };
    });
  }

  /**
   * Save attendance records for a batch of students.
   */
  async saveAttendance({ classId, sectionId, sessionHourId, schoolId, createdBy, students: studentRecords, date }) {
    const sessionDate = date || new Date().toISOString().slice(0, 10);

    const session = await this.findOrCreateSession({
      classId,
      sectionId,
      sessionHourId,
      sessionDate,
      schoolId,
      createdBy
    });

    const upsertData = studentRecords
      .filter(s => s.attendance)
      .map(s => ({
        session_id: session.id,
        student_id: parseInt(s.id, 10),
        status: s.attendance
      }));

    // Upsert each record
    for (const record of upsertData) {
      await AttendanceRecord.upsert(record, {
        conflictFields: ['session_id', 'student_id']
      });
    }

    return { sessionId: session.id, count: upsertData.length };
  }

  /**
   * Find student by user ID (User -> Person -> Student chain).
   */
  async findStudentByUserId(userId) {
    const person = await Person.findOne({
      where: { user_id: userId },
      include: [{
        model: Student,
        as: 'student',
        required: true,
        include: [
          { model: Class, as: 'class', attributes: ['id', 'name'] },
          { model: Section, as: 'section', attributes: ['id', 'name'] }
        ]
      }]
    });
    return person?.student || null;
  }
}

module.exports = new AttendanceRepository();
