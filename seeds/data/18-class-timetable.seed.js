/**
 * Seed: Class Timetable
 * Creates deterministic weekday schedules for existing class-section combinations.
 */
const {
  AcademicYear,
  Class,
  Section,
  Subject,
  Teacher,
  SchoolBranch,
  TimetablePeriod,
  ClassTimetable
} = require('../../src/models');

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const SUBJECT_CODES_BY_GRADE = {
  junior: ['ENG', 'MATH', 'SCI', 'SOC', 'HIN', 'ART', 'PE'],
  middle: ['ENG', 'MATH', 'SCI', 'SOC', 'HIN', 'CS', 'PE'],
  senior: ['ENG', 'MATH', 'PHY', 'CHE', 'BIO', 'CS', 'SOC']
};

function resolveSubjectCodes(numericGrade) {
  if (numericGrade >= 9) {
    return SUBJECT_CODES_BY_GRADE.senior;
  }

  if (numericGrade >= 6) {
    return SUBJECT_CODES_BY_GRADE.middle;
  }

  return SUBJECT_CODES_BY_GRADE.junior;
}

async function seed() {
  const classes = await Class.findAll({
    include: [
      { model: Section, as: 'sections' },
      { model: SchoolBranch, as: 'branch' },
      { model: AcademicYear, as: 'academicYear' }
    ],
    order: [
      ['id', 'ASC'],
      [{ model: Section, as: 'sections' }, 'id', 'ASC']
    ]
  });

  let total = 0;

  for (const classRecord of classes) {
    if (!classRecord.academic_year_id || !classRecord.branch?.school_id) {
      continue;
    }

    const periods = await TimetablePeriod.findAll({
      where: {
        academic_year_id: classRecord.academic_year_id,
        is_active: true,
        is_break: false
      },
      order: [['display_order', 'ASC'], ['period_number', 'ASC']]
    });

    if (periods.length === 0) {
      continue;
    }

    const subjectCodes = resolveSubjectCodes(classRecord.numeric_grade || 1);
    const subjects = await Subject.findAll({
      where: {
        school_id: classRecord.branch.school_id,
        code: subjectCodes.map((code) => `${code}-${classRecord.branch.school_id}`)
      },
      order: [['id', 'ASC']]
    });

    const teachers = await Teacher.findAll({
      where: {
        school_id: classRecord.branch.school_id,
        status: 'active'
      },
      order: [['id', 'ASC']]
    });

    if (subjects.length === 0 || teachers.length === 0 || !classRecord.sections?.length) {
      continue;
    }

    for (const section of classRecord.sections) {
      for (let dayIndex = 0; dayIndex < DAYS.length; dayIndex++) {
        for (let periodIndex = 0; periodIndex < periods.length; periodIndex++) {
          const period = periods[periodIndex];
          const subject = subjects[(periodIndex + dayIndex) % subjects.length];
          const teacher = teachers[(periodIndex + dayIndex + section.id) % teachers.length];

          await ClassTimetable.findOrCreate({
            where: {
              class_id: classRecord.id,
              section_id: section.id,
              day_of_week: DAYS[dayIndex],
              period_id: period.id,
              is_active: true
            },
            defaults: {
              academic_year_id: classRecord.academic_year_id,
              class_id: classRecord.id,
              section_id: section.id,
              day_of_week: DAYS[dayIndex],
              period_id: period.id,
              subject_id: subject.id,
              teacher_id: teacher.id,
              room_number: section.room_number || null,
              is_practical: false,
              is_active: true,
              effective_from: classRecord.academicYear?.start_date || null,
              effective_to: null
            }
          });
          total++;
        }
      }
    }
  }

  console.log(`   Seeded ${total} class timetable entries`);
}

module.exports = seed;