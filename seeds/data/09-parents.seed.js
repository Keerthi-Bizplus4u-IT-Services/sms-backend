/**
 * Seed: Parents
 * Links parent-role users to the parents table with occupation details.
 */
const { sequelize, User, Person, Parent, Role } = require('../../src/models');

const OCCUPATIONS = ['Software Engineer', 'Doctor', 'Business Owner', 'Government Employee', 'Teacher'];
const EMPLOYERS = ['TCS', 'Apollo Hospitals', 'Self-Employed', 'State Government', 'Public School'];

async function seed() {
  const parentRole = await Role.findOne({
    where: sequelize.where(
      sequelize.fn('LOWER', sequelize.col('name')),
      'parent'
    )
  });
  if (!parentRole) throw new Error('Parent role not found');

  const parentUsers = await User.findAll({
    where: { role_id: parentRole.id },
    include: [{ model: Person, as: 'person' }]
  });

  let count = 0;
  for (let i = 0; i < parentUsers.length; i++) {
    const pUser = parentUsers[i];
    if (!pUser.person) continue;

    await Parent.findOrCreate({
      where: { person_id: pUser.person.id },
      defaults: {
        person_id: pUser.person.id,
        occupation: OCCUPATIONS[i % OCCUPATIONS.length],
        annual_income: 600000 + (i * 200000),
        employer_name: EMPLOYERS[i % EMPLOYERS.length],
      }
    });
    count++;
  }

  console.log(`   Seeded ${count} parent profiles`);
}

module.exports = seed;
