/**
 * Seed: Students
 * Links student-role users to the students table with admission details.
 */
const { sequelize, User, Person, Student, School, SchoolBranch, Class, Section, Role } = require('../../src/models');

function buildAdmissionNumber(schoolId, personId) {
  const sid = Number.isFinite(Number(schoolId)) ? Number(schoolId) : 0;
  const pid = Number.isFinite(Number(personId)) ? Number(personId) : 0;
  return `ADM-${String(sid).padStart(2, '0')}-P${String(pid).padStart(6, '0')}`;
}

async function seed() {
  const studentRole = await Role.findOne({
    where: sequelize.where(
      sequelize.fn('LOWER', sequelize.col('name')),
      'student'
    )
  });
  if (!studentRole) throw new Error('Student role not found');

  const studentUsers = await User.findAll({
    where: { role_id: studentRole.id },
    include: [{ model: Person, as: 'person' }],
    order: [['id', 'ASC']]
  });

  const gradeAssignments = [5, 6, 7, 8, 9, 10]; // distribute students across grades

  let count = 0;
  for (let i = 0; i < studentUsers.length; i++) {
    const sUser = studentUsers[i];
    if (!sUser.person) continue;

    // Get school's main branch
    let branchId = null;
    const mainBranch = await SchoolBranch.findOne({
      where: { school_id: sUser.school_id, branch_type: 'main' }
    });
    if (mainBranch) branchId = mainBranch.id;

    if (!branchId) continue;

    // Find a class for this student
    const gradeNum = gradeAssignments[i % gradeAssignments.length];
    const cls = await Class.findOne({
      where: { branch_id: branchId, name: `Grade ${gradeNum}` }
    });
    if (!cls) continue;

    // Find section A for simplicity
    const section = await Section.findOne({
      where: { class_id: cls.id, name: 'A' }
    });
    if (!section) continue;

    const admissionNum = buildAdmissionNumber(sUser.school_id || 0, sUser.person.id);

    await Student.findOrCreate({
      where: { person_id: sUser.person.id },
      defaults: {
        person_id: sUser.person.id,
        school_id: sUser.school_id,
        branch_id: branchId,
        admission_number: admissionNum,
        roll_number: `R-${gradeNum}${String(i + 1).padStart(2, '0')}`,
        class_id: cls.id,
        section_id: section.id,
        admission_date: '2025-06-01',
        status: 'active',
      }
    });
    count++;
  }

  console.log(`   Seeded ${count} student profiles`);
}

module.exports = seed;
