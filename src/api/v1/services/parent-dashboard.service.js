const parentDashboardRepository = require('../repositories/parent-dashboard.repository');
const { AppError } = require('../../../middleware/error.middleware');
const assignmentRepository = require('../repositories/assignment.repository');
const achievementRepository = require('../repositories/achievement.repository');

/** Map gender to frontend gen: 0 = Male, 1 = Female, 2 = Others */
function genderToGen(gender) {
  if (!gender) return 0;
  const g = String(gender).toLowerCase();
  if (g === 'female') return 1;
  if (g === 'other' || g === 'prefer_not_to_say') return 2;
  return 0;
}

/** Class name to index for frontend cn (0-based like Play, Nursery, One...) */
const classNames = ['Play', 'Nursery', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

function classToCn(clazz) {
  if (!clazz) return 0;
  const name = (clazz.name || '').trim();
  const idx = classNames.findIndex((c) => c.toLowerCase() === name.toLowerCase());
  if (idx >= 0) return idx;
  const num = clazz.numeric_grade != null ? clazz.numeric_grade : parseInt(name.replace(/\D/g, ''), 10);
  return Number.isFinite(num) && num >= 0 && num <= 12 ? num : 0;
}

class ParentDashboardService {
  /**
   * Get dashboard data for the logged-in parent (by userId)
   */
  async getDashboard(userId, schoolId) {
    const parent = await parentDashboardRepository.findParentByUserId(userId);
    if (!parent) {
      throw new AppError('Parent profile not found for this user', 403);
    }

    const studentIds = await parentDashboardRepository.getStudentIdsByParentId(parent.id);
    const [students, notices, feePayments, feeStructure] = await Promise.all([
      parentDashboardRepository.getStudentsByIds(studentIds),
      parentDashboardRepository.getNotices({ limit: 20, schoolId, roleName: 'parent' }),
      parentDashboardRepository.getFeePaymentsForStudentIds(studentIds),
      parentDashboardRepository.getFeeStructurePlaceholder()
    ]);

    const achievementsCount = await achievementRepository.countByStudentIds(studentIds).catch(() => 0);

    const classSections = Array.from(
      new Map(
        students.map((student) => [`${student.class_id}:${student.section_id}`, { class_id: student.class_id, section_id: student.section_id }])
      ).values()
    );
    const assignmentResult = classSections.length
      ? await assignmentRepository.listAssignmentsForClassSections({
          schoolId,
          classSections,
          page: 1,
          limit: 6
        }).catch(() => ({ assignments: [] }))
      : { assignments: [] };

    const studentMap = new Map(students.map((s) => [s.id, s]));

    const studentInfo = students.map((s) => {
      const person = s.person || {};
      const clazz = s.class || {};
      const section = s.section || {};
      return {
        fname: person.first_name ? `${person.first_name} ${(person.last_name || '').trim()}`.trim() : '—',
        gen: genderToGen(person.gender),
        cn: classToCn(clazz),
        roll: s.roll_number || '—',
        sname: section.name || '—',
        aid: s.admission_number || '—',
        admissiondate: s.admission_date || '—'
      };
    });

    const expenseList = feePayments.map((fp) => {
      const student = studentMap.get(fp.student_id);
      const fname = student?.person?.first_name || `Student ${fp.student_id}`;
      const feetype = fp.feetype != null ? Number(fp.feetype) : 1;
      return {
        fname,
        feetype: feetype >= 1 && feetype <= 5 ? feetype : 1,
        amountpaid: Number(fp.amountpaid) || 0,
        date: fp.date ? (typeof fp.date === 'string' ? fp.date : fp.date.toISOString().slice(0, 10)) : '—'
      };
    });

    const totalPaid = expenseList.reduce((sum, fp) => sum + (Number(fp.amountpaid) || 0), 0);
    const feeStructureTotal =
      (feeStructure.fterm || 0) + (feeStructure.sterm || 0) + (feeStructure.thterm || 0) + (feeStructure.trans || 0) + (feeStructure.spofee || 0);
    const dueFees = Math.max(0, feeStructureTotal * Math.max(0, studentIds.length) - totalPaid);

    const noticesFormatted = (notices || [])
      .map((n) => ({
        date: n.date ? (typeof n.date === 'string' ? n.date : n.date.toISOString?.()?.slice(0, 10) || '') : '',
        title: n.title || '',
        posted: n.posted != null ? String(n.posted) : ''
      }))
      .filter((notice) => Boolean(notice.title || notice.posted || notice.date));

    return {
      dueFees: Math.round(dueFees * 100) / 100,
      notifications: noticesFormatted.length,
      achievements: achievementsCount,
      expenses: Math.round(totalPaid * 100) / 100,
      studentInfo,
      notices: noticesFormatted,
      expenseList,
      recentAssignments: students.map((student) => {
        const person = student.person || {};
        const classInfo = student.class || {};
        const section = student.section || {};
        return {
          studentId: student.id,
          studentName: person.first_name ? `${person.first_name} ${(person.last_name || '').trim()}`.trim() : `Student ${student.id}`,
          className: classInfo.name || 'Class',
          sectionName: section.name || 'Section',
          assignments: assignmentResult.assignments
            .filter((assignment) => Number(assignment.class_id) === Number(student.class_id) && Number(assignment.section_id) === Number(student.section_id))
            .slice(0, 2)
            .map((assignment) => ({
              id: assignment.id,
              title: assignment.title || '',
              subject: assignment.subject?.name || 'Subject',
              dueDate: assignment.due_date ? String(assignment.due_date).slice(0, 10) : '',
              assignmentType: assignment.assignment_type || 'homework'
            }))
        };
      }),
      feeStructure: {
        fterm: toNum(feeStructure.fterm),
        sterm: toNum(feeStructure.sterm),
        thterm: toNum(feeStructure.thterm),
        trans: toNum(feeStructure.trans),
        spofee: toNum(feeStructure.spofee)
      }
    };
  }
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

module.exports = new ParentDashboardService();
