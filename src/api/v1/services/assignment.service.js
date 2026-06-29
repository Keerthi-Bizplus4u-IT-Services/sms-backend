const assignmentRepository = require('../repositories/assignment.repository');
const { AppError } = require('../../../middleware/error.middleware');

const TEACHER_ROLES = new Set(['teacher']);
const PARENT_ROLES = new Set(['parent']);
const STUDENT_ROLES = new Set(['student']);

const normalizeRoleName = (roleName) => {
  if (!roleName || typeof roleName !== 'string') {
    return '';
  }

  return roleName.trim().toLowerCase();
};

const toPlain = (record) => (record && typeof record.toJSON === 'function' ? record.toJSON() : record);
const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapTeacher = (teacher) => {
  if (!teacher) {
    return null;
  }

  const person = teacher.person || {};
  return {
    id: teacher.id,
    employee_id: teacher.employee_id || null,
    first_name: person.first_name || '',
    last_name: person.last_name || ''
  };
};

const mapSubmission = (submission) => {
  if (!submission) {
    return null;
  }

  const plain = toPlain(submission);
  const student = plain.student || {};
  const person = student.person || {};

  return {
    id: plain.id,
    assignment_id: plain.assignment_id,
    student_id: plain.student_id,
    submission_date: plain.submission_date,
    submission_url: plain.submission_url,
    submission_text: plain.submission_text,
    submission_file_name: plain.submission_file_name,
    is_late: Boolean(plain.is_late),
    marks_obtained: toNumberOrNull(plain.marks_obtained),
    feedback: plain.feedback || null,
    grade: plain.grade || null,
    status: plain.status,
    graded_by: plain.graded_by || null,
    graded_at: plain.graded_at || null,
    version: plain.version,
    student: plain.student
      ? {
          id: student.id,
          roll_number: student.roll_number || null,
          first_name: person.first_name || '',
          last_name: person.last_name || ''
        }
      : null
  };
};

const buildSummaryMap = (rows) => {
  const map = new Map();

  rows.forEach((row) => {
    const assignmentId = Number(row.assignment_id);
    if (!map.has(assignmentId)) {
      map.set(assignmentId, {
        total_students: 0,
        pending: 0,
        submitted: 0,
        graded: 0,
        resubmit_required: 0,
        missing: 0
      });
    }

    const summary = map.get(assignmentId);
    const count = Number(row.count) || 0;
    summary.total_students += count;
    if (row.status in summary) {
      summary[row.status] += count;
    }
  });

  return map;
};

const mapAssignment = (assignment, extras = {}) => {
  const plain = toPlain(assignment);
  return {
    id: plain.id,
    academic_year_id: plain.academic_year_id,
    class_id: plain.class_id,
    section_id: plain.section_id,
    subject_id: plain.subject_id,
    teacher_id: plain.teacher_id,
    title: plain.title,
    description: plain.description || '',
    assignment_type: plain.assignment_type,
    max_marks: toNumberOrNull(plain.max_marks),
    weightage_percentage: toNumberOrNull(plain.weightage_percentage),
    assigned_date: plain.assigned_date,
    due_date: plain.due_date,
    allow_late_submission: Boolean(plain.allow_late_submission),
    late_submission_penalty_percent: toNumberOrNull(plain.late_submission_penalty_percent),
    attachment_url: plain.attachment_url || null,
    instructions: plain.instructions || '',
    is_active: Boolean(plain.is_active),
    created_at: plain.created_at,
    updated_at: plain.updated_at,
    academic_year: plain.academicYear
      ? {
          id: plain.academicYear.id,
          name: plain.academicYear.name,
          is_current: Boolean(plain.academicYear.is_current)
        }
      : null,
    class: plain.class
      ? {
          id: plain.class.id,
          name: plain.class.name,
          numeric_grade: plain.class.numeric_grade
        }
      : null,
    section: plain.section
      ? {
          id: plain.section.id,
          name: plain.section.name
        }
      : null,
    subject: plain.subject
      ? {
          id: plain.subject.id,
          name: plain.subject.name,
          code: plain.subject.code || null
        }
      : null,
    teacher: mapTeacher(plain.teacher),
    submission_summary: extras.submission_summary || null,
    submission: extras.submission || null,
    children: extras.children || null
  };
};

const defaultSubmissionSummary = () => ({
  total_students: 0,
  pending: 0,
  submitted: 0,
  graded: 0,
  resubmit_required: 0,
  missing: 0
});

