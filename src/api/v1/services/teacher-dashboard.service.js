const teacherDashboardRepository = require('../repositories/teacher-dashboard.repository');
const assignmentRepository = require('../repositories/assignment.repository');

const classNames = ['Play', 'Nursery', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

function genderToGen(gender) {
  if (!gender) return 0;
  const g = String(gender).toLowerCase();
  if (g === 'female') return 1;
  if (g === 'other' || g === 'prefer_not_to_say') return 2;
  return 0;
}

function classToCn(clazz) {
  if (!clazz) return 0;
  const name = (clazz.name || '').trim();
  const idx = classNames.findIndex((c) => c.toLowerCase() === name.toLowerCase());
  if (idx >= 0) return idx;
  const num = clazz.numeric_grade != null ? clazz.numeric_grade : parseInt(name.replace(/\D/g, ''), 10);
  return Number.isFinite(num) && num >= 0 && num <= 12 ? num : 0;
}

function formatDate(val) {
  if (!val) return '';
  if (typeof val === 'string') return val.slice(0, 10);
  if (val.toISOString) return val.toISOString().slice(0, 10);
  return String(val);
}

function mapRecentAssignment(assignment, summary) {
  return {
    id: assignment.id,
    title: assignment.title || '',
    subject: assignment.subject?.name || 'Subject',
    className: assignment.class?.name || 'Class',
    sectionName: assignment.section?.name || 'Section',
    assignedDate: formatDate(assignment.assigned_date),
    dueDate: formatDate(assignment.due_date),
    assignmentType: assignment.assignment_type || 'homework',
    summary: summary || {
      total_students: 0,
      pending: 0,
      submitted: 0,
      graded: 0,
      resubmit_required: 0,
      missing: 0
    }
  };
}

function buildSummaryMap(rows = []) {
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
}

class TeacherDashboardService {
  async getDashboard({ userId, schoolId } = {}) {
    const teacher = userId ? await assignmentRepository.findTeacherByUserId(userId, schoolId) : null;
    const recentAssignmentsResult = teacher
      ? await assignmentRepository.listTeacherAssignments({
          teacherId: teacher.id,
          schoolId,
          page: 1,
          limit: 4
        })
      : { assignments: [] };
    const summaryRows = recentAssignmentsResult.assignments.length
      ? await assignmentRepository.findSubmissionSummaryByAssignmentIds(recentAssignmentsResult.assignments.map((item) => item.id))
      : [];
    const summaryMap = buildSummaryMap(summaryRows);

    const [totalStudents, graduateStudents, studentStats, studentsList, notices] = await Promise.all([
      teacherDashboardRepository.getTotalStudentCount(),
      teacherDashboardRepository.getGraduateStudentCount(),
      teacherDashboardRepository.getStudentGenderStats(),
      teacherDashboardRepository.getStudentsList(20),
      teacherDashboardRepository.getNotices(20)
    ]);

    const students = (studentsList || []).map((s) => {
      const person = s.person || {};
      const user = person.user || {};
      const clazz = s.class || {};
      const section = s.section || {};
      return {
        roll: s.roll_number || '—',
        fname: person.first_name || '—',
        gen: genderToGen(person.gender),
        cn: classToCn(clazz),
        sname: section.name || '—',
        dob: formatDate(person.date_of_birth),
        phone: person.phone || '—',
        email: user.email || '—'
      };
    });

    const noticesFormatted = (notices || []).map((n) => ({
      date: formatDate(n.date),
      title: n.title || '',
      posted: n.posted != null ? String(n.posted).slice(0, 200) : ''
    }));

    return {
      totalStudents,
      graduateStudents,
      achievements: 0,
      studentStats: studentStats || { male: 0, female: 0, other: 0 },
      students,
      notices: noticesFormatted,
      recentAssignments: recentAssignmentsResult.assignments.map((assignment) =>
        mapRecentAssignment(assignment, summaryMap.get(Number(assignment.id)))
      )
    };
  }
}

module.exports = new TeacherDashboardService();
