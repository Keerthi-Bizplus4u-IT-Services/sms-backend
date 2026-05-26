/**
 * Seed: Grading Scales
 * Creates standard grading scale for the current academic year.
 */
const { GradingScale, AcademicYear } = require('../../src/models');

const GRADES = [
  { grade_name: 'A+', min_percentage: 90, max_percentage: 100, grade_point: 10.0, description: 'Outstanding' },
  { grade_name: 'A', min_percentage: 80, max_percentage: 89.99, grade_point: 9.0, description: 'Excellent' },
  { grade_name: 'B+', min_percentage: 70, max_percentage: 79.99, grade_point: 8.0, description: 'Very Good' },
  { grade_name: 'B', min_percentage: 60, max_percentage: 69.99, grade_point: 7.0, description: 'Good' },
  { grade_name: 'C+', min_percentage: 50, max_percentage: 59.99, grade_point: 6.0, description: 'Above Average' },
  { grade_name: 'C', min_percentage: 40, max_percentage: 49.99, grade_point: 5.0, description: 'Average' },
  { grade_name: 'D', min_percentage: 33, max_percentage: 39.99, grade_point: 4.0, description: 'Below Average' },
  { grade_name: 'F', min_percentage: 0, max_percentage: 32.99, grade_point: 0.0, description: 'Fail' },
];

async function seed() {
  const academicYears = await AcademicYear.findAll();
  let total = 0;

  for (const ay of academicYears) {
    for (const grade of GRADES) {
      await GradingScale.findOrCreate({
        where: {
          academic_year_id: ay.id,
          grade_name: grade.grade_name,
        },
        defaults: {
          ...grade,
          academic_year_id: ay.id,
        }
      });
      total++;
    }
  }

  console.log(`   Seeded ${total} grading scale entries`);
}

module.exports = seed;