const assertTeacherOwnsAssignment = async ({ assignmentId, schoolId, userId }) => {
  const teacher = await assignmentRepository.findTeacherByUserId(userId, schoolId);
  if (!teacher) {
    throw new AppError('Teacher profile not found', 404);
  }

  const assignment = await assignmentRepository.findAssignmentById(assignmentId, schoolId);
  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }

  if (Number(teacher.id) !== Number(assignment.teacher_id)) {
    throw new AppError('You do not have permission to modify this assignment', 403);
  }

  return { teacher, assignment };
};

class AssignmentService {
  async createAssignment(payload) {
    const schoolId = Number(payload.schoolId);
    if (!schoolId) {
      throw new AppError('School context is required', 400);
    }

    const teacher = await assignmentRepository.findTeacherByUserId(payload.userId, schoolId);
    if (!teacher) {
      throw new AppError('Teacher profile not found', 404);
    }

    const [currentAcademicYear, targetClass, targetSection, targetSubject] = await Promise.all([
      assignmentRepository.findCurrentAcademicYear(schoolId),
      assignmentRepository.findClassForSchool(payload.class_id, schoolId),
      assignmentRepository.findSectionForClass(payload.section_id, payload.class_id),
      assignmentRepository.findSubjectForSchool(payload.subject_id, schoolId)
    ]);

    if (!currentAcademicYear) {
      throw new AppError('Current academic year is not configured', 404);
    }
    if (!targetClass) {
      throw new AppError('Class not found for the current school', 404);
    }
    if (!targetSection) {
      throw new AppError('Section not found for the selected class', 404);
    }
    if (!targetSubject) {
      throw new AppError('Subject not found for the current school', 404);
    }

    const assignedDate = payload.assigned_date || new Date().toISOString().slice(0, 10);
    if (payload.due_date < assignedDate) {
      throw new AppError('Due date cannot be earlier than assigned date', 400);
    }

    const assignment = await assignmentRepository.createAssignment({
      schoolId,
      academic_year_id: currentAcademicYear.id,
      class_id: payload.class_id,
      section_id: payload.section_id,
      subject_id: payload.subject_id,
      teacher_id: teacher.id,
      title: payload.title,
      description: payload.description || null,
      assignment_type: payload.assignment_type || 'homework',
      max_marks: payload.max_marks ?? 0,
      weightage_percentage: payload.weightage_percentage ?? 0,
      assigned_date: assignedDate,
      due_date: payload.due_date,
      allow_late_submission: Boolean(payload.allow_late_submission),
      late_submission_penalty_percent: payload.late_submission_penalty_percent ?? 0,
      attachment_url: payload.attachment_url || null,
      instructions: payload.instructions || null,
      is_active: true
    });

    const createdAssignment = await assignmentRepository.findAssignmentById(assignment.id, schoolId);
    const studentCount = await assignmentRepository.countStudentsForAssignment(assignment.id);

    return mapAssignment(createdAssignment || assignment, {
      submission_summary: {
        ...defaultSubmissionSummary(),
        total_students: studentCount,
        pending: studentCount
      }
    });
  }

  async updateAssignment(payload) {
    const schoolId = Number(payload.schoolId);
    if (!schoolId) {
      throw new AppError('School context is required', 400);
    }

    const { assignment } = await assertTeacherOwnsAssignment({
      assignmentId: payload.id,
      schoolId,
      userId: payload.userId
    });

    const nextClassId = payload.class_id || assignment.class_id;
    const nextSectionId = payload.section_id || assignment.section_id;
    const nextSubjectId = payload.subject_id || assignment.subject_id;
    const assignedDate = payload.assigned_date || assignment.assigned_date;
    const dueDate = payload.due_date || assignment.due_date;

    const [targetClass, targetSection, targetSubject] = await Promise.all([
      assignmentRepository.findClassForSchool(nextClassId, schoolId),
      assignmentRepository.findSectionForClass(nextSectionId, nextClassId),
      assignmentRepository.findSubjectForSchool(nextSubjectId, schoolId)
    ]);

    if (!targetClass) {
      throw new AppError('Class not found for the current school', 404);
    }
    if (!targetSection) {
      throw new AppError('Section not found for the selected class', 404);
    }
    if (!targetSubject) {
      throw new AppError('Subject not found for the current school', 404);
    }
    if (String(dueDate) < String(assignedDate)) {
      throw new AppError('Due date cannot be earlier than assigned date', 400);
    }

    await assignmentRepository.updateAssignment(payload.id, {
      class_id: nextClassId,
      section_id: nextSectionId,
      subject_id: nextSubjectId,
      title: payload.title ?? assignment.title,
      description: payload.description ?? assignment.description,
      assignment_type: payload.assignment_type ?? assignment.assignment_type,
      max_marks: payload.max_marks ?? assignment.max_marks,
      weightage_percentage: payload.weightage_percentage ?? assignment.weightage_percentage,
      assigned_date: assignedDate,
      due_date: dueDate,
      allow_late_submission:
        typeof payload.allow_late_submission === 'boolean' ? payload.allow_late_submission : Boolean(assignment.allow_late_submission),
      late_submission_penalty_percent:
        payload.late_submission_penalty_percent ?? assignment.late_submission_penalty_percent,
      attachment_url: payload.attachment_url ?? assignment.attachment_url,
      instructions: payload.instructions ?? assignment.instructions
    }, schoolId);

    return this.getAssignmentById({
      id: payload.id,
      schoolId,
      userId: payload.userId,
      roleName: 'teacher'
    });
  }

