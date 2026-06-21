/**
 * Seed: Holidays
 * Creates a comprehensive holiday calendar for the 2025-2026 academic year.
 */
const { Holiday, School } = require('../../src/models');

const HOLIDAYS = [
  { name: 'Independence Day', start_date: '2025-08-15', end_date: '2025-08-15' },
  { name: 'Gandhi Jayanti', start_date: '2025-10-02', end_date: '2025-10-02' },
  { name: 'Dussehra', start_date: '2025-10-02', end_date: '2025-10-04' },
  { name: 'Diwali Vacation', start_date: '2025-10-20', end_date: '2025-10-25' },
  { name: 'Christmas', start_date: '2025-12-25', end_date: '2025-12-25' },
  { name: 'Winter Break', start_date: '2025-12-26', end_date: '2026-01-01' },
  { name: 'Republic Day', start_date: '2026-01-26', end_date: '2026-01-26' },
  { name: 'Holi', start_date: '2026-03-04', end_date: '2026-03-04' },
  { name: 'Ugadi', start_date: '2026-03-19', end_date: '2026-03-19' },
  { name: 'Good Friday', start_date: '2026-04-03', end_date: '2026-04-03' },
  { name: 'Ambedkar Jayanti', start_date: '2025-04-14', end_date: '2025-04-14' },
  { name: 'May Day', start_date: '2025-05-01', end_date: '2025-05-01' },
  { name: 'Summer Vacation', start_date: '2025-05-05', end_date: '2025-06-08' },
  { name: 'Eid ul-Fitr', start_date: '2026-03-21', end_date: '2026-03-21' },
  { name: 'Annual Day', start_date: '2026-02-15', end_date: '2026-02-15' },
];

async function seed() {
  const schools = await School.findAll();
  let total = 0;

  for (const school of schools) {
    for (const holiday of HOLIDAYS) {
      await Holiday.findOrCreate({
        where: {
          school_id: school.id,
          name: holiday.name,
          start_date: holiday.start_date,
        },
        defaults: {
          ...holiday,
          school_id: school.id,
        }
      });
      total++;
    }
  }

  console.log(`   Seeded ${total} holidays`);
}

module.exports = seed;
