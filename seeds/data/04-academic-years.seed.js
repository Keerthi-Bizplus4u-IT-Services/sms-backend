/**
 * Seed: Academic Years
 * Creates 3 academic years: previous, current, and upcoming.
 */
const { AcademicYear, School } = require('../../src/models');

const ACADEMIC_YEARS = [
  { name: '2024-2025', start_date: '2024-04-01', end_date: '2025-03-31', is_current: false },
  { name: '2025-2026', start_date: '2025-04-01', end_date: '2026-03-31', is_current: true },
  { name: '2026-2027', start_date: '2026-04-01', end_date: '2027-03-31', is_current: false },
];

async function seed() {
  const schools = await School.findAll();
  let total = 0;

  for (const school of schools) {
    for (const ay of ACADEMIC_YEARS) {
      await AcademicYear.findOrCreate({
        where: { 
          school_id: school.id,
          name: ay.name 
        },
        defaults: {
          ...ay,
          school_id: school.id
        }
      });
      total++;
    }
  }
  console.log(`   Seeded ${total} academic years`);
}

module.exports = seed;
