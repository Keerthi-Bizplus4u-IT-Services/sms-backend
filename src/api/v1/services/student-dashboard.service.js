const studentDashboardRepository = require('../repositories/student-dashboard.repository');
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

function mapStudentAssignment(assignment, submission) {
  return {
    id: assignment.id,
    title: assignment.title || '',
    subject: assignment.subject?.name || 'Subject',
    className: assignment.class?.name || 'Class',
    sectionName: assignment.section?.name || 'Section',
    assignedDate: formatDate(assignment.assigned_date),
    dueDate: formatDate(assignment.due_date),
    assignmentType: assignment.assignment_type || 'homework',
    submissionStatus: submission?.status || 'pending'
  };
}

class StudentDashboardService {
  buildFallbackDashboard(userEmail = '') {
    return {
      studentData: [
        {
          fname: '',
          lname: '',
          email: userEmail,
          admissiondate: '',
          cn: 0,
          sname: '—',
          roll: '—',
          address: '—',
          phone: '—',
          gen: 0,
          dob: '',
          religion: '—',
          fathername: '—',
          mothername: '—',
          fatheroccupation: '—'
        }
      ],
      notices: [],
      noticeCount: 0,
      eventCount: 0,
      attendanceData: {
        absentPercent: 0,
        presentPercent: 0
      }
    };
  }

  async getDashboard(userId, schoolId) {
    // Fetch notices and events regardless of student profile
    const [notices, eventCount, person] = await Promise.all([
      studentDashboardRepository.getNotices(20).catch(() => []),
      studentDashboardRepository.getEventCount().catch(() => 0),
      studentDashboardRepository.findPersonWithStudentByUserId(userId).catch(() => null)
    ]);

    const noticesFormatted = (notices || []).map((n) => ({
      date: formatDate(n.date),
      name: n.title || '',
      email: n.posted != null ? String(n.posted).slice(0, 100) : ''
    }));

    const student = person?.student || (await assignmentRepository.findStudentByUserId(userId, schoolId).catch(() => null));
    const assignmentResult = student
      ? await assignmentRepository.listAssignmentsForClassSections({
          schoolId,
          classSections: [{ class_id: student.class_id, section_id: student.section_id }],
          page: 1,
          limit: 4
        }).catch(() => ({ assignments: [] }))
      : { assignments: [] };
    const submissionRows = student && assignmentResult.assignments.length
      ? await assignmentRepository.findSubmissionsForStudents({
          assignmentIds: assignmentResult.assignments.map((item) => item.id),
          studentIds: [student.id]
        }).catch(() => [])
      : [];
    const submissionMap = new Map(submissionRows.map((item) => [Number(item.assignment_id), item]));

    // Student details are not required — build profile only if available
    let studentData;
    if (person && person.student) {
      const student = person.student;
      const user = person.user || {};
      const clazz = student.class || {};
      const section = student.section || {};

      studentData = [
        {
          fname: person.first_name || '',
          lname: person.last_name || '',
          email: user.email || '',
          admissiondate: formatDate(student.admission_date),
          cn: classToCn(clazz),
          sname: section.name || '—',
          roll: student.roll_number || '—',
          address: [person.address_line1, person.address_line2, person.city, person.state, person.postal_code, person.country]
            .filter(Boolean)
            .join(', ') || '—',
          phone: person.phone || '—',
          gen: genderToGen(person.gender),
          dob: formatDate(person.date_of_birth),
          religion: person.religion || '—',
          fathername: '—',
          mothername: '—',
          fatheroccupation: '—',
          photo: person.photo_url || undefined
        }
      ];
    } else {
      const user = await studentDashboardRepository.findUserById(userId).catch(() => null);
      studentData = this.buildFallbackDashboard(user?.email || '').studentData;
    }

    return {
      studentData,
      notices: noticesFormatted,
      noticeCount: noticesFormatted.length,
      eventCount,
      recentAssignments: assignmentResult.assignments.map((assignment) =>
        mapStudentAssignment(assignment, submissionMap.get(Number(assignment.id)))
      ),
      attendanceData: {
        absentPercent: 0,
        presentPercent: 0
      }
    };
  }
}

module.exports = new StudentDashboardService();
