/**
 * Seed: Classes & Sections
 * Creates Grades 1-10 for the current academic year at each branch,
 * with 2-3 sections per class.
 */
const { AcademicYear, SchoolBranch, Class, Section } = require('../../src/models');

const CLASSES = [
  { name: 'Grade 1', numeric_grade: 1, display_order: 1, sections: ['A', 'B'] },
  { name: 'Grade 2', numeric_grade: 2, display_order: 2, sections: ['A', 'B'] },
  { name: 'Grade 3', numeric_grade: 3, display_order: 3, sections: ['A', 'B'] },
  { name: 'Grade 4', numeric_grade: 4, display_order: 4, sections: ['A', 'B'] },
  { name: 'Grade 5', numeric_grade: 5, display_order: 5, sections: ['A', 'B', 'C'] },
  { name: 'Grade 6', numeric_grade: 6, display_order: 6, sections: ['A', 'B', 'C'] },
  { name: 'Grade 7', numeric_grade: 7, display_order: 7, sections: ['A', 'B', 'C'] },
  { name: 'Grade 8', numeric_grade: 8, display_order: 8, sections: ['A', 'B'] },
  { name: 'Grade 9', numeric_grade: 9, display_order: 9, sections: ['A', 'B'] },
  { name: 'Grade 10', numeric_grade: 10, display_order: 10, sections: ['A', 'B', 'C'] },
];

async function seed() {
  // Use the current academic year
  const currentAY = await AcademicYear.findOne({ where: { is_current: true } });
  if (!currentAY) throw new Error('No current academic year found');

  // Get main branches from both schools
  const mainBranches = await SchoolBranch.findAll({ where: { branch_type: 'main' } });
  if (mainBranches.length === 0) throw new Error('No school branches found');

  let totalClasses = 0;
  let totalSections = 0;

  for (const branch of mainBranches) {
    for (const cls of CLASSES) {
      const { sections: sectionNames, ...classFields } = cls;

      const [classRecord] = await Class.findOrCreate({
        where: {
          academic_year_id: currentAY.id,
          branch_id: branch.id,
          name: classFields.name,
        },
        defaults: {
          ...classFields,
          academic_year_id: currentAY.id,
          branch_id: branch.id,
        }
      });
      totalClasses++;

      for (const sectionName of sectionNames) {
        await Section.findOrCreate({
          where: {
            class_id: classRecord.id,
            name: sectionName
          },
          defaults: {
            class_id: classRecord.id,
            name: sectionName,
            max_students: 40,
            room_number: `${classFields.name.replace('Grade ', 'G')}-${sectionName}`
          }
        });
        totalSections++;
      }
    }
  }

  console.log(`   Seeded ${totalClasses} classes with ${totalSections} sections`);
}

module.exports = seed;
