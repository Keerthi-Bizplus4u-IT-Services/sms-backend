jest.mock('../../../../../src/api/v1/repositories/assignment.repository', () => ({
  findTeacherByUserId: jest.fn(),
  findStudentByUserId: jest.fn(),
  findParentChildrenByUserId: jest.fn(),
  findCurrentAcademicYear: jest.fn(),
  findClassForSchool: jest.fn(),
  findSectionForClass: jest.fn(),
  findSubjectForSchool: jest.fn(),
  createAssignment: jest.fn(),
  updateAssignment: jest.fn(),
  softDeleteAssignment: jest.fn(),
  findAssignmentById: jest.fn(),
  countStudentsForAssignment: jest.fn(),
  listTeacherAssignments: jest.fn(),
  listAssignmentsForClassSections: jest.fn(),
  listSchoolAssignments: jest.fn(),
  findSubmissionSummaryByAssignmentIds: jest.fn(),
  findSubmissionsForStudents: jest.fn()
}));

const assignmentRepository = require('../../../../../src/api/v1/repositories/assignment.repository');
const assignmentService = require('../../../../../src/api/v1/services/assignment.service');

describe('AssignmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a teacher assignment with seeded pending summary', async () => {
    assignmentRepository.findTeacherByUserId.mockResolvedValue({ id: 12 });
    assignmentRepository.findCurrentAcademicYear.mockResolvedValue({ id: 4 });
    assignmentRepository.findClassForSchool.mockResolvedValue({ id: 8 });
    assignmentRepository.findSectionForClass.mockResolvedValue({ id: 3 });
    assignmentRepository.findSubjectForSchool.mockResolvedValue({ id: 6 });
    assignmentRepository.createAssignment.mockResolvedValue({ id: 77 });
    assignmentRepository.findAssignmentById.mockResolvedValue({
      id: 77,
      academic_year_id: 4,
      class_id: 8,
      section_id: 3,
      subject_id: 6,
      teacher_id: 12,
      title: 'Math Practice',
      description: 'Solve ten problems',
      assignment_type: 'homework',
      max_marks: '20.00',
      weightage_percentage: '10.00',
      assigned_date: '2026-04-04',
      due_date: '2026-04-05',
      allow_late_submission: false,
      late_submission_penalty_percent: '0.00',
      attachment_url: null,
      instructions: 'Show your working',
      is_active: true,
      academicYear: { id: 4, name: '2026-2027', is_current: true },
      class: { id: 8, name: 'Grade 8', numeric_grade: 8 },
      section: { id: 3, name: 'A' },
      subject: { id: 6, name: 'Mathematics', code: 'MTH' },
      teacher: { id: 12, employee_id: 'EMP-12', person: { first_name: 'Jane', last_name: 'Doe' } }
    });
    assignmentRepository.countStudentsForAssignment.mockResolvedValue(24);

    const result = await assignmentService.createAssignment({
      schoolId: 2,
      userId: 17,
      class_id: 8,
      section_id: 3,
      subject_id: 6,
      title: 'Math Practice',
      description: 'Solve ten problems',
      due_date: '2026-04-05',
      instructions: 'Show your working'
    });

    expect(assignmentRepository.createAssignment).toHaveBeenCalledWith(expect.objectContaining({
      academic_year_id: 4,
      teacher_id: 12,
      class_id: 8,
      section_id: 3,
      subject_id: 6,
      title: 'Math Practice'
    }));
    expect(result.submission_summary).toEqual({
      total_students: 24,
      pending: 24,
      submitted: 0,
      graded: 0,
      resubmit_required: 0,
      missing: 0
    });
  });

  it('lists student assignments with the student submission attached', async () => {
    assignmentRepository.findStudentByUserId.mockResolvedValue({ id: 33, class_id: 8, section_id: 3 });
    assignmentRepository.listAssignmentsForClassSections.mockResolvedValue({
      assignments: [
        {
          id: 90,
          academic_year_id: 4,
          class_id: 8,
          section_id: 3,
          subject_id: 6,
          teacher_id: 12,
          title: 'Science Worksheet',
          description: 'Read chapter 4',
          assignment_type: 'worksheet',
          max_marks: '15.00',
          weightage_percentage: '0.00',
          assigned_date: '2026-04-04',
          due_date: '2026-04-06',
          allow_late_submission: true,
          late_submission_penalty_percent: '5.00',
          attachment_url: null,
          instructions: 'Answer all questions',
          is_active: true,
          academicYear: { id: 4, name: '2026-2027', is_current: true },
          class: { id: 8, name: 'Grade 8', numeric_grade: 8 },
          section: { id: 3, name: 'A' },
          subject: { id: 6, name: 'Science', code: 'SCI' },
          teacher: { id: 12, employee_id: 'EMP-12', person: { first_name: 'Jane', last_name: 'Doe' } }
        }
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    });
    assignmentRepository.findSubmissionsForStudents.mockResolvedValue([
      {
        id: 501,
        assignment_id: 90,
        student_id: 33,
        submission_date: '2026-04-04T08:00:00.000Z',
        status: 'pending',
        is_late: false,
        version: 1,
        student: { id: 33, roll_number: '18', person: { first_name: 'Alex', last_name: 'Stone' } }
      }
    ]);

    const result = await assignmentService.listAssignments({
      schoolId: 2,
      userId: 22,
      roleName: 'student',
      page: 1,
      limit: 10
    });

    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].submission).toEqual(expect.objectContaining({
      assignment_id: 90,
      student_id: 33,
      status: 'pending'
    }));
  });

  it('groups parent-visible assignments under each linked child', async () => {
    assignmentRepository.findParentChildrenByUserId.mockResolvedValue({
      children: [
        {
          id: 101,
          class_id: 8,
          section_id: 3,
          roll_number: '12',
          person: { first_name: 'Mia', last_name: 'Stone' },
          class: { id: 8, name: 'Grade 8' },
          section: { id: 3, name: 'A' }
        },
        {
          id: 102,
          class_id: 9,
          section_id: 1,
          roll_number: '7',
          person: { first_name: 'Noah', last_name: 'Stone' },
          class: { id: 9, name: 'Grade 9' },
          section: { id: 1, name: 'B' }
        }
      ]
    });
    assignmentRepository.listAssignmentsForClassSections.mockResolvedValue({
      assignments: [
        {
          id: 300,
          academic_year_id: 4,
          class_id: 8,
          section_id: 3,
          subject_id: 6,
          teacher_id: 12,
          title: 'Math Practice',
          description: '',
          assignment_type: 'homework',
          max_marks: '10.00',
          weightage_percentage: '0.00',
          assigned_date: '2026-04-04',
          due_date: '2026-04-05',
          allow_late_submission: false,
          late_submission_penalty_percent: '0.00',
          attachment_url: null,
          instructions: '',
          is_active: true,
          academicYear: { id: 4, name: '2026-2027', is_current: true },
          class: { id: 8, name: 'Grade 8', numeric_grade: 8 },
          section: { id: 3, name: 'A' },
          subject: { id: 6, name: 'Math', code: 'MTH' },
          teacher: { id: 12, employee_id: 'EMP-12', person: { first_name: 'Jane', last_name: 'Doe' } }
        },
        {
          id: 301,
          academic_year_id: 4,
          class_id: 9,
          section_id: 1,
          subject_id: 7,
          teacher_id: 15,
          title: 'History Notes',
          description: '',
          assignment_type: 'worksheet',
          max_marks: '10.00',
          weightage_percentage: '0.00',
          assigned_date: '2026-04-04',
          due_date: '2026-04-06',
          allow_late_submission: false,
          late_submission_penalty_percent: '0.00',
          attachment_url: null,
          instructions: '',
          is_active: true,
          academicYear: { id: 4, name: '2026-2027', is_current: true },
          class: { id: 9, name: 'Grade 9', numeric_grade: 9 },
          section: { id: 1, name: 'B' },
          subject: { id: 7, name: 'History', code: 'HIS' },
          teacher: { id: 15, employee_id: 'EMP-15', person: { first_name: 'John', last_name: 'Ray' } }
        }
      ],
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1
    });
    assignmentRepository.findSubmissionsForStudents.mockResolvedValue([
      { assignment_id: 300, student_id: 101, status: 'pending', is_late: false, version: 1, student: { id: 101, roll_number: '12', person: { first_name: 'Mia', last_name: 'Stone' } } },
      { assignment_id: 301, student_id: 102, status: 'submitted', is_late: false, version: 1, student: { id: 102, roll_number: '7', person: { first_name: 'Noah', last_name: 'Stone' } } }
    ]);

    const result = await assignmentService.listAssignments({
      schoolId: 2,
      userId: 70,
      roleName: 'parent',
      page: 1,
      limit: 10
    });

    expect(result.children).toHaveLength(2);
    expect(result.children[0]).toEqual(expect.objectContaining({
      student_id: 101,
      full_name: 'Mia Stone'
    }));
    expect(result.children[0].assignments[0]).toEqual(expect.objectContaining({ title: 'Math Practice' }));
    expect(result.children[1].assignments[0].submission).toEqual(expect.objectContaining({ status: 'submitted' }));
  });

  it('updates an assignment owned by the authenticated teacher', async () => {
    assignmentRepository.findTeacherByUserId.mockResolvedValue({ id: 12 });
    assignmentRepository.findAssignmentById
      .mockResolvedValueOnce({
        id: 77,
        class_id: 8,
        section_id: 3,
        subject_id: 6,
        teacher_id: 12,
        assigned_date: '2026-04-04',
        due_date: '2026-04-05',
        academicYear: { id: 4, school_id: 2 },
      })
      .mockResolvedValueOnce({
        id: 77,
        academic_year_id: 4,
        class_id: 8,
        section_id: 3,
        subject_id: 6,
        teacher_id: 12,
        title: 'Updated Math Practice',
        description: 'Solve twelve problems',
        assignment_type: 'homework',
        max_marks: '20.00',
        weightage_percentage: '10.00',
        assigned_date: '2026-04-04',
        due_date: '2026-04-06',
        allow_late_submission: false,
        late_submission_penalty_percent: '0.00',
        attachment_url: null,
        instructions: 'Show your working',
        is_active: true,
        academicYear: { id: 4, name: '2026-2027', is_current: true },
        class: { id: 8, name: 'Grade 8', numeric_grade: 8 },
        section: { id: 3, name: 'A' },
        subject: { id: 6, name: 'Mathematics', code: 'MTH' },
        teacher: { id: 12, employee_id: 'EMP-12', person: { first_name: 'Jane', last_name: 'Doe' } },
      });
    assignmentRepository.findClassForSchool.mockResolvedValue({ id: 8 });
    assignmentRepository.findSectionForClass.mockResolvedValue({ id: 3 });
    assignmentRepository.findSubjectForSchool.mockResolvedValue({ id: 6 });
    assignmentRepository.updateAssignment.mockResolvedValue([1]);
    assignmentRepository.countStudentsForAssignment.mockResolvedValue(24);
    assignmentRepository.findSubmissionSummaryByAssignmentIds.mockResolvedValue([
      {
        assignment_id: 77,
        total_students: 24,
        pending: 24,
        submitted: 0,
        graded: 0,
        resubmit_required: 0,
        missing: 0,
      },
    ]);

    const result = await assignmentService.updateAssignment({
      id: 77,
      schoolId: 2,
      userId: 17,
      class_id: 8,
      section_id: 3,
      subject_id: 6,
      title: 'Updated Math Practice',
      description: 'Solve twelve problems',
      due_date: '2026-04-06',
    });

    expect(assignmentRepository.updateAssignment).toHaveBeenCalledWith(
      77,
      expect.objectContaining({ title: 'Updated Math Practice', due_date: '2026-04-06' })
    );
    expect(result.title).toBe('Updated Math Practice');
  });

  it('soft deletes an assignment owned by the authenticated teacher', async () => {
    assignmentRepository.findTeacherByUserId.mockResolvedValue({ id: 12 });
    assignmentRepository.findAssignmentById.mockResolvedValue({
      id: 77,
      teacher_id: 12,
      academicYear: { id: 4, school_id: 2 },
    });
    assignmentRepository.softDeleteAssignment.mockResolvedValue([1]);

    const result = await assignmentService.deleteAssignment({
      id: 77,
      schoolId: 2,
      userId: 17,
    });

    expect(assignmentRepository.softDeleteAssignment).toHaveBeenCalledWith(77);
    expect(result).toEqual({ id: 77, deleted: true });
  });
});