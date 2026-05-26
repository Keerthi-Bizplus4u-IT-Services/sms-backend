/**
 * Contract tests for role-specific dashboard services.
 * These tests verify backend payload keys consumed by frontend dashboards.
 */

describe('Role Dashboard API Contracts', () => {
  describe('Teacher dashboard contract', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('matches TeacherDashboard frontend data shape', async () => {
      jest.doMock('../../../../../src/api/v1/repositories/teacher-dashboard.repository', () => ({
        getTotalStudentCount: jest.fn().mockResolvedValue(25),
        getGraduateStudentCount: jest.fn().mockResolvedValue(4),
        getStudentGenderStats: jest.fn().mockResolvedValue({ male: 10, female: 14, other: 1 }),
        getStudentsList: jest.fn().mockResolvedValue([
          {
            roll_number: 'R-001',
            person: {
              first_name: 'Alex',
              gender: 'male',
              date_of_birth: '2012-02-10',
              phone: '9876543210',
              user: { email: 'alex@example.com' }
            },
            class: { name: 'Five' },
            section: { name: 'A' }
          }
        ]),
        getNotices: jest.fn().mockResolvedValue([
          { date: '2026-04-01', title: 'Exam Update', posted: 'Please check schedule' }
        ])
      }));

      jest.doMock('../../../../../src/api/v1/repositories/assignment.repository', () => ({
        findTeacherByUserId: jest.fn().mockResolvedValue({ id: 99 }),
        listTeacherAssignments: jest.fn().mockResolvedValue({
          assignments: [
            {
              id: 11,
              title: 'Worksheet 1',
              subject: { name: 'Math' },
              class: { name: 'Five' },
              section: { name: 'A' },
              assigned_date: '2026-04-04',
              due_date: '2026-04-07',
              assignment_type: 'homework'
            }
          ]
        }),
        findSubmissionSummaryByAssignmentIds: jest.fn().mockResolvedValue([
          { assignment_id: 11, status: 'pending', count: 5 },
          { assignment_id: 11, status: 'submitted', count: 20 }
        ])
      }));

      const teacherDashboardService = require('../../../../../src/api/v1/services/teacher-dashboard.service');

      const payload = await teacherDashboardService.getDashboard({ userId: 1, schoolId: 1 });

      expect(payload).toEqual(
        expect.objectContaining({
          totalStudents: expect.any(Number),
          graduateStudents: expect.any(Number),
          achievements: expect.any(Number),
          studentStats: expect.objectContaining({
            male: expect.any(Number),
            female: expect.any(Number),
            other: expect.any(Number)
          }),
          students: expect.any(Array),
          notices: expect.any(Array),
          recentAssignments: expect.any(Array)
        })
      );

      expect(payload.students[0]).toEqual(
        expect.objectContaining({
          roll: expect.any(String),
          fname: expect.any(String),
          gen: expect.any(Number),
          cn: expect.any(Number),
          sname: expect.any(String),
          dob: expect.any(String),
          phone: expect.any(String),
          email: expect.any(String)
        })
      );

      expect(payload.notices[0]).toEqual(
        expect.objectContaining({
          date: expect.any(String),
          title: expect.any(String),
          posted: expect.any(String)
        })
      );

      expect(payload.recentAssignments[0]).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          title: expect.any(String),
          subject: expect.any(String),
          className: expect.any(String),
          sectionName: expect.any(String),
          assignedDate: expect.any(String),
          dueDate: expect.any(String),
          assignmentType: expect.any(String),
          summary: expect.objectContaining({
            total_students: expect.any(Number),
            pending: expect.any(Number),
            submitted: expect.any(Number),
            graded: expect.any(Number),
            resubmit_required: expect.any(Number),
            missing: expect.any(Number)
          })
        })
      );
    });
  });

  describe('Student dashboard contract', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('matches StudentDashboard frontend data shape', async () => {
      jest.doMock('../../../../../src/api/v1/repositories/student-dashboard.repository', () => ({
        getNotices: jest.fn().mockResolvedValue([
          { date: '2026-04-02', title: 'Holiday Notice', posted: 'School closed tomorrow' }
        ]),
        getEventCount: jest.fn().mockResolvedValue(7),
        findPersonWithStudentByUserId: jest.fn().mockResolvedValue({
          first_name: 'Mia',
          last_name: 'John',
          gender: 'female',
          date_of_birth: '2013-05-12',
          phone: '9999999999',
          user: { email: 'mia@example.com' },
          student: {
            id: 200,
            class_id: 5,
            section_id: 2,
            admission_date: '2023-06-10',
            roll_number: 'A-12',
            class: { name: 'Five' },
            section: { name: 'B' }
          }
        }),
        findUserById: jest.fn().mockResolvedValue({ email: 'mia@example.com' })
      }));

      jest.doMock('../../../../../src/api/v1/repositories/assignment.repository', () => ({
        findStudentByUserId: jest.fn(),
        listAssignmentsForClassSections: jest.fn().mockResolvedValue({
          assignments: [
            {
              id: 91,
              title: 'Science Notes',
              subject: { name: 'Science' },
              class: { name: 'Five' },
              section: { name: 'B' },
              assigned_date: '2026-04-03',
              due_date: '2026-04-06',
              assignment_type: 'project'
            }
          ]
        }),
        findSubmissionsForStudents: jest.fn().mockResolvedValue([
          { assignment_id: 91, status: 'submitted' }
        ])
      }));

      const studentDashboardService = require('../../../../../src/api/v1/services/student-dashboard.service');

      const payload = await studentDashboardService.getDashboard(10, 1);

      expect(payload).toEqual(
        expect.objectContaining({
          studentData: expect.any(Array),
          notices: expect.any(Array),
          noticeCount: expect.any(Number),
          eventCount: expect.any(Number),
          recentAssignments: expect.any(Array),
          attendanceData: expect.objectContaining({
            absentPercent: expect.any(Number),
            presentPercent: expect.any(Number)
          })
        })
      );

      expect(payload.notices[0]).toEqual(
        expect.objectContaining({
          date: expect.any(String),
          name: expect.any(String),
          email: expect.any(String)
        })
      );

      expect(payload.recentAssignments[0]).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          title: expect.any(String),
          subject: expect.any(String),
          className: expect.any(String),
          sectionName: expect.any(String),
          assignedDate: expect.any(String),
          dueDate: expect.any(String),
          assignmentType: expect.any(String),
          submissionStatus: expect.any(String)
        })
      );
    });
  });

  describe('Parent dashboard contract', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('matches ParentDashboard frontend data shape', async () => {
      jest.doMock('../../../../../src/api/v1/repositories/parent-dashboard.repository', () => ({
        findParentByUserId: jest.fn().mockResolvedValue({ id: 300 }),
        getStudentIdsByParentId: jest.fn().mockResolvedValue([200]),
        getStudentsByIds: jest.fn().mockResolvedValue([
          {
            id: 200,
            class_id: 5,
            section_id: 1,
            roll_number: 'B-01',
            admission_number: 'ADM-200',
            admission_date: '2023-06-10',
            class: { name: 'Five' },
            section: { name: 'A' },
            person: { first_name: 'Noah', last_name: 'Kim', gender: 'male' }
          }
        ]),
        getNotices: jest.fn().mockResolvedValue([
          { date: '2026-04-01', title: 'PTM', posted: 'Parent meeting this weekend' }
        ]),
        getFeePaymentsForStudentIds: jest.fn().mockResolvedValue([
          { student_id: 200, feetype: 1, amountpaid: 1200, date: '2026-04-01' }
        ]),
        getFeeStructurePlaceholder: jest.fn().mockResolvedValue({
          fterm: 5000,
          sterm: 4500,
          thterm: 4500,
          trans: 1000,
          spofee: 500
        })
      }));

      jest.doMock('../../../../../src/api/v1/repositories/assignment.repository', () => ({
        listAssignmentsForClassSections: jest.fn().mockResolvedValue({
          assignments: [
            {
              id: 501,
              class_id: 5,
              section_id: 1,
              title: 'Read Chapter 2',
              due_date: '2026-04-08',
              assignment_type: 'homework',
              subject: { name: 'English' }
            }
          ]
        })
      }));

      jest.doMock('../../../../../src/api/v1/repositories/achievement.repository', () => ({
        countByStudentIds: jest.fn().mockResolvedValue(3)
      }));

      const parentDashboardService = require('../../../../../src/api/v1/services/parent-dashboard.service');

      const payload = await parentDashboardService.getDashboard(20, 1);

      expect(payload).toEqual(
        expect.objectContaining({
          dueFees: expect.any(Number),
          notifications: expect.any(Number),
          achievements: expect.any(Number),
          expenses: expect.any(Number),
          studentInfo: expect.any(Array),
          notices: expect.any(Array),
          expenseList: expect.any(Array),
          recentAssignments: expect.any(Array),
          feeStructure: expect.objectContaining({
            fterm: expect.any(Number),
            sterm: expect.any(Number),
            thterm: expect.any(Number),
            trans: expect.any(Number),
            spofee: expect.any(Number)
          })
        })
      );

      expect(payload.studentInfo[0]).toEqual(
        expect.objectContaining({
          fname: expect.any(String),
          gen: expect.any(Number),
          cn: expect.any(Number),
          roll: expect.any(String),
          sname: expect.any(String),
          aid: expect.any(String),
          admissiondate: expect.any(String)
        })
      );

      expect(payload.expenseList[0]).toEqual(
        expect.objectContaining({
          fname: expect.any(String),
          feetype: expect.any(Number),
          amountpaid: expect.any(Number),
          date: expect.any(String)
        })
      );

      expect(payload.recentAssignments[0]).toEqual(
        expect.objectContaining({
          studentId: expect.any(Number),
          studentName: expect.any(String),
          className: expect.any(String),
          sectionName: expect.any(String),
          assignments: expect.any(Array)
        })
      );
    });
  });
});
