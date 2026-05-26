/**
 * Seed: Session Hours (Timetable periods)
 * Creates school-level session hours for each school.
 */
const { SessionHour, School } = require('../../src/models');

const PERIODS = [
  { period_label: 'Period 1', start_time: '08:30:00', end_time: '09:15:00' },
  { period_label: 'Period 2', start_time: '09:15:00', end_time: '10:00:00' },
  { period_label: 'Period 3', start_time: '10:00:00', end_time: '10:45:00' },
  { period_label: 'Morning Break', start_time: '10:45:00', end_time: '11:00:00' },
  { period_label: 'Period 4', start_time: '11:00:00', end_time: '11:45:00' },
  { period_label: 'Period 5', start_time: '11:45:00', end_time: '12:30:00' },
  { period_label: 'Lunch Break', start_time: '12:30:00', end_time: '13:15:00' },
  { period_label: 'Period 6', start_time: '13:15:00', end_time: '14:00:00' },
  { period_label: 'Period 7', start_time: '14:00:00', end_time: '14:45:00' },
  { period_label: 'Period 8', start_time: '14:45:00', end_time: '15:30:00' },
];

async function seed() {
  const schools = await School.findAll();
  let total = 0;

  for (const school of schools) {
    for (const period of PERIODS) {
      await SessionHour.findOrCreate({
        where: {
          school_id: school.id,
          period_label: period.period_label,
        },
        defaults: {
          ...period,
          school_id: school.id,
          scope: 'SCHOOL',
        }
      });
      total++;
    }
  }

  console.log(`   Seeded ${total} session hours`);
}

module.exports = seed;
