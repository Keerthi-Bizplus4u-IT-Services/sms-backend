/**
 * Seed: Timetable Periods
 * Creates reusable timetable periods for academic years that already have classes.
 */
const { sequelize, AcademicYear, Class, TimetablePeriod } = require('../../src/models');

const PERIODS = [
  { period_number: 1, period_name: 'Period 1', start_time: '08:30:00', end_time: '09:15:00', duration_minutes: 45, is_break: false, break_type: null, display_order: 1 },
  { period_number: 2, period_name: 'Period 2', start_time: '09:15:00', end_time: '10:00:00', duration_minutes: 45, is_break: false, break_type: null, display_order: 2 },
  { period_number: 3, period_name: 'Period 3', start_time: '10:00:00', end_time: '10:45:00', duration_minutes: 45, is_break: false, break_type: null, display_order: 3 },
  { period_number: 4, period_name: 'Morning Break', start_time: '10:45:00', end_time: '11:00:00', duration_minutes: 15, is_break: true, break_type: 'short_break', display_order: 4 },
  { period_number: 5, period_name: 'Period 4', start_time: '11:00:00', end_time: '11:45:00', duration_minutes: 45, is_break: false, break_type: null, display_order: 5 },
  { period_number: 6, period_name: 'Period 5', start_time: '11:45:00', end_time: '12:30:00', duration_minutes: 45, is_break: false, break_type: null, display_order: 6 },
  { period_number: 7, period_name: 'Lunch Break', start_time: '12:30:00', end_time: '13:15:00', duration_minutes: 45, is_break: true, break_type: 'lunch_break', display_order: 7 },
  { period_number: 8, period_name: 'Period 6', start_time: '13:15:00', end_time: '14:00:00', duration_minutes: 45, is_break: false, break_type: null, display_order: 8 },
  { period_number: 9, period_name: 'Period 7', start_time: '14:00:00', end_time: '14:45:00', duration_minutes: 45, is_break: false, break_type: null, display_order: 9 },
  { period_number: 10, period_name: 'Period 8', start_time: '14:45:00', end_time: '15:30:00', duration_minutes: 45, is_break: false, break_type: null, display_order: 10 },
];

async function seed() {
  const academicYearIds = await Class.findAll({
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('academic_year_id')), 'academic_year_id']],
    raw: true
  });

  let total = 0;

  for (const row of academicYearIds) {
    const academicYearId = row.academic_year_id;
    if (!academicYearId) {
      continue;
    }

    const academicYear = await AcademicYear.findByPk(academicYearId);
    if (!academicYear) {
      continue;
    }

    for (const period of PERIODS) {
      await TimetablePeriod.findOrCreate({
        where: {
          academic_year_id: academicYear.id,
          period_number: period.period_number
        },
        defaults: {
          ...period,
          academic_year_id: academicYear.id,
          is_active: true
        }
      });
      total++;
    }
  }

  console.log(`   Seeded ${total} timetable periods`);
}

module.exports = seed;