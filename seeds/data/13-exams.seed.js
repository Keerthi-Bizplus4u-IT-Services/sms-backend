/**
 * Seed: Exams, Exam Schedules & Student Marks
 * Creates exam definitions, schedules, and marks for demo students.
 */
const {
  sequelize, AcademicYear, Exam, ExamSchedule, StudentMark,
  Student, Class, Subject, School, SchoolBranch, User, Role
} = require('../../src/models');

const EXAM_DEFS = [
  {
    name: 'Unit Test 1',
    exam_type: 'unit_test',
    start_date: '2025-07-15',
    end_date: '2025-07-20',
    result_date: '2025-07-28',
    applicableGrades: [5, 6, 7, 8, 9, 10],
    subjectPrefixes: ['MATH', 'ENG', 'SCI', 'SOC', 'HIN'],
    startTime: '09:00:00',
    endTime: '10:00:00',
    roomPrefix: 'UT1',
  },
  {
    name: 'Mid Term Exam',
    exam_type: 'mid_term',
    start_date: '2025-09-15',
    end_date: '2025-09-25',
    result_date: '2025-10-05',
    applicableGrades: [5, 6, 7, 8, 9, 10],
    subjectPrefixes: ['MATH', 'ENG', 'SCI', 'SOC', 'HIN', 'PHY', 'CHE', 'BIO'],
    startTime: '09:00:00',
    endTime: '12:00:00',
    roomPrefix: 'MID',
  },
  {
    name: 'Unit Test 2',
    exam_type: 'unit_test',
    start_date: '2025-11-10',
    end_date: '2025-11-15',
    result_date: '2025-11-22',
    applicableGrades: [5, 6, 7, 8, 9, 10],
    subjectPrefixes: ['MATH', 'ENG', 'SCI', 'SOC', 'HIN'],
    startTime: '11:00:00',
    endTime: '12:00:00',
    roomPrefix: 'UT2',
  },
  {
    name: 'Practical Assessment',
    exam_type: 'practical',
    start_date: '2026-01-12',
    end_date: '2026-01-18',
    result_date: '2026-01-25',
    applicableGrades: [8, 9, 10],
    subjectPrefixes: ['SCI', 'PHY', 'CHE', 'BIO', 'CS'],
    startTime: '13:30:00',
    endTime: '15:00:00',
    roomPrefix: 'LAB',
  },
  {
    name: 'Final Exam',
    exam_type: 'final',
    start_date: '2026-02-20',
    end_date: '2026-03-05',
    result_date: '2026-03-15',
    applicableGrades: [5, 6, 7, 8, 9, 10],
    subjectPrefixes: ['MATH', 'ENG', 'SCI', 'SOC', 'HIN', 'PHY', 'CHE', 'BIO', 'CS'],
    startTime: '09:00:00',
    endTime: '12:00:00',
    roomPrefix: 'FIN',
  },
];

const PRIMARY_SUBJECT_PREFIXES = ['MATH', 'ENG', 'SCI', 'SOC', 'HIN'];
const SENIOR_SUBJECT_PREFIXES = ['MATH', 'ENG', 'PHY', 'CHE', 'BIO', 'CS'];