  async deleteAssignment({ id, schoolId, userId }) {
    const numericSchoolId = Number(schoolId);
    if (!numericSchoolId) {
      throw new AppError('School context is required', 400);
    }

    await assertTeacherOwnsAssignment({
      assignmentId: id,
      schoolId: numericSchoolId,
      userId
    });

    await assignmentRepository.softDeleteAssignment(id, numericSchoolId);

    return { id: Number(id), deleted: true };
  }

  async listAssignments({ schoolId, userId, roleName, page, limit, class_id, section_id }) {
    const normalizedRole = normalizeRoleName(roleName);

    if (TEACHER_ROLES.has(normalizedRole)) {
      const teacher = await assignmentRepository.findTeacherByUserId(userId, schoolId);
      if (!teacher) {
        throw new AppError('Teacher profile not found', 404);
      }

      const result = await assignmentRepository.listTeacherAssignments({
        teacherId: teacher.id,
        schoolId,
        page,
        limit,
        classId: class_id,
        sectionId: section_id
      });
      const summaryMap = buildSummaryMap(await assignmentRepository.findSubmissionSummaryByAssignmentIds(result.assignments.map((item) => item.id)));

      return {
        assignments: result.assignments.map((assignment) => mapAssignment(assignment, {
          submission_summary: summaryMap.get(Number(assignment.id)) || defaultSubmissionSummary()
        })),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      };
    }

    if (STUDENT_ROLES.has(normalizedRole)) {
      const student = await assignmentRepository.findStudentByUserId(userId, schoolId);
      if (!student) {
        throw new AppError('Student profile not found', 404);
      }

      const result = await assignmentRepository.listAssignmentsForClassSections({
        schoolId,
        classSections: [{ class_id: student.class_id, section_id: student.section_id }],
        page,
        limit
      });
      const submissionRows = await assignmentRepository.findSubmissionsForStudents({
        assignmentIds: result.assignments.map((item) => item.id),
        studentIds: [student.id]
      });
      const submissionMap = new Map(submissionRows.map((item) => [Number(item.assignment_id), mapSubmission(item)]));

      return {
        assignments: result.assignments.map((assignment) => mapAssignment(assignment, {
          submission: submissionMap.get(Number(assignment.id)) || null
        })),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      };
    }

    if (PARENT_ROLES.has(normalizedRole)) {
      const { children } = await assignmentRepository.findParentChildrenByUserId(userId, schoolId);
      if (!children.length) {
        return {
          children: [],
          total: 0,
          page: Math.max(1, parseInt(page, 10) || 1),
          limit: Math.max(1, Math.min(parseInt(limit, 10) || 10, 50)),
          totalPages: 0
        };
      }

      const classSections = Array.from(
        new Map(
          children.map((student) => [`${student.class_id}:${student.section_id}`, { class_id: student.class_id, section_id: student.section_id }])
        ).values()
      );

      const result = await assignmentRepository.listAssignmentsForClassSections({
        schoolId,
        classSections,
        page,
        limit
      });
      const submissionRows = await assignmentRepository.findSubmissionsForStudents({
        assignmentIds: result.assignments.map((item) => item.id),
        studentIds: children.map((student) => student.id)
      });
      const submissionMap = new Map(
        submissionRows.map((submission) => [`${submission.assignment_id}:${submission.student_id}`, mapSubmission(submission)])
      );

      const groupedChildren = children.map((student) => {
        const studentPlain = toPlain(student);
        const fullName = [studentPlain.person?.first_name, studentPlain.person?.last_name].filter(Boolean).join(' ').trim();
        const assignments = result.assignments
          .filter((assignment) => Number(assignment.class_id) === Number(studentPlain.class_id) && Number(assignment.section_id) === Number(studentPlain.section_id))
          .map((assignment) => mapAssignment(assignment, {
            submission: submissionMap.get(`${assignment.id}:${studentPlain.id}`) || null
          }));

        return {
          student_id: studentPlain.id,
          full_name: fullName || `Student ${studentPlain.id}`,
          roll_number: studentPlain.roll_number || null,
          class: studentPlain.class ? { id: studentPlain.class.id, name: studentPlain.class.name } : null,
          section: studentPlain.section ? { id: studentPlain.section.id, name: studentPlain.section.name } : null,
          assignments
        };
      });

      return {
        children: groupedChildren,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      };
    }

    const result = await assignmentRepository.listSchoolAssignments({
      schoolId,
      page,
      limit,
      classId: class_id,
      sectionId: section_id
    });
    const summaryMap = buildSummaryMap(await assignmentRepository.findSubmissionSummaryByAssignmentIds(result.assignments.map((item) => item.id)));

    return {
      assignments: result.assignments.map((assignment) => mapAssignment(assignment, {
        submission_summary: summaryMap.get(Number(assignment.id)) || defaultSubmissionSummary()
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    };
  }

  async getAssignmentById({ id, schoolId, userId, roleName }) {
    const normalizedRole = normalizeRoleName(roleName);
    const assignment = await assignmentRepository.findAssignmentById(id, schoolId);

    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }

    if (TEACHER_ROLES.has(normalizedRole)) {
      const teacher = await assignmentRepository.findTeacherByUserId(userId, schoolId);
      if (!teacher || Number(teacher.id) !== Number(assignment.teacher_id)) {
        throw new AppError('You do not have permission to access this assignment', 403);
      }

      const summaryMap = buildSummaryMap(await assignmentRepository.findSubmissionSummaryByAssignmentIds([assignment.id]));
      return mapAssignment(assignment, {
        submission_summary: summaryMap.get(Number(assignment.id)) || defaultSubmissionSummary()
      });
    }

    if (STUDENT_ROLES.has(normalizedRole)) {
      const student = await assignmentRepository.findStudentByUserId(userId, schoolId);
      if (!student) {
        throw new AppError('Student profile not found', 404);
      }

      if (Number(student.class_id) !== Number(assignment.class_id) || Number(student.section_id) !== Number(assignment.section_id)) {
        throw new AppError('You do not have permission to access this assignment', 403);
      }

      const submissions = await assignmentRepository.findSubmissionsForStudents({
        assignmentIds: [assignment.id],
        studentIds: [student.id]
      });

      return mapAssignment(assignment, {
        submission: submissions[0] ? mapSubmission(submissions[0]) : null
      });
    }

    if (PARENT_ROLES.has(normalizedRole)) {
      const { children } = await assignmentRepository.findParentChildrenByUserId(userId, schoolId);
      if (!children.length) {
        throw new AppError('No linked students found for this parent', 404);
      }

      const matchedChildren = children.filter((student) => Number(student.class_id) === Number(assignment.class_id) && Number(student.section_id) === Number(assignment.section_id));
      if (!matchedChildren.length) {
        throw new AppError('You do not have permission to access this assignment', 403);
      }

      const submissions = await assignmentRepository.findSubmissionsForStudents({
        assignmentIds: [assignment.id],
        studentIds: matchedChildren.map((student) => student.id)
      });
      const submissionMap = new Map(submissions.map((submission) => [Number(submission.student_id), mapSubmission(submission)]));

      return mapAssignment(assignment, {
        children: matchedChildren.map((student) => {
          const plain = toPlain(student);
          return {
            student_id: plain.id,
            full_name: [plain.person?.first_name, plain.person?.last_name].filter(Boolean).join(' ').trim() || `Student ${plain.id}`,
            roll_number: plain.roll_number || null,
            submission: submissionMap.get(Number(plain.id)) || null
          };
        })
      });
    }

    const summaryMap = buildSummaryMap(await assignmentRepository.findSubmissionSummaryByAssignmentIds([assignment.id]));
    return mapAssignment(assignment, {
      submission_summary: summaryMap.get(Number(assignment.id)) || defaultSubmissionSummary()
    });
  }
}

module.exports = new AssignmentService();