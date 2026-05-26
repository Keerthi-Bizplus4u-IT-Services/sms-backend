/**
 * Seed: Teachers
 * Links teacher-role users to the teachers table with employment details.
 */
const { sequelize, User, Person, Teacher, School, SchoolBranch, Role } = require('../../src/models');

async function seed() {
  const teacherRole = await Role.findOne({
    where: sequelize.where(
      sequelize.fn('LOWER', sequelize.col('name')),
      'teacher'
    )
  });
  if (!teacherRole) throw new Error('Teacher role not found');

  const teacherUsers = await User.findAll({
    where: { role_id: teacherRole.id },
    include: [{ model: Person, as: 'person' }]
  });

  const designations = ['Senior Teacher', 'Junior Teacher', 'Head of Department', 'Assistant Teacher'];
  const qualifications = ['M.Ed.', 'B.Ed., M.Sc.', 'Ph.D., M.A.', 'B.Ed., B.Sc.'];
  const specializations = ['Mathematics', 'English Literature', 'Science', 'Social Studies'];

  let count = 0;
  for (let i = 0; i < teacherUsers.length; i++) {
    const tUser = teacherUsers[i];
    if (!tUser.person) continue;

    // Get the main branch for the user's school
    let branchId = null;
    if (tUser.school_id) {
      const mainBranch = await SchoolBranch.findOne({
        where: { school_id: tUser.school_id, branch_type: 'main' }
      });
      if (mainBranch) branchId = mainBranch.id;
    }

    const empId = `EMP-${String(tUser.school_id || 1).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`;

    await Teacher.findOrCreate({
      where: { person_id: tUser.person.id },
      defaults: {
        person_id: tUser.person.id,
        school_id: tUser.school_id,
        branch_id: branchId,
        employee_id: empId,
        join_date: '2023-06-15',
        designation: designations[i % designations.length],
        qualification: qualifications[i % qualifications.length],
        experience_years: 5 + (i * 2),
        specialization: specializations[i % specializations.length],
        employment_status: 'active',
        status: 'active',
        salary: 45000 + (i * 5000),
      }
    });
    count++;
  }

  console.log(`   Seeded ${count} teacher profiles`);
}

module.exports = seed;
