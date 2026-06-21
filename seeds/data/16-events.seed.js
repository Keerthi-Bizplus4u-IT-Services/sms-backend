/**
 * Seed: Events
 * Seeds student-visible events into the legacy/fallback event storage used by the student portal.
 */
const { QueryTypes } = require('sequelize');
const { sequelize, School, User, Person } = require('../../src/models');
const { resolveTableName, getTableColumns, resetSchemaCache } = require('../../src/api/v1/repositories/helpers/schema.utils');

const EVENT_TABLE_CANDIDATES = ['events', 'postevent', 'calendar_events'];

const EVENT_TEMPLATES = [
  {
    ename: 'Investiture Ceremony 2026',
    sdate: '2026-04-12',
    edate: '2026-04-12',
    stime: '09:30',
    etime: '11:00',
    location: 'Main Auditorium',
    enote: 'Student council badge distribution and oath-taking ceremony for all senior students.',
    audience: 'students'
  },
  {
    ename: 'Science Exhibition Week',
    sdate: '2026-04-20',
    edate: '2026-04-22',
    stime: '10:00',
    etime: '15:30',
    location: 'Science Block',
    enote: 'Project displays, working models, and guided lab visits for classes 6 to 10.',
    audience: 'students'
  },
  {
    ename: 'Annual Sports Meet',
    sdate: '2026-05-06',
    edate: '2026-05-06',
    stime: '08:00',
    etime: '16:00',
    location: 'School Ground',
    enote: 'Track events, relay finals, and prize distribution. Students should report in house uniform.',
    audience: 'all'
  }
];

const wrapIdentifier = (value) => `"${String(value).replace(/"/g, '')}"`;

const pickFirstColumn = (columnSet, candidates) => candidates.find((column) => columnSet.has(column));

const createEventsTableIfMissing = async () => {
  const dialect = typeof sequelize.getDialect === 'function'
    ? sequelize.getDialect()
    : sequelize?.options?.dialect;

  if (dialect === 'postgres') {
    await sequelize.query(
      `
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        ename VARCHAR(255) NOT NULL,
        sdate DATE NOT NULL,
        edate DATE NULL,
        stime VARCHAR(32) NULL,
        etime VARCHAR(32) NULL,
        location VARCHAR(255) NULL,
        enote TEXT NULL,
        tname VARCHAR(191) NULL,
        school_id INTEGER NULL,
        target_audience VARCHAR(50) NOT NULL DEFAULT 'all',
        status VARCHAR(32) NOT NULL DEFAULT 'published',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      )`,
      { type: QueryTypes.RAW }
    );
  } else {
    await sequelize.query(
      `
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ename VARCHAR(255) NOT NULL,
        sdate DATE NOT NULL,
        edate DATE NULL,
        stime VARCHAR(32) NULL,
        etime VARCHAR(32) NULL,
        location VARCHAR(255) NULL,
        enote TEXT NULL,
        tname VARCHAR(191) NULL,
        school_id INTEGER NULL,
        target_audience VARCHAR(50) NOT NULL DEFAULT 'all',
        status VARCHAR(32) NOT NULL DEFAULT 'published',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL
      )`,
      { type: QueryTypes.RAW }
    );
  }

  resetSchemaCache();
  return resolveTableName(EVENT_TABLE_CANDIDATES);
};

const resolveEventsTable = async () => {
  const existingTable = await resolveTableName(EVENT_TABLE_CANDIDATES);
  if (existingTable) {
    return existingTable;
  }

  return createEventsTableIfMissing();
};

const buildInsertPayload = (columns, event, schoolId, postedBy) => {
  const payload = {};

  const titleColumn = pickFirstColumn(columns, ['ename', 'title', 'name', 'subject']);
  if (titleColumn) payload[titleColumn] = event.ename;

  const startDateColumn = pickFirstColumn(columns, ['sdate', 'start_date', 'event_date']);
  if (startDateColumn) payload[startDateColumn] = event.sdate;

  const endDateColumn = pickFirstColumn(columns, ['edate', 'end_date', 'finish_date']);
  if (endDateColumn) payload[endDateColumn] = event.edate;

  const startTimeColumn = pickFirstColumn(columns, ['stime', 'start_time']);
  if (startTimeColumn) payload[startTimeColumn] = event.stime;

  const endTimeColumn = pickFirstColumn(columns, ['etime', 'end_time']);
  if (endTimeColumn) payload[endTimeColumn] = event.etime;

  const detailsColumn = pickFirstColumn(columns, ['enote', 'details', 'description', 'notes', 'dis']);
  if (detailsColumn) payload[detailsColumn] = event.enote;

  const locationColumn = pickFirstColumn(columns, ['location', 'venue', 'place', 'address']);
  if (locationColumn) payload[locationColumn] = event.location;

  const hostColumn = pickFirstColumn(columns, ['tname', 'organizer', 'organizer_name', 'host']);
  if (hostColumn) payload[hostColumn] = postedBy;

  if (columns.has('school_id')) payload.school_id = schoolId;
  if (columns.has('target_audience')) payload.target_audience = event.audience;
  if (columns.has('status')) payload.status = 'published';
  if (columns.has('is_published')) payload.is_published = true;

  return payload;
};

async function seed() {
  const table = await resolveEventsTable();
  if (!table) {
    throw new Error('Unable to resolve or create an events table for seeding');
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

    for (const event of EVENT_TEMPLATES) {
      const titleColumn = pickFirstColumn(columns, ['ename', 'title', 'name', 'subject']);
      const startDateColumn = pickFirstColumn(columns, ['sdate', 'start_date', 'event_date']);

      const whereClauses = [];
      const replacements = {};

      if (titleColumn) {
        whereClauses.push(`${wrapIdentifier(titleColumn)} = :eventName`);
        replacements.eventName = event.ename;
      }

      if (startDateColumn) {
        whereClauses.push(`${wrapIdentifier(startDateColumn)} = :startDate`);
        replacements.startDate = event.sdate;
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

      const payload = buildInsertPayload(columns, event, school.id, postedBy);
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

  console.log(`Seeded event demo data into ${table}.`);
}

module.exports = seed;