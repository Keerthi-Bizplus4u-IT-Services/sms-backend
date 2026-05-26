/**
 * Seed: Assignments
 * Creates deterministic demo assignments plus per-student submission rows so
 * teacher, student, and parent assignment views have meaningful data.
 */
const { AcademicYear, Assignment, AssignmentSubmission, Person, Student, Subject, Teacher } = require('../../src/models');

const ASSIGNMENT_BLUEPRINTS = [
  {
    dayLabel: 'Daily Homework Batch 1',
    titleSuffix: 'Practice Set',
    description: 'Complete the guided practice questions and revise the key concepts discussed in class.',
    assignment_type: 'homework',
    max_marks: 20,
    weightage_percentage: 10,
    assigned_offset_days: -2,
    due_offset_days: -1,
    allow_late_submission: true,
    late_submission_penalty_percent: 5,
    attachmentSlug: 'practice-set',
    instructions: 'Write all answers neatly in your classwork notebook and submit before assembly.',
  },
  {
    dayLabel: 'Daily Homework Batch 2',
    titleSuffix: 'Worksheet Review',
    description: 'Read the chapter summary and answer the worksheet attached to reinforce classroom learning.',
    assignment_type: 'worksheet',
    max_marks: 15,
    weightage_percentage: 5,
    assigned_offset_days: -1,
    due_offset_days: 0,
    allow_late_submission: false,
    late_submission_penalty_percent: 0,
    attachmentSlug: 'worksheet-review',
    instructions: 'Attempt every question. Underline the final answers and bring the sheet signed by a parent.',
  },
  {
    dayLabel: 'Daily Homework Batch 3',
    titleSuffix: 'Mini Project',
    description: 'Prepare a short project artifact that demonstrates concept application using examples from daily life.',
    assignment_type: 'project',
    max_marks: 25,
    weightage_percentage: 15,
    assigned_offset_days: 0,
    due_offset_days: 1,
    allow_late_submission: true,
    late_submission_penalty_percent: 10,
    attachmentSlug: 'mini-project',
    instructions: 'Submit the project sheet with diagrams and a one paragraph summary on the final page.',
  },
];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toDateOnly = (value) => new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);

