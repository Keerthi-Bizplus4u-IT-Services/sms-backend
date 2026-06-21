/**
 * Seed: Notices
 * Seeds notices with varied target audiences into the notices table.
 */
const { QueryTypes } = require('sequelize');
const { sequelize, School, User, Person } = require('../../src/models');
const { resolveTableName, getTableColumns, resetSchemaCache } = require('../../src/api/v1/repositories/helpers/schema.utils');

const NOTICE_TABLE_CANDIDATES = ['notices', 'notice'];

const NOTICE_TEMPLATES = [
  {
    title: 'School Annual Day Rehearsals Begin',
    details: 'All students must attend annual day rehearsals starting next Monday. Rehearsals will be held daily from 2:00 PM to 4:00 PM in the main auditorium.',
    date: '2026-04-10',
    target_audience: 'all'
  },
  {
    title: 'Parent-Teacher Meeting – Term 1 Results',
    details: 'Parents are requested to attend the PTM on Saturday to discuss Term 1 academic performance and overall development of their ward.',
    date: '2026-04-15',
    target_audience: 'parents'
  },
  {
    title: 'Staff Training on New LMS Portal',
    details: 'All teaching and non-teaching staff are required to attend a training session on the new Learning Management System. Bring your laptops.',
    date: '2026-04-08',
    target_audience: 'staff'
  },
  {
    title: 'Teachers – Submit Lesson Plans by Friday',
    details: 'All class teachers must submit their updated lesson plans for April to the academic coordinator before end of day Friday.',
    date: '2026-04-11',
    target_audience: 'teachers'
  },
  {
    title: 'Students – Exam Hall Ticket Distribution',
    details: 'Hall tickets for the upcoming mid-term exams will be distributed by class teachers during attendance period. Students with pending fees should clear dues first.',
    date: '2026-04-14',
    target_audience: 'students'
  },
  {
    title: 'Transport Route Changes for Summer Schedule',
    details: 'Due to summer schedule timings, all transport routes will be revised from May 1st. Drivers and transport staff must attend the route planning meeting on April 20th.',
    date: '2026-04-18',
    target_audience: 'transport'
  },
  {
    title: 'Library Book Return Deadline',
    details: 'All borrowed library books must be returned before April 25th for annual stock verification. Librarians should prepare the overdue list by April 22nd.',
    date: '2026-04-12',
    target_audience: 'librarian'
  },
  {
    title: 'Driver Vehicle Inspection This Week',
    details: 'All school bus drivers must bring their vehicles for mandatory safety inspection on Thursday and Friday at the maintenance bay.',
    date: '2026-04-16',
    target_audience: 'drivers'
  },
  {
    title: 'Non-Teaching Staff – Attendance Regularization',
    details: 'All non-teaching staff (librarians, lab assistants, drivers, admin clerks) must regularize their attendance records for March by April 10th.',
    date: '2026-04-09',
    target_audience: 'non_teaching_staff'
  },
  {
    title: 'Summer Camp Registration Open – Parents & Students',
    details: 'Summer camp registrations are now open for students of classes 3 to 8. Parents can register their wards through the school portal or at the front office.',
    date: '2026-04-20',
    target_audience: 'parents,students'
  },
  {
    title: 'Teachers & Parents – Report Card Day Schedule',
    details: 'Report cards will be distributed on April 28th. Teachers should have all grades finalized by April 25th. Parents are expected between 9 AM and 1 PM.',
    date: '2026-04-22',
    target_audience: 'teachers,parents'
  },
  {
    title: 'Staff & Transport – Emergency Drill Coordination',
    details: 'A fire and evacuation drill is scheduled for April 30th. All staff members and transport personnel must attend the coordination meeting on April 27th.',
    date: '2026-04-25',
    target_audience: 'staff,transport'
  }
];

const wrapIdentifier = (value) => `"${String(value).replace(/"/g, '')}"`;

const pickFirstColumn = (columnSet, candidates) => candidates.find((column) => columnSet.has(column));

