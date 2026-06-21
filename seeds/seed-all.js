#!/usr/bin/env node

/**
 * Master Seed Runner
 * Seeds ALL application data across every feature in the correct dependency order.
 * 
 * Usage:
 *   node backend/seeds/seed-all.js
 *   node backend/seeds/seed-all.js --fresh   (drops & recreates all tables first)
 * 
 * Seed order (respects FK dependencies):
 *   1. Schools & Branches
 *   2. Roles & Permissions (RBAC)
 *   3. Users (admin, teacher, student, parent, accounts, library, management, transport)
 *   4. Persons (linked to users)
 *   5. Academic Years
 *   6. Classes & Sections
 *   7. Subjects
 *   8. Teachers
 *   9. Students
 *  10. Parents
 *  11. Session Hours
 *  12. Holidays
 *  13. Leave Policies & Leave Requests
 *  14. Exams, Exam Schedules & Student Marks
 *  15. Grading Scales
 *  16. Hostel Buildings & Rooms
 */

const { sequelize } = require('../src/models');

// Import individual seeders
const seedSchools = require('./data/01-schools.seed');
const seedRolesAndPermissions = require('./data/02-roles-permissions.seed');
const seedUsers = require('./data/03-users.seed');
const seedAcademicYears = require('./data/04-academic-years.seed');
const seedClassesAndSections = require('./data/05-classes-sections.seed');
const seedSubjects = require('./data/06-subjects.seed');
const seedClassSubjects = require('./data/06-class-subjects.seed');
const seedTeachers = require('./data/07-teachers.seed');
const seedStudents = require('./data/08-students.seed');
const seedParents = require('./data/09-parents.seed');
const seedStudentParents = require('./data/21-student-parents.seed');
const seedSessionHours = require('./data/10-session-hours.seed');
const seedHolidays = require('./data/11-holidays.seed');
const seedLeaves = require('./data/12-leaves.seed');
const seedExams = require('./data/13-exams.seed');
const seedGradingScales = require('./data/14-grading-scales.seed');
const seedHostels = require('./data/15-hostels.seed');
const seedEvents = require('./data/16-events.seed');
const seedTimetablePeriods = require('./data/17-timetable-periods.seed');
const seedClassTimetable = require('./data/18-class-timetable.seed');
const seedFees = require('./data/19-fees.seed');
const seedAssignments = require('./data/20-assignments.seed');
const seedNotices = require('./data/22-notices.seed');

const SEEDERS = [
  { name: 'Schools & Branches', fn: seedSchools },
  { name: 'Roles & Permissions', fn: seedRolesAndPermissions },
  { name: 'Users & Persons', fn: seedUsers },
  { name: 'Academic Years', fn: seedAcademicYears },
  { name: 'Classes & Sections', fn: seedClassesAndSections },
  { name: 'Subjects', fn: seedSubjects },
  { name: 'Class-Subject Mapping', fn: seedClassSubjects },
  { name: 'Teachers', fn: seedTeachers },
  { name: 'Students', fn: seedStudents },
  { name: 'Parents', fn: seedParents },
  { name: 'Student-Parent Links', fn: seedStudentParents },
  { name: 'Session Hours', fn: seedSessionHours },
  { name: 'Timetable Periods', fn: seedTimetablePeriods },
  { name: 'Class Timetable', fn: seedClassTimetable },
  { name: 'Fees', fn: seedFees },
  { name: 'Assignments', fn: seedAssignments },
  { name: 'Holidays', fn: seedHolidays },
  { name: 'Leave Policies & Requests', fn: seedLeaves },
  { name: 'Exams, Schedules & Marks', fn: seedExams },
  { name: 'Grading Scales', fn: seedGradingScales },
  { name: 'Hostel Buildings & Rooms', fn: seedHostels },
  { name: 'Events', fn: seedEvents },
  { name: 'Notices', fn: seedNotices },
];

async function runAllSeeds() {
  const isFresh = process.argv.includes('--fresh');
  const startTime = Date.now();

  try {
    await sequelize.authenticate();
    console.log('='.repeat(60));
    console.log('  SMS - Complete Database Seeder');
    console.log('='.repeat(60));
    console.log(`  Mode     : ${isFresh ? 'FRESH (drop & recreate tables)' : 'UPSERT (preserve existing)'}`);
    console.log(`  Database : ${sequelize.config.database}@${sequelize.config.host}`);
    console.log('='.repeat(60));

    if (isFresh) {
      console.log('\n>> Dropping and recreating all tables...');
      await sequelize.sync({ force: true });
      console.log('   Tables recreated.\n');
    } else {
      console.log('\n>> Syncing schema (no drop)...');
      await sequelize.sync({ alter: false });
      console.log('   Schema synced.\n');
    }

    let succeeded = 0;
    let failed = 0;

    for (const seeder of SEEDERS) {
      try {
        console.log(`>> Seeding: ${seeder.name}...`);
        await seeder.fn();
        console.log(`   ✓ ${seeder.name} - done\n`);
        succeeded++;
      } catch (err) {
        console.error(`   ✗ ${seeder.name} - FAILED: ${err.message}\n`);
        failed++;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('='.repeat(60));
    console.log(`  Seeding completed in ${elapsed}s`);
    console.log(`  Succeeded: ${succeeded}  |  Failed: ${failed}`);
    console.log('='.repeat(60));

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal seed error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runAllSeeds();
