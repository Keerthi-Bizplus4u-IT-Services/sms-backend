/**
 * Seed: Subjects
 * Creates core and elective subjects for each school.
 */
const { Subject, School } = require('../../src/models');

const SUBJECTS = [
  // Core subjects
  { name: 'Mathematics', code: 'MATH', credit_hours: 5, is_mandatory: true, type: 'core', description: 'Core mathematics curriculum' },
  { name: 'English', code: 'ENG', credit_hours: 5, is_mandatory: true, type: 'core', description: 'English language and literature' },
  { name: 'Science', code: 'SCI', credit_hours: 5, is_mandatory: true, type: 'core', description: 'General science' },
  { name: 'Social Studies', code: 'SOC', credit_hours: 4, is_mandatory: true, type: 'core', description: 'History, geography and civics' },
  { name: 'Hindi', code: 'HIN', credit_hours: 4, is_mandatory: true, type: 'core', description: 'Hindi language and literature' },
  { name: 'Physics', code: 'PHY', credit_hours: 4, is_mandatory: true, type: 'core', description: 'Physics for senior grades' },
  { name: 'Chemistry', code: 'CHE', credit_hours: 4, is_mandatory: true, type: 'core', description: 'Chemistry for senior grades' },
  { name: 'Biology', code: 'BIO', credit_hours: 4, is_mandatory: true, type: 'core', description: 'Biology for senior grades' },
  { name: 'Computer Science', code: 'CS', credit_hours: 3, is_mandatory: false, type: 'elective', description: 'Computer fundamentals and programming' },

  // Electives
  { name: 'Art & Craft', code: 'ART', credit_hours: 2, is_mandatory: false, type: 'elective', description: 'Visual arts and craft' },
  { name: 'Music', code: 'MUS', credit_hours: 2, is_mandatory: false, type: 'elective', description: 'Vocal and instrumental music' },
  { name: 'Physical Education', code: 'PE', credit_hours: 2, is_mandatory: false, type: 'extra_curricular', description: 'Sports and physical fitness' },
  { name: 'Kannada', code: 'KAN', credit_hours: 3, is_mandatory: false, type: 'optional', description: 'Kannada regional language' },
  { name: 'Telugu', code: 'TEL', credit_hours: 3, is_mandatory: false, type: 'optional', description: 'Telugu regional language' },
];

async function seed() {
  const schools = await School.findAll();
  let total = 0;

  for (const school of schools) {
    for (const subj of SUBJECTS) {
      // Make code unique per school
      const uniqueCode = `${subj.code}-${school.id}`;
      await Subject.findOrCreate({
        where: { code: uniqueCode },
        defaults: {
          ...subj,
          code: uniqueCode,
          school_id: school.id,
        }
      });
      total++;
    }
  }

  console.log(`   Seeded ${total} subjects across ${schools.length} schools`);
}

module.exports = seed;
