/**
 * Seed: Schools & School Branches
 * Creates 2 schools with 2 branches each.
 */
const { School, SchoolBranch } = require('../../src/models');

const SCHOOLS = [
  {
    code: 'SMS-001',
    name: 'Springfield International School',
    short_name: 'SIS',
    school_type: 'k12',
    is_active: true,
    branches: [
      { code: 'SIS-MAIN', name: 'Springfield Main Campus', branch_type: 'main', is_active: true },
      { code: 'SIS-EAST', name: 'Springfield East Annexe', branch_type: 'annexe', is_active: true },
    ]
  },
  {
    code: 'SMS-002',
    name: 'Oakridge Public School',
    short_name: 'OPS',
    school_type: 'secondary',
    is_active: true,
    branches: [
      { code: 'OPS-MAIN', name: 'Oakridge Main Campus', branch_type: 'main', is_active: true },
      { code: 'OPS-SOUTH', name: 'Oakridge South Branch', branch_type: 'branch', is_active: true },
    ]
  }
];

async function seed() {
  for (const schoolData of SCHOOLS) {
    const { branches, ...schoolFields } = schoolData;

    const [school] = await School.findOrCreate({
      where: { code: schoolFields.code },
      defaults: schoolFields
    });

    for (const branchData of branches) {
      await SchoolBranch.findOrCreate({
        where: { code: branchData.code, school_id: school.id },
        defaults: { ...branchData, school_id: school.id }
      });
    }
  }
}

module.exports = seed;