const getSubjectPrefixesForGrade = (grade, examDef) => {
  const preferredPrefixes = grade >= 8 ? SENIOR_SUBJECT_PREFIXES : PRIMARY_SUBJECT_PREFIXES;
  const matchingPrefixes = examDef.subjectPrefixes.filter((prefix) =>
    preferredPrefixes.includes(prefix)
  );

  return matchingPrefixes.length > 0 ? matchingPrefixes : examDef.subjectPrefixes;
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

const getRoomNumber = (examDef, cls, subjectCode) => {
  const subjectSuffix = (subjectCode || 'GEN').split('-')[0].slice(0, 3);
  return `${examDef.roomPrefix}-${cls.numeric_grade}-${subjectSuffix}`;
};

const buildScheduleDate = (examDef, offsetDays) => {
  const examDate = new Date(`${examDef.start_date}T00:00:00Z`);
  examDate.setUTCDate(examDate.getUTCDate() + offsetDays);
  return examDate.toISOString().split('T')[0];
};

async function seed() {
  const currentAY = await AcademicYear.findOne({ where: { is_current: true } });
  if (!currentAY) throw new Error('No current academic year found');

  const schools = await School.findAll();
  let examCount = 0;
  let scheduleCount = 0;
  let markCount = 0;

  for (const school of schools) {
    const mainBranch = await SchoolBranch.findOne({
      where: { school_id: school.id, branch_type: 'main' }
    });
    if (!mainBranch) continue;

    const classes = await Class.findAll({
      where: {
        branch_id: mainBranch.id,
        academic_year_id: currentAY.id,
        numeric_grade: [5, 6, 7, 8, 9, 10],
      },
      order: [['numeric_grade', 'ASC'], ['name', 'ASC']],
    });

    const subjects = await Subject.findAll({
      where: { school_id: school.id },
      order: [['name', 'ASC']],
    });

    const adminRole = await Role.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('name')),
        'admin'
      )
    });
    const adminUser = adminRole
      ? await User.findOne({ where: { role_id: adminRole.id, school_id: school.id } })
      : null;

    // Create exams
    for (const examDef of EXAM_DEFS) {
      const [exam, examCreated] = await Exam.findOrCreate({
        where: {
          academic_year_id: currentAY.id,
          name: examDef.name,
        },
        defaults: {
          academic_year_id: currentAY.id,
          name: examDef.name,
          exam_type: examDef.exam_type,
          start_date: examDef.start_date,
          end_date: examDef.end_date,
          result_date: examDef.result_date,
        }
      });
      if (examCreated) {
        examCount++;
      }

      let examDay = 0;
      for (const cls of classes) {
        if (!examDef.applicableGrades.includes(cls.numeric_grade)) {
          continue;
        }

        const gradeSubjectPrefixes = getSubjectPrefixesForGrade(cls.numeric_grade, examDef);
        const selectedSubjects = subjects.filter((subject) =>
          gradeSubjectPrefixes.some((prefix) => (subject.code || '').startsWith(prefix))
        );

        for (const subj of selectedSubjects) {
          const dateStr = buildScheduleDate(examDef, examDay);

          const maxMarks = getMaxMarksForExamType(examDef.exam_type);
          const passingMarks = Math.round(maxMarks * 0.33);

          const [schedule, scheduleCreated] = await ExamSchedule.findOrCreate({
            where: {
              exam_id: exam.id,
              class_id: cls.id,
              subject_id: subj.id,
            },
            defaults: {
              exam_id: exam.id,
              class_id: cls.id,
              subject_id: subj.id,
              exam_date: dateStr,
              start_time: examDef.startTime,
              end_time: examDef.endTime,
              max_marks: maxMarks,
              passing_marks: passingMarks,
              room_number: getRoomNumber(examDef, cls, subj.code),
            }
          });
          if (scheduleCreated) {
            scheduleCount++;
          }
          examDay = (examDay + 1) % 6;

          // Create marks for students in this class (only for completed exams)
          if (examDef.result_date && new Date(examDef.result_date) < new Date()) {
            const students = await Student.findAll({
              where: { class_id: cls.id },
              limit: 5,
            });

            for (const student of students) {
              // Generate realistic marks (60-95% range)
              const marksObtained = Math.round(maxMarks * (0.6 + Math.random() * 0.35) * 100) / 100;

              const [, markCreated] = await StudentMark.findOrCreate({
                where: {
                  exam_schedule_id: schedule.id,
                  student_id: student.id,
                },
                defaults: {
                  exam_schedule_id: schedule.id,
                  student_id: student.id,
                  marks_obtained: marksObtained,
                  is_absent: false,
                  remarks: marksObtained >= maxMarks * 0.9 ? 'Excellent' :
                           marksObtained >= maxMarks * 0.75 ? 'Good' :
                           marksObtained >= maxMarks * 0.6 ? 'Average' : 'Needs improvement',
                  entered_by: adminUser ? adminUser.id : null,
                }
              });
              if (markCreated) {
                markCount++;
              }
            }
          }
        }
      }
    }
  }

  console.log(`   Seeded ${examCount} exams, ${scheduleCount} schedules, ${markCount} student marks`);
}

module.exports = seed;
