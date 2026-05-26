#!/usr/bin/env node

/**
 * Dummy attendance seed script
 *
 * Inserts deterministic month-wise attendance for one active student so
 * parent attendance calendar can be validated with real DB data.
 *
 * Usage:
 *   node scripts/seed-dummy-attendance.js
 *
 * Optional env overrides:
 *   ATTENDANCE_STUDENT_ID=123
 *   ATTENDANCE_STUDENT_ROLL=R-501
 *   ATTENDANCE_MONTH=1
 *   ATTENDANCE_YEAR=2026
 */

const { Op } = require('sequelize');
const {
  sequelize,
  Student,
  Person,
  User,
  SessionHour,
  AttendanceSession,
  AttendanceRecord
} = require('../src/models');

function pad(value) {
  return String(value).padStart(2, '0');
}

function toIsoDate(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function getSessionTimes(count) {
  const baseHour = 8;
  return Array.from({ length: count }, (_, index) => {
    const startHour = baseHour + index;
    const endHour = startHour + 1;
    return {
      label: `Period ${index + 1}`,
      start: `${pad(startHour)}:00:00`,
      end: `${pad(endHour)}:00:00`
    };
  });
}

async function findTargetStudent() {
  const studentId = Number(process.env.ATTENDANCE_STUDENT_ID || 0);
  const studentRoll = (process.env.ATTENDANCE_STUDENT_ROLL || '').trim();

  if (Number.isInteger(studentId) && studentId > 0) {
    return Student.findOne({
      where: { id: studentId, current_status: 'active' },
      include: [{ model: Person, as: 'person', attributes: ['first_name', 'last_name'] }]
    });
  }

  if (studentRoll) {
    return Student.findOne({
      where: { roll_number: studentRoll, current_status: 'active' },
      include: [{ model: Person, as: 'person', attributes: ['first_name', 'last_name'] }]
    });
  }

  return Student.findOne({
    where: { current_status: 'active' },
    include: [{ model: Person, as: 'person', attributes: ['first_name', 'last_name'] }],
    order: [['id', 'ASC']]
  });
}

async function getOrCreateSessionHours({ schoolId, classId, sectionId }) {
  const scopedQueries = [
    { school_id: schoolId, scope: 'SECTION', section_id: sectionId },
    { school_id: schoolId, scope: 'CLASS', class_id: classId },
    { school_id: schoolId, scope: 'SCHOOL' }
  ];

  for (const where of scopedQueries) {
    const rows = await SessionHour.findAll({
      where,
      order: [['start_time', 'ASC']]
    });
    if (rows.length > 0) {
      return rows;
    }
  }

  const times = getSessionTimes(10);
  const created = [];
  for (const [index, slot] of times.entries()) {
    const row = await SessionHour.create({
      school_id: schoolId,
      scope: 'SCHOOL',
      period_label: slot.label,
      start_time: slot.start,
      end_time: slot.end
    });
    created.push(row);
    if (index === times.length - 1) {
      // noop
    }
  }

  return created;
}

async function getCreatorUserId(schoolId) {
  const user = await User.findOne({
    where: {
      [Op.or]: [{ school_id: schoolId }, { school_id: null }],
      is_active: true
    },
    order: [['id', 'ASC']]
  });

  if (!user) {
    throw new Error('No active user found to set created_by for attendance sessions');
  }

  return user.id;
}

function resolveAttendanceCountForDay(day, expectedSessions) {
  const pattern = day % 5;
  if (pattern === 1 || pattern === 4) {
    return expectedSessions;
  }
  if (pattern === 2) {
    return Math.max(expectedSessions - 3, 1);
  }
  if (pattern === 3) {
    return Math.max(Math.floor(expectedSessions * 0.5), 1);
  }
  return 0;
}

async function upsertAttendanceForDay({ student, date, sessionHours, createdBy }) {
  const expectedSessions = sessionHours.length;
  const day = Number(date.slice(8, 10));
  const attendedSessions = resolveAttendanceCountForDay(day, expectedSessions);

  let sessionsTouched = 0;
  let recordsUpserted = 0;

  for (let index = 0; index < sessionHours.length; index += 1) {
    const sessionHour = sessionHours[index];
    const [session] = await AttendanceSession.findOrCreate({
      where: {
        class_id: student.class_id,
        section_id: student.section_id,
        session_hour_id: sessionHour.id,
        session_date: date,
        school_id: student.school_id
      },
      defaults: {
        created_by: createdBy
      }
    });

    sessionsTouched += 1;

    const status = index < attendedSessions ? 'P' : 'A';
    const existing = await AttendanceRecord.findOne({
      where: {
        session_id: session.id,
        student_id: student.id
      }
    });

    if (existing) {
      await existing.update({ status, remarks: 'Dummy attendance seed' });
    } else {
      await AttendanceRecord.create({
        session_id: session.id,
        student_id: student.id,
        status,
        remarks: 'Dummy attendance seed'
      });
    }

    recordsUpserted += 1;
  }

  return { sessionsTouched, recordsUpserted, attendedSessions, expectedSessions };
}

async function main() {
  const now = new Date();
  const month = Number(process.env.ATTENDANCE_MONTH || 1);
  const year = Number(process.env.ATTENDANCE_YEAR || now.getFullYear());

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('ATTENDANCE_MONTH must be between 1 and 12');
  }

  await sequelize.authenticate();

  const student = await findTargetStudent();
  if (!student) {
    throw new Error('No active student found for dummy attendance seed');
  }

  const sessionHours = await getOrCreateSessionHours({
    schoolId: student.school_id,
    classId: student.class_id,
    sectionId: student.section_id
  });

  const createdBy = await getCreatorUserId(student.school_id);
  const lastDate = new Date(year, month, 0).getDate();

  let totalSessionsTouched = 0;
  let totalRecordsUpserted = 0;
  let schoolDays = 0;

  for (let day = 1; day <= lastDate; day += 1) {
    const weekday = new Date(year, month - 1, day).getDay();
    if (weekday === 0) {
      continue;
    }

    const date = toIsoDate(year, month, day);
    const result = await upsertAttendanceForDay({
      student,
      date,
      sessionHours,
      createdBy
    });

    totalSessionsTouched += result.sessionsTouched;
    totalRecordsUpserted += result.recordsUpserted;
    schoolDays += 1;
  }

  const studentName = `${student.person?.first_name || ''} ${student.person?.last_name || ''}`.trim() || `Student ${student.id}`;
  console.log('Dummy attendance seeded successfully');
  console.log(`Student       : ${studentName} (id=${student.id}, roll=${student.roll_number || 'N/A'})`);
  console.log(`Class/Section : ${student.class_id}/${student.section_id}`);
  console.log(`Month/Year    : ${month}/${year}`);
  console.log(`Session Hours : ${sessionHours.length}`);
  console.log(`School Days   : ${schoolDays}`);
  console.log(`Sessions      : ${totalSessionsTouched}`);
  console.log(`Records       : ${totalRecordsUpserted}`);
}

main()
  .catch((error) => {
    console.error('Failed to seed dummy attendance:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch (error) {
      // ignore close errors
    }
  });