const createNoticesTableIfMissing = async () => {
  const dialect = typeof sequelize.getDialect === 'function'
    ? sequelize.getDialect()
    : sequelize?.options?.dialect;

  if (dialect === 'postgres') {
    await sequelize.query(
      `
      CREATE TABLE IF NOT EXISTS notices (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        details TEXT NULL,
        posted VARCHAR(191) NULL,
        date DATE NOT NULL,
        school_id INTEGER NULL,
        created_by INTEGER NULL,
        updated_by INTEGER NULL,
        is_published BOOLEAN NOT NULL DEFAULT TRUE,
        target_audience VARCHAR(255) NOT NULL DEFAULT 'all',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      )`,
      { type: QueryTypes.RAW }
    );
  } else {
    await sequelize.query(
      `
      CREATE TABLE IF NOT EXISTS notices (
        id INTEGER UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        details TEXT NULL,
        posted VARCHAR(191) NULL,
        date DATE NOT NULL,
        school_id INTEGER UNSIGNED NULL,
        created_by INTEGER UNSIGNED NULL,
        updated_by INTEGER UNSIGNED NULL,
        is_published TINYINT(1) NOT NULL DEFAULT 1,
        target_audience VARCHAR(255) NOT NULL DEFAULT 'all',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL
      )`,
      { type: QueryTypes.RAW }
    );
  }

  resetSchemaCache();
  return resolveTableName(NOTICE_TABLE_CANDIDATES);
};

const resolveNoticesTable = async () => {
  const existingTable = await resolveTableName(NOTICE_TABLE_CANDIDATES);
  if (existingTable) {
    return existingTable;
  }

  return createNoticesTableIfMissing();
};

const buildInsertPayload = (columns, notice, schoolId, postedBy, userId) => {
  const payload = {};

  const titleColumn = pickFirstColumn(columns, ['title', 'ename', 'name', 'subject']);
  if (titleColumn) payload[titleColumn] = notice.title;

  const detailsColumn = pickFirstColumn(columns, ['details', 'enote', 'content', 'description', 'message', 'dis']);
  if (detailsColumn) payload[detailsColumn] = notice.details;

  const dateColumn = pickFirstColumn(columns, ['date', 'publish_date', 'sdate', 'event_date', 'start_date']);
  if (dateColumn) payload[dateColumn] = notice.date;

  ['posted', 'author', 'posted_by', 'tname', 'organizer', 'organizer_name'].forEach((column) => {
    if (columns.has(column)) payload[column] = postedBy;
  });

  ['created_by', 'updated_by'].forEach((column) => {
    if (columns.has(column)) payload[column] = userId || null;
  });

  if (columns.has('school_id')) payload.school_id = schoolId;
  if (columns.has('is_published')) payload.is_published = true;
  if (columns.has('target_audience')) payload.target_audience = notice.target_audience;

  return payload;
};

async function seed() {
  const table = await resolveNoticesTable();
  if (!table) {
    throw new Error('Unable to resolve or create a notices table for seeding');
  }

  const columns = await getTableColumns(table);
  const schools = await School.findAll({ order: [['id', 'ASC']] });

  for (const school of schools) {
    const authorUser = await User.findOne({
      where: { school_id: school.id },
      include: [{ model: Person, as: 'person', required: false }],
      order: [['id', 'ASC']]
    });

    const postedBy = authorUser?.person
      ? `${authorUser.person.first_name || ''} ${authorUser.person.last_name || ''}`.trim()
      : `${school.name} Admin`;

    const userId = authorUser?.id || null;

    for (const notice of NOTICE_TEMPLATES) {
      const titleColumn = pickFirstColumn(columns, ['title', 'ename', 'name', 'subject']);
      const dateColumn = pickFirstColumn(columns, ['date', 'publish_date', 'sdate', 'event_date', 'start_date']);

      const whereClauses = [];
      const replacements = {};

      if (titleColumn) {
        whereClauses.push(`${wrapIdentifier(titleColumn)} = :noticeTitle`);
        replacements.noticeTitle = notice.title;
      }

      if (dateColumn) {
        whereClauses.push(`${wrapIdentifier(dateColumn)} = :noticeDate`);
        replacements.noticeDate = notice.date;
      }

      if (columns.has('school_id')) {
        whereClauses.push(`${wrapIdentifier('school_id')} = :schoolId`);
        replacements.schoolId = school.id;
      }

      const existingRows = await sequelize.query(
        `SELECT 1 FROM ${wrapIdentifier(table)} WHERE ${whereClauses.join(' AND ')} LIMIT 1`,
        {
          replacements,
          type: QueryTypes.SELECT
        }
      );

      if (existingRows.length > 0) {
        continue;
      }

      const payload = buildInsertPayload(columns, notice, school.id, postedBy, userId);
      const insertColumns = Object.keys(payload);
      const insertValues = insertColumns.map((column) => `:${column}`);

      await sequelize.query(
        `INSERT INTO ${wrapIdentifier(table)} (${insertColumns.map((column) => wrapIdentifier(column)).join(', ')}) VALUES (${insertValues.join(', ')})`,
        {
          replacements: payload,
          type: QueryTypes.INSERT
        }
      );
    }
  }

  console.log(`Seeded ${NOTICE_TEMPLATES.length} notice templates per school into ${table}.`);
}

module.exports = seed;