const addDays = (value, days) => {
  const result = new Date(value.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const formatDateOnly = (value) => value.toISOString().slice(0, 10);

const buildSubmissionSeed = ({ assignment, student, index, teacherUserId }) => {
  const dueDate = toDateOnly(assignment.due_date);
  const statusCycle = ['graded', 'submitted', 'pending', 'missing', 'resubmit_required'];
  const status = statusCycle[index % statusCycle.length];

  const submission = {
    assignment_id: assignment.id,
    student_id: student.id,
    status,
    version: status === 'resubmit_required' ? 2 : 1,
    is_late: false,
    submission_date: addDays(dueDate, -1),
    submission_text: null,
    submission_file_name: null,
    submission_url: null,
    marks_obtained: null,
    feedback: null,
    grade: null,
    graded_by: null,
    graded_at: null,
  };

  if (status === 'submitted') {
    submission.submission_text = `Completed and submitted by ${student.person?.first_name || 'student'}.`;
    return submission;
  }

  if (status === 'graded') {
    const maxMarks = Number(assignment.max_marks || 0);
    const marks = Math.max(0, maxMarks - ((index % 4) + 1));
    submission.submission_text = `Finished all tasks for ${assignment.title}.`;
    submission.marks_obtained = marks;
    submission.feedback = 'Good work. Revise the final step for full accuracy.';
    submission.grade = marks >= maxMarks * 0.85 ? 'A' : 'B';
    submission.graded_by = teacherUserId || null;
    submission.graded_at = addDays(dueDate, 1);
    return submission;
  }

  if (status === 'resubmit_required') {
    submission.submission_date = addDays(dueDate, 1);
    submission.submission_text = `Initial submission uploaded by ${student.person?.first_name || 'student'}.`;
    submission.is_late = true;
    submission.feedback = 'Please correct the incomplete answers and resubmit.';
    submission.graded_by = teacherUserId || null;
    submission.graded_at = addDays(dueDate, 2);
    return submission;
  }

  if (status === 'missing') {
    submission.submission_date = addDays(dueDate, 2);
    submission.is_late = true;
  }

  return submission;
};

async function seed() {
  const currentAcademicYears = await AcademicYear.findAll({
    where: { is_current: true },
    order: [['school_id', 'ASC'], ['id', 'ASC']],
  });
  if (!currentAcademicYears.length) {
    throw new Error('No current academic year found');
  }

  const currentAcademicYearBySchool = currentAcademicYears.reduce((map, academicYear) => {
    map.set(Number(academicYear.school_id), academicYear);
    return map;
  }, new Map());
  const fallbackAcademicYear = currentAcademicYears[0];

  const teachers = await Teacher.findAll({
    include: [{ model: Person, as: 'person', attributes: ['id', 'user_id', 'first_name', 'last_name'] }],
    order: [['school_id', 'ASC'], ['id', 'ASC']],
  });
  const subjects = await Subject.findAll({
    order: [['school_id', 'ASC'], ['id', 'ASC']],
  });
  const students = await Student.findAll({
    include: [{ model: Person, as: 'person', attributes: ['id', 'user_id', 'first_name', 'last_name'] }],
    order: [['school_id', 'ASC'], ['class_id', 'ASC'], ['section_id', 'ASC'], ['id', 'ASC']],
  });

  const teachersBySchool = teachers.reduce((map, teacher) => {
    const key = Number(teacher.school_id);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(teacher);
    return map;
  }, new Map());

  const subjectsBySchool = subjects.reduce((map, subject) => {
    const key = Number(subject.school_id);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(subject);
    return map;
  }, new Map());

  const studentGroups = students.reduce((map, student) => {
    const key = `${student.school_id}:${student.class_id}:${student.section_id}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(student);
    return map;
  }, new Map());

  let assignmentsCreated = 0;
  let submissionsCreated = 0;

  const groups = Array.from(studentGroups.entries()).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  for (const [groupIndex, [groupKey, groupStudents]] of groups.entries()) {
    if (!groupStudents.length) {
      continue;
    }

    const [schoolIdText, classIdText, sectionIdText] = groupKey.split(':');
    const schoolId = Number(schoolIdText);
    const classId = Number(classIdText);
    const sectionId = Number(sectionIdText);
    const academicYear = currentAcademicYearBySchool.get(schoolId) || fallbackAcademicYear;
    const schoolTeachers = teachersBySchool.get(schoolId) || [];
    const schoolSubjects = subjectsBySchool.get(schoolId) || [];

    if (!academicYear || !schoolTeachers.length || !schoolSubjects.length) {
      continue;
    }

    const academicEndDate = toDateOnly(academicYear.end_date);

    for (const [blueprintIndex, blueprint] of ASSIGNMENT_BLUEPRINTS.entries()) {
      const assignedDate = addDays(academicEndDate, blueprint.assigned_offset_days);
      const dueDate = addDays(academicEndDate, blueprint.due_offset_days);
      const dateStamp = formatDateOnly(assignedDate);

      for (const [subjectIndex, subject] of schoolSubjects.entries()) {
        const teacher = schoolTeachers[(groupIndex + blueprintIndex + subjectIndex) % schoolTeachers.length];
        const title = `${subject.name} ${blueprint.titleSuffix} ${dateStamp}`;

        const [assignment, created] = await Assignment.findOrCreate({
          where: {
            academic_year_id: academicYear.id,
            class_id: classId,
            section_id: sectionId,
            subject_id: subject.id,
            teacher_id: teacher.id,
            title,
          },
          defaults: {
            academic_year_id: academicYear.id,
            class_id: classId,
            section_id: sectionId,
            subject_id: subject.id,
            teacher_id: teacher.id,
            title,
            description: `${blueprint.dayLabel}: ${blueprint.description}`,
            assignment_type: blueprint.assignment_type,
            max_marks: blueprint.max_marks,
            weightage_percentage: blueprint.weightage_percentage,
            assigned_date: dateStamp,
            due_date: formatDateOnly(dueDate),
            allow_late_submission: blueprint.allow_late_submission,
            late_submission_penalty_percent: blueprint.late_submission_penalty_percent,
            attachment_url: `https://demo.sms.local/assignments/${subject.code || subject.id}/${blueprint.attachmentSlug}-${dateStamp}.pdf`,
            instructions: `${blueprint.dayLabel}: ${blueprint.instructions}`,
            is_active: true,
          },
        });

        if (created) {
          assignmentsCreated += 1;
        }

        for (const [studentIndex, student] of groupStudents.entries()) {
          const submissionSeed = buildSubmissionSeed({
            assignment,
            student,
            index: studentIndex + blueprintIndex + subjectIndex,
            teacherUserId: teacher.person?.user_id,
          });

          const [, submissionCreated] = await AssignmentSubmission.findOrCreate({
            where: {
              assignment_id: assignment.id,
              student_id: student.id,
            },
            defaults: submissionSeed,
          });

          if (submissionCreated) {
            submissionsCreated += 1;
          }
        }
      }
    }
  }

  console.log(`   Seeded ${assignmentsCreated} assignments and ${submissionsCreated} assignment submissions`);
}

module.exports = seed;