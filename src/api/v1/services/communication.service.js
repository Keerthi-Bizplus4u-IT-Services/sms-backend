const { sequelize, Sequelize } = require('../../../config/database');
const { resolveTableName, getTableColumns, resetSchemaCache } = require('../repositories/helpers/schema.utils');
const { AppError } = require('../../../middleware/error.middleware');
const studentRepository = require('../repositories/student.repository');
const parentDashboardRepository = require('../repositories/parent-dashboard.repository');

const { QueryTypes } = Sequelize;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const NOTICE_TABLE_CANDIDATES = ['notices', 'notice'];
const NOTICE_FALLBACK_TABLE_CANDIDATES = ['events', 'event', 'postevent', 'calendar_events'];
const EVENT_TABLE_CANDIDATES = ['events', 'postevent', 'calendar_events'];
const EVENT_REGISTRATION_TABLE_CANDIDATES = ['event_attendances', 'event_registrations'];
const FALLBACK_EVENT_TABLES = {
  schedule: ['exam_schedules'],
  exam: ['exams'],
  class: ['classes']
};
const NOTICE_ORDER_COLUMNS = ['publish_date', 'date', 'updated_at', 'created_at', 'id', 'nid'];
const EVENT_ORDER_COLUMNS = ['start_datetime', 'start_date', 'sdate', 'event_date', 'created_at', 'id', 'eid'];
const ADMIN_SCOPE_ROLES = new Set(['admin', 'super_admin']);
const ROLE_AUDIENCE_MAP = {
  student: 'students',
  students: 'students',
  parent: 'parents',
  parents: 'parents',
  guardian: 'parents',
  teacher: 'teachers',
  teachers: 'teachers',
  transport: 'transport',
  transport_incharge: 'transport',
  driver: 'transport',
  drivers: 'transport',
  accounts: 'staff',
  library: 'staff',
  librarian: 'staff',
  management: 'staff',
  principal: 'staff',
  exam_incharge: 'staff',
  curriculum_incharge: 'staff'
};

const NON_TEACHING_ROLES = new Set(['librarian', 'library', 'driver', 'drivers', 'transport', 'transport_incharge', 'accounts']);

const normalizePagination = (page, limit) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE);
  const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || DEFAULT_LIMIT, MAX_LIMIT));

  return {
    page: parsedPage,
    limit: parsedLimit,
    offset: (parsedPage - 1) * parsedLimit
  };
};

const wrapIdentifier = (value) => `"${String(value).replace(/"/g, '')}"`;
const buildWhereClause = (clauses = []) => {
  const sanitized = clauses.filter(Boolean);
  return sanitized.length ? `WHERE ${sanitized.join(' AND ')}` : '';
};
const pickOrderColumn = (columnSet, candidates) => candidates.find((column) => columnSet.has(column));
const buildEmptyResult = (key, pagination) => ({
  [key]: [],
  total: 0,
  page: pagination.page,
  limit: pagination.limit,
  totalPages: 0
});

const coerceText = (value, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
};

const extractTime = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  if (value.includes('T')) {
    const [, time] = value.split('T');
    return time ? time.trim() : null;
  }
  if (value.includes(' ')) {
    const parts = value.split(' ');
    return parts[1] ? parts[1].trim() : null;
  }
  return null;
};
const formatExamType = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const pickFirstColumn = (columnSet, candidates) => candidates.find((column) => columnSet.has(column));

const normalizeRoleName = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
};

const PARENT_ROLE_NAMES = new Set(['parent', 'parents', 'guardian']);

async function resolveStudentForUser(userId, roleName) {
  const normalizedRole = normalizeRoleName(roleName);

  if (PARENT_ROLE_NAMES.has(normalizedRole)) {
    const parent = await parentDashboardRepository.findParentByUserId(userId);
    if (!parent) {
      return null;
    }

    const studentIds = await parentDashboardRepository.getStudentIdsByParentId(parent.id);
    if (!studentIds || studentIds.length === 0) {
      return null;
    }

    const students = await parentDashboardRepository.getStudentsByIds(studentIds);
    return students?.[0] || null;
  }

  return studentRepository.findByUserId(userId);
}

const expandAudienceAliases = (audiences = []) => {
  const aliasMap = {
    all: ['all'],
    students: ['students', 'student'],
    parents: ['parents', 'parent', 'guardian'],
    teachers: ['teachers', 'teacher'],
    staff: ['staff'],
    transport: ['transport'],
    librarian: ['librarian', 'library'],
    drivers: ['drivers', 'driver'],
    non_teaching_staff: ['non_teaching_staff']
  };

  const expanded = new Set();
  audiences.forEach((audience) => {
    const normalized = normalizeRoleName(audience);
    if (!normalized) {
      return;
    }

    const aliases = aliasMap[normalized] || [normalized];
    aliases.forEach((alias) => expanded.add(alias));
  });

  return Array.from(expanded);
};

const buildAudienceScope = (roleName) => {
  const normalizedRole = normalizeRoleName(roleName);
  if (!normalizedRole || ADMIN_SCOPE_ROLES.has(normalizedRole)) {
    return null;
  }

  const mappedAudience = ROLE_AUDIENCE_MAP[normalizedRole];
  if (!mappedAudience) {
    return expandAudienceAliases(['all']);
  }

  const audiences = ['all', mappedAudience];

  if (normalizedRole !== mappedAudience) {
    audiences.push(normalizedRole);
  }

  if (mappedAudience === 'staff' || mappedAudience === 'teachers' || mappedAudience === 'transport') {
    audiences.push('staff');
  }

  if (NON_TEACHING_ROLES.has(normalizedRole)) {
    audiences.push('non_teaching_staff');
  }

  return expandAudienceAliases(audiences);
};

const buildCommunicationScope = (columns, { schoolId, roleName } = {}) => {
  const clauses = [];
  const replacements = {};

  if (columns.has('school_id') && schoolId) {
    clauses.push('school_id = :schoolId');
    replacements.schoolId = schoolId;
  }

  if (columns.has('target_audience')) {
    const audiences = buildAudienceScope(roleName);
    if (Array.isArray(audiences) && audiences.length) {
      clauses.push(
        "(target_audience IS NULL OR TRIM(target_audience) = '' " +
        "OR LOWER(TRIM(target_audience)) IN (:audiences) " +
        "OR EXISTS (SELECT 1 FROM unnest(string_to_array(LOWER(TRIM(target_audience)), ',')) v WHERE TRIM(v) IN (:audiences)))"
      );
      replacements.audiences = audiences.map((audience) => String(audience).toLowerCase());
    }
  }

  return { clauses, replacements };
};

const buildInsertNoticePayload = (columns, { title, details, date, postedBy, userId, schoolId, targetAudience }) => {
  const insertPayload = {};

  const titleColumn = pickFirstColumn(columns, ['title', 'ename', 'name', 'subject']);
  if (titleColumn) {
    insertPayload[titleColumn] = title;
  }

  const detailsColumn = pickFirstColumn(columns, ['details', 'enote', 'content', 'description', 'message', 'dis']);
  if (detailsColumn) {
    insertPayload[detailsColumn] = details;
  }

  const dateColumn = pickFirstColumn(columns, ['date', 'publish_date', 'sdate', 'event_date', 'start_date']);
  if (dateColumn) {
    insertPayload[dateColumn] = date;
  }

  const endDateColumn = pickFirstColumn(columns, ['edate', 'end_date', 'finish_date']);
  if (endDateColumn && date) {
    insertPayload[endDateColumn] = date;
  }

  // Persist human-friendly author name when text-like author columns are present.
  ['posted', 'author', 'posted_by', 'tname', 'organizer', 'organizer_name'].forEach((column) => {
    if (columns.has(column)) {
      insertPayload[column] = postedBy;
    }
  });

  ['created_by', 'updated_by'].forEach((column) => {
    if (columns.has(column)) {
      insertPayload[column] = userId || null;
    }
  });

  if (columns.has('school_id') && schoolId) {
    insertPayload.school_id = schoolId;
  }

  if (columns.has('is_published')) {
    insertPayload.is_published = true;
  }

  if (columns.has('target_audience')) {
    const normalized = Array.isArray(targetAudience)
      ? targetAudience.map((v) => String(v).trim().toLowerCase()).join(',')
      : String(targetAudience || 'all').trim().toLowerCase();
    insertPayload.target_audience = normalized;
  }

  return insertPayload;
};

const buildDeleteScope = (columns, schoolId) => {
  const clauses = [];
  const replacements = {};

  if (columns.has('school_id') && schoolId) {
    clauses.push('school_id = :schoolId');
    replacements.schoolId = schoolId;
  }

  if (columns.has('deleted_at')) {
    clauses.push('deleted_at IS NULL');
  }

  return { clauses, replacements };
};

const resolveEventIdColumn = (columns) => pickFirstColumn(columns, ['eid', 'id', 'event_id']);

const provisionEventRegistrationTableIfMissing = async () => {
  const dialect = typeof sequelize.getDialect === 'function'
    ? sequelize.getDialect()
    : sequelize?.options?.dialect;

  if (dialect === 'postgres') {
    await sequelize.query(
      `
      CREATE TABLE IF NOT EXISTS event_attendances (
        id SERIAL PRIMARY KEY,
        event_id BIGINT NOT NULL,
        student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        school_id INTEGER NULL REFERENCES schools(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (event_id, student_id)
      )
    `,
      { type: QueryTypes.RAW }
    );
  } else {
    await sequelize.query(
      `
      CREATE TABLE IF NOT EXISTS event_attendances (
        id INTEGER UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        event_id BIGINT NOT NULL,
        student_id BIGINT NOT NULL,
        school_id INTEGER NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_event_attendance_event_student (event_id, student_id)
      )
    `,
      { type: QueryTypes.RAW }
    );
  }

  resetSchemaCache();
  return resolveTableName(EVENT_REGISTRATION_TABLE_CANDIDATES);
};

const resolveEventRegistrationTable = async () => {
  const existingTable = await resolveTableName(EVENT_REGISTRATION_TABLE_CANDIDATES);
  if (existingTable) {
    return existingTable;
  }

  return provisionEventRegistrationTableIfMissing();
};

const buildUpdateNoticePayload = (columns, { title, details, date, userId, targetAudience } = {}) => {
  const updatePayload = {};

  const titleColumn = pickFirstColumn(columns, ['title', 'ename', 'name', 'subject']);
  if (titleColumn && title !== undefined) {
    updatePayload[titleColumn] = title;
  }

  const detailsColumn = pickFirstColumn(columns, ['details', 'enote', 'content', 'description', 'message', 'dis']);
  if (detailsColumn && details !== undefined) {
    updatePayload[detailsColumn] = details;
  }

  const dateColumn = pickFirstColumn(columns, ['date', 'publish_date', 'sdate', 'event_date', 'start_date']);
  if (dateColumn && date !== undefined) {
    updatePayload[dateColumn] = date;
  }

  const endDateColumn = pickFirstColumn(columns, ['edate', 'end_date', 'finish_date']);
  if (endDateColumn && date !== undefined) {
    updatePayload[endDateColumn] = date;
  }

  if (columns.has('updated_by')) {
    updatePayload.updated_by = userId || null;
  }

  if (columns.has('target_audience') && targetAudience !== undefined) {
    updatePayload.target_audience = targetAudience;
  }

  return updatePayload;
};

const mapNotice = (row) => {
  const postedRaw =
    row.posted ??
    row.author ??
    row.posted_by ??
    row.tname ??
    row.organizer ??
    row.organizer_name ??
    row.created_by;
  let postedBy = coerceText(postedRaw, '');
  if (!postedBy) {
    postedBy = postedRaw ? `User #${postedRaw}` : 'Administrator';
  }

  return {
    nid: row.nid ?? row.id ?? row.notice_id ?? null,
    title: coerceText(row.title ?? row.ename ?? row.name ?? row.subject, 'Notice'),
    posted: postedBy,
    date:
      row.date ??
      row.publish_date ??
      row.sdate ??
      row.start_date ??
      row.event_date ??
      row.expiry_date ??
      row.created_at ??
      row.updated_at ??
      null,
    details: coerceText(row.details ?? row.enote ?? row.content ?? row.description ?? row.message ?? row.dis, ''),
    target_audience: row.target_audience || 'all'
  };
};

const provisionNoticesTableIfMissing = async () => {
  const dialect = typeof sequelize.getDialect === 'function'
    ? sequelize.getDialect()
    : sequelize?.options?.dialect;

  if (dialect !== 'postgres') {
    return null;
  }

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
      target_audience VARCHAR(50) NOT NULL DEFAULT 'all',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL
    )
  `,
    {
      type: QueryTypes.RAW
    }
  );

  // Clear stale negative existence cache entries before resolving again.
  resetSchemaCache();
  return resolveTableName(NOTICE_TABLE_CANDIDATES);
};

const resolveNoticeStorageTable = async () => {
  const primaryTable = await resolveTableName(NOTICE_TABLE_CANDIDATES);
  if (primaryTable) {
    return primaryTable;
  }

  const fallbackTable = await resolveTableName(NOTICE_FALLBACK_TABLE_CANDIDATES);
  if (fallbackTable) {
    return fallbackTable;
  }

  return provisionNoticesTableIfMissing();
};

const resolveNoticeIdColumn = (columns) => pickFirstColumn(columns, ['nid', 'id', 'notice_id', 'eid', 'event_id']);

const mapEvent = (row) => {
  const startDate =
    row.sdate ?? row.start_date ?? row.start_datetime ?? row.event_date ?? row.created_at ?? null;
  const endDate = row.edate ?? row.end_date ?? row.end_datetime ?? row.finish_date ?? startDate;
  const location = row.location ?? row.venue ?? row.place ?? row.address ?? '';
  const host = row.tname ?? row.organizer ?? row.organizer_name ?? row.host ?? null;

  return {
    eid: row.eid ?? row.id ?? row.event_id ?? null,
    ename: coerceText(row.ename ?? row.name ?? row.title, 'Event'),
    sdate: startDate,
    edate: endDate,
    stime: row.stime ?? row.start_time ?? extractTime(row.start_datetime),
    etime: row.etime ?? row.end_time ?? extractTime(row.end_datetime),
    location,
    enote: coerceText(row.enote ?? row.description ?? row.details ?? row.notes ?? row.dis, ''),
    tname: host ? coerceText(host) : null
  };
};

const mapEventRegistration = (row) => ({
  registrationId: row.registration_id ?? row.id ?? null,
  registeredAt: row.registered_at ?? row.created_at ?? null,
  event: mapEvent(row)
});

const mapExamScheduleEvent = (row) => {
  const classLabel = row.class_name || (row.numeric_grade ? `Grade ${row.numeric_grade}` : null);
  const examTypeLabel = formatExamType(row.exam_type);

  const noteParts = [];
  if (examTypeLabel) {
    noteParts.push(examTypeLabel);
  }
  if (classLabel) {
    noteParts.push(`for ${classLabel}`);
  }

  return {
    eid: `exam-${row.event_id}`,
    ename: row.exam_name ? `Exam: ${row.exam_name}` : 'Scheduled Exam',
    sdate: row.exam_date,
    edate: row.exam_date,
    stime: row.start_time,
    etime: row.end_time,
    location: classLabel ?? 'Main Campus',
    enote: noteParts.length ? noteParts.join(' ') : 'See academic calendar',
    tname: null
  };
};

async function listNotices({ page, limit, schoolId, roleName } = {}) {
  const pagination = normalizePagination(page, limit);
  const table = await resolveNoticeStorageTable();

  if (!table) {
    return buildEmptyResult('notices', pagination);
  }

  const columns = await getTableColumns(table);
  const scoped = buildCommunicationScope(columns, { schoolId, roleName });
  const whereClause = buildWhereClause([
    columns.has('deleted_at') ? 'deleted_at IS NULL' : null,
    columns.has('is_published') ? 'is_published = TRUE' : null,
    ...scoped.clauses
  ]);
  const orderColumn = pickOrderColumn(columns, NOTICE_ORDER_COLUMNS);
  const orderClause = orderColumn ? `ORDER BY ${wrapIdentifier(orderColumn)} DESC` : '';

  const [rows, countRows] = await Promise.all([
    sequelize.query(
      `SELECT * FROM ${wrapIdentifier(table)} ${whereClause} ${orderClause} LIMIT :limit OFFSET :offset`,
      {
        replacements: {
          limit: pagination.limit,
          offset: pagination.offset,
          ...scoped.replacements
        },
        type: QueryTypes.SELECT
      }
    ),
    sequelize.query(`SELECT COUNT(*) AS total FROM ${wrapIdentifier(table)} ${whereClause}`, {
      replacements: {
        ...scoped.replacements
      },
      type: QueryTypes.SELECT
    })
  ]);

  const total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;

  return {
    notices: rows.map(mapNotice),
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / pagination.limit)
  };
}

async function listEvents({ page, limit, schoolId, roleName } = {}) {
  const pagination = normalizePagination(page, limit);
  const table = await resolveTableName(EVENT_TABLE_CANDIDATES);

  if (!table) {
    return listExamScheduleEvents(pagination, { schoolId });
  }

  const columns = await getTableColumns(table);
  const scoped = buildCommunicationScope(columns, { schoolId, roleName });
  const whereClause = buildWhereClause([
    columns.has('deleted_at') ? 'deleted_at IS NULL' : null,
    columns.has('status') ? "status NOT IN ('cancelled', 'archived')" : null,
    ...scoped.clauses
  ]);
  const orderColumn = pickOrderColumn(columns, EVENT_ORDER_COLUMNS);
  const orderClause = orderColumn ? `ORDER BY ${wrapIdentifier(orderColumn)} DESC` : '';

  const [rows, countRows] = await Promise.all([
    sequelize.query(
      `SELECT * FROM ${wrapIdentifier(table)} ${whereClause} ${orderClause} LIMIT :limit OFFSET :offset`,
      {
        replacements: {
          limit: pagination.limit,
          offset: pagination.offset,
          ...scoped.replacements
        },
        type: QueryTypes.SELECT
      }
    ),
    sequelize.query(`SELECT COUNT(*) AS total FROM ${wrapIdentifier(table)} ${whereClause}`, {
      replacements: {
        ...scoped.replacements
      },
      type: QueryTypes.SELECT
    })
  ]);

  const total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;

  return {
    events: rows.map(mapEvent),
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / pagination.limit)
  };
}

async function listExamScheduleEvents(pagination, { schoolId } = {}) {
  const scheduleTable = await resolveTableName(FALLBACK_EVENT_TABLES.schedule);
  const examTable = await resolveTableName(FALLBACK_EVENT_TABLES.exam);
  const classTable = await resolveTableName(FALLBACK_EVENT_TABLES.class);

  if (!scheduleTable || !examTable || !classTable) {
    return buildEmptyResult('events', pagination);
  }

  const classColumns = await getTableColumns(classTable);
  const scopeClauses = [];
  if (classColumns.has('school_id') && schoolId) {
    scopeClauses.push('c.school_id = :schoolId');
  }

  const startDate = new Date().toISOString().slice(0, 10);
  const baseFromClause = `
    FROM ${wrapIdentifier(scheduleTable)} es
    INNER JOIN ${wrapIdentifier(examTable)} e ON e.id = es.exam_id
    INNER JOIN ${wrapIdentifier(classTable)} c ON c.id = es.class_id
  `;

  const runQuery = async (upcomingOnly) => {
    const replacements = {
      limit: pagination.limit,
      offset: pagination.offset
    };

    const whereFragments = [...scopeClauses];
    if (upcomingOnly) {
      whereFragments.push('(es.exam_date IS NULL OR es.exam_date >= :startDate)');
    }

    const whereClause = whereFragments.length
      ? `WHERE ${whereFragments.join(' AND ')}`
      : '';

    if (upcomingOnly) {
      replacements.startDate = startDate;
    }

    if (scopeClauses.length && schoolId) {
      replacements.schoolId = schoolId;
    }

    const orderClause = upcomingOnly
      ? 'ORDER BY es.exam_date ASC, es.start_time ASC'
      : 'ORDER BY es.exam_date DESC, es.start_time DESC';

    const [rows, countRows] = await Promise.all([
      sequelize.query(
        `
        SELECT 
          es.id AS event_id,
          es.exam_date,
          es.start_time,
          es.end_time,
          e.name AS exam_name,
          e.exam_type,
          c.name AS class_name,
          c.numeric_grade
        ${baseFromClause}
        ${whereClause}
        ${orderClause}
        LIMIT :limit OFFSET :offset
      `,
        {
          replacements,
          type: QueryTypes.SELECT
        }
      ),
      sequelize.query(
        `SELECT COUNT(*) AS total ${baseFromClause} ${whereClause}`,
        {
          replacements,
          type: QueryTypes.SELECT
        }
      )
    ]);

    const total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;
    return {
      events: rows.map(mapExamScheduleEvent),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / pagination.limit)
    };
  };

  let result = await runQuery(true);
  if (result.total === 0) {
    result = await runQuery(false);
  }

  return result;
}

async function listEventRegistrations({ page, limit, schoolId, userId, roleName } = {}) {
  const pagination = normalizePagination(page, limit);

  if (!userId) {
    throw new AppError('User context is required', 400);
  }

  const student = await resolveStudentForUser(userId, roleName);
  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  const eventTable = await resolveTableName(EVENT_TABLE_CANDIDATES);
  const registrationTable = await resolveTableName(EVENT_REGISTRATION_TABLE_CANDIDATES);
  if (!eventTable || !registrationTable) {
    return buildEmptyResult('registrations', pagination);
  }

  const eventColumns = await getTableColumns(eventTable);
  const eventIdColumn = resolveEventIdColumn(eventColumns);
  if (!eventIdColumn) {
    throw new AppError('Event identifier column is not configured', 500);
  }

  const scoped = buildCommunicationScope(eventColumns, { schoolId, roleName: 'student' });
  const whereClause = buildWhereClause([
    `reg.student_id = :studentId`,
    eventColumns.has('deleted_at') ? 'evt.deleted_at IS NULL' : null,
    eventColumns.has('status') ? "evt.status NOT IN ('cancelled', 'archived')" : null,
    ...scoped.clauses.map((clause) => clause.replace(/\bschool_id\b/g, 'evt.school_id').replace(/\btarget_audience\b/g, 'evt.target_audience'))
  ]);

  const orderColumn = pickOrderColumn(eventColumns, EVENT_ORDER_COLUMNS);
  const orderClause = orderColumn
    ? `ORDER BY evt.${wrapIdentifier(orderColumn)} DESC, reg.created_at DESC`
    : 'ORDER BY reg.created_at DESC';

  const replacements = {
    studentId: student.id,
    ...scoped.replacements,
    limit: pagination.limit,
    offset: pagination.offset
  };

  const [rows, countRows] = await Promise.all([
    sequelize.query(
      `
      SELECT
        reg.id AS registration_id,
        reg.created_at AS registered_at,
        evt.*
      FROM ${wrapIdentifier(registrationTable)} AS reg
      INNER JOIN ${wrapIdentifier(eventTable)} AS evt
        ON evt.${wrapIdentifier(eventIdColumn)} = reg.event_id
      ${whereClause}
      ${orderClause}
      LIMIT :limit OFFSET :offset
    `,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    ),
    sequelize.query(
      `
      SELECT COUNT(*) AS total
      FROM ${wrapIdentifier(registrationTable)} AS reg
      INNER JOIN ${wrapIdentifier(eventTable)} AS evt
        ON evt.${wrapIdentifier(eventIdColumn)} = reg.event_id
      ${whereClause}
    `,
      {
        replacements: {
          studentId: student.id,
          ...scoped.replacements
        },
        type: QueryTypes.SELECT
      }
    )
  ]);

  const total = countRows?.[0]?.total ? Number(countRows[0].total) : 0;

  return {
    registrations: rows.map(mapEventRegistration),
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / pagination.limit)
  };
}

async function attendEvent({ eventId, schoolId, userId, roleName } = {}) {
  const parsedEventId = Number(eventId);
  if (!Number.isFinite(parsedEventId) || parsedEventId < 1) {
    throw new AppError('Invalid event ID', 400);
  }

  if (!userId) {
    throw new AppError('User context is required', 400);
  }

  const student = await resolveStudentForUser(userId, roleName);
  if (!student) {
    throw new AppError('Student profile not found', 404);
  }

  const eventTable = await resolveTableName(EVENT_TABLE_CANDIDATES);
  if (!eventTable) {
    throw new AppError('Event storage table is not configured', 500);
  }

  const eventColumns = await getTableColumns(eventTable);
  const eventIdColumn = resolveEventIdColumn(eventColumns);
  if (!eventIdColumn) {
    throw new AppError('Event identifier column is not configured', 500);
  }

  const eventScope = buildCommunicationScope(eventColumns, { schoolId, roleName: 'student' });
  const eventWhereClause = buildWhereClause([
    `${wrapIdentifier(eventIdColumn)} = :eventId`,
    eventColumns.has('deleted_at') ? 'deleted_at IS NULL' : null,
    eventColumns.has('status') ? "status NOT IN ('cancelled', 'archived')" : null,
    ...eventScope.clauses
  ]);

  const eventRows = await sequelize.query(
    `SELECT * FROM ${wrapIdentifier(eventTable)} ${eventWhereClause} LIMIT 1`,
    {
      replacements: {
        eventId: parsedEventId,
        ...eventScope.replacements
      },
      type: QueryTypes.SELECT
    }
  );

  if (!eventRows.length) {
    throw new AppError('Event not found', 404);
  }

  const registrationTable = await resolveEventRegistrationTable();
  if (!registrationTable) {
    throw new AppError('Event attendance storage table is not configured', 500);
  }

  const existingRegistration = await sequelize.query(
    `SELECT 1 FROM ${wrapIdentifier(registrationTable)} WHERE event_id = :eventId AND student_id = :studentId LIMIT 1`,
    {
      replacements: {
        eventId: parsedEventId,
        studentId: student.id
      },
      type: QueryTypes.SELECT
    }
  );

  if (existingRegistration.length > 0) {
    return {
      eventId: parsedEventId,
      studentId: student.id,
      alreadyRegistered: true
    };
  }

  await sequelize.query(
    `INSERT INTO ${wrapIdentifier(registrationTable)} (event_id, student_id, school_id) VALUES (:eventId, :studentId, :schoolId)`,
    {
      replacements: {
        eventId: parsedEventId,
        studentId: student.id,
        schoolId: schoolId || student.school_id || null
      },
      type: QueryTypes.INSERT
    }
  );

  return {
    eventId: parsedEventId,
    studentId: student.id,
    alreadyRegistered: false
  };
}

async function createNotice({ title, details, date, postedBy, userId, schoolId, targetAudience } = {}) {
  const table = await resolveNoticeStorageTable();
  if (!table) {
    throw new AppError('Notice storage table is not configured', 500);
  }

  const columns = await getTableColumns(table);
  const payload = buildInsertNoticePayload(columns, {
    title,
    details,
    date,
    postedBy,
    userId,
    schoolId,
    targetAudience
  });

  const payloadColumns = Object.keys(payload);
  if (payloadColumns.length === 0) {
    throw new AppError('Unable to map notice payload to table columns', 500);
  }

  const fieldList = payloadColumns.map((column) => wrapIdentifier(column)).join(', ');
  const replacementTokens = payloadColumns.map((column) => `:${column}`).join(', ');

  await sequelize.query(
    `INSERT INTO ${wrapIdentifier(table)} (${fieldList}) VALUES (${replacementTokens})`,
    {
      replacements: payloadColumns.reduce((acc, key) => {
        acc[key] = payload[key];
        return acc;
      }, {}),
      type: QueryTypes.INSERT
    }
  );

  return {
    title,
    details,
    date,
    posted: postedBy,
    target_audience: Array.isArray(targetAudience)
      ? targetAudience.map((v) => String(v).trim().toLowerCase()).join(',')
      : String(targetAudience || 'all').trim().toLowerCase()
  };
}

async function getNoticeById({ nid, schoolId } = {}) {
  const table = await resolveNoticeStorageTable();
  if (!table) {
    throw new AppError('Notice storage table is not configured', 500);
  }

  const columns = await getTableColumns(table);
  const idColumn = resolveNoticeIdColumn(columns);
  if (!idColumn) {
    throw new AppError('Notice identifier column is not configured', 500);
  }

  const parsedNid = Number(nid);
  if (!Number.isFinite(parsedNid)) {
    throw new AppError('Invalid notice ID', 400);
  }

  const scoped = buildDeleteScope(columns, schoolId);
  const whereClause = buildWhereClause([`${wrapIdentifier(idColumn)} = :nid`, ...scoped.clauses]);
  const replacements = { nid: parsedNid, ...scoped.replacements };

  const rows = await sequelize.query(
    `SELECT * FROM ${wrapIdentifier(table)} ${whereClause} LIMIT 1`,
    {
      replacements,
      type: QueryTypes.SELECT
    }
  );

  if (!rows?.length) {
    throw new AppError('Notice not found', 404);
  }

  return mapNotice(rows[0]);
}

async function updateNotice({ nid, title, details, date, userId, schoolId, targetAudience } = {}) {
  const table = await resolveNoticeStorageTable();
  if (!table) {
    throw new AppError('Notice storage table is not configured', 500);
  }

  const columns = await getTableColumns(table);
  const idColumn = resolveNoticeIdColumn(columns);
  if (!idColumn) {
    throw new AppError('Notice identifier column is not configured', 500);
  }

  const parsedNid = Number(nid);
  if (!Number.isFinite(parsedNid)) {
    throw new AppError('Invalid notice ID', 400);
  }

  const payload = buildUpdateNoticePayload(columns, {
    title,
    details,
    date,
    userId,
    targetAudience
  });
  const payloadColumns = Object.keys(payload);
  if (payloadColumns.length === 0) {
    throw new AppError('Unable to map notice payload to table columns', 500);
  }

  const scoped = buildDeleteScope(columns, schoolId);
  const whereClause = buildWhereClause([`${wrapIdentifier(idColumn)} = :nid`, ...scoped.clauses]);

  const assignments = payloadColumns.map((column) => `${wrapIdentifier(column)} = :${column}`);
  if (columns.has('updated_at')) {
    assignments.push('updated_at = CURRENT_TIMESTAMP');
  }

  const replacements = {
    nid: parsedNid,
    ...payload,
    ...scoped.replacements
  };

  const result = await sequelize.query(
    `UPDATE ${wrapIdentifier(table)} SET ${assignments.join(', ')} ${whereClause}`,
    {
      replacements,
      type: QueryTypes.UPDATE
    }
  );

  const affected = Array.isArray(result)
    ? Number(result[1] ?? result[0] ?? 0)
    : Number(result ?? 0);
  if (!affected || Number(affected) < 1) {
    throw new AppError('Notice not found', 404);
  }

  return getNoticeById({ nid: parsedNid, schoolId });
}

async function deleteNotice({ nid, schoolId } = {}) {
  const table = await resolveNoticeStorageTable();
  if (!table) {
    throw new AppError('Notice storage table is not configured', 500);
  }

  const columns = await getTableColumns(table);
  const idColumn = resolveNoticeIdColumn(columns);
  if (!idColumn) {
    throw new AppError('Notice identifier column is not configured', 500);
  }

  const parsedNid = Number(nid);
  if (!Number.isFinite(parsedNid)) {
    throw new AppError('Invalid notice ID', 400);
  }

  const scoped = buildDeleteScope(columns, schoolId);
  const baseClauses = [`${wrapIdentifier(idColumn)} = :nid`, ...scoped.clauses];
  const whereClause = buildWhereClause(baseClauses);
  const replacements = { nid: parsedNid, ...scoped.replacements };

  if (columns.has('deleted_at')) {
    const updateFields = ['deleted_at = CURRENT_TIMESTAMP'];
    if (columns.has('updated_at')) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
    }

    const result = await sequelize.query(
      `UPDATE ${wrapIdentifier(table)} SET ${updateFields.join(', ')} ${whereClause}`,
      {
        replacements,
        type: QueryTypes.UPDATE
      }
    );

    const affected = Array.isArray(result)
      ? Number(result[1] ?? result[0] ?? 0)
      : Number(result ?? 0);
    if (!affected || Number(affected) < 1) {
      throw new AppError('Notice not found', 404);
    }
  } else {
    const result = await sequelize.query(
      `DELETE FROM ${wrapIdentifier(table)} ${whereClause}`,
      {
        replacements,
        type: QueryTypes.DELETE
      }
    );

    const affected = Array.isArray(result)
      ? Number(result[1] ?? result[0] ?? 0)
      : Number(result ?? 0);
    if (!affected || Number(affected) < 1) {
      throw new AppError('Notice not found', 404);
    }
  }

  return {
    nid: parsedNid
  };
}

async function getUnreadNoticeCount({ userId, schoolId, roleName } = {}) {
  if (!userId) {
    return { unreadCount: 0 };
  }

  const table = await resolveNoticeStorageTable();
  if (!table) {
    return { unreadCount: 0 };
  }

  const columns = await getTableColumns(table);
  const scoped = buildCommunicationScope(columns, { schoolId, roleName });
  const idColumn = pickFirstColumn(columns, ['id', 'nid', 'notice_id']);
  if (!idColumn) {
    return { unreadCount: 0 };
  }

  const whereClause = buildWhereClause([
    columns.has('deleted_at') ? 'deleted_at IS NULL' : null,
    columns.has('is_published') ? 'is_published = TRUE' : null,
    ...scoped.clauses,
    `${wrapIdentifier(idColumn)} NOT IN (SELECT notice_id FROM notice_reads WHERE user_id = :userId)`
  ]);

  const countRows = await sequelize.query(
    `SELECT COUNT(*) AS total FROM ${wrapIdentifier(table)} ${whereClause}`,
    {
      replacements: { userId, ...scoped.replacements },
      type: QueryTypes.SELECT
    }
  );

  return { unreadCount: countRows?.[0]?.total ? Number(countRows[0].total) : 0 };
}

async function getUnreadNotices({ userId, schoolId, roleName, limit = 5 } = {}) {
  if (!userId) {
    return { notices: [], unreadCount: 0 };
  }

  const table = await resolveNoticeStorageTable();
  if (!table) {
    return { notices: [], unreadCount: 0 };
  }

  const columns = await getTableColumns(table);
  const scoped = buildCommunicationScope(columns, { schoolId, roleName });
  const idColumn = pickFirstColumn(columns, ['id', 'nid', 'notice_id']);
  if (!idColumn) {
    return { notices: [], unreadCount: 0 };
  }

  const unreadClause = `${wrapIdentifier(idColumn)} NOT IN (SELECT notice_id FROM notice_reads WHERE user_id = :userId)`;
  const whereClause = buildWhereClause([
    columns.has('deleted_at') ? 'deleted_at IS NULL' : null,
    columns.has('is_published') ? 'is_published = TRUE' : null,
    ...scoped.clauses,
    unreadClause
  ]);
  const orderColumn = pickOrderColumn(columns, NOTICE_ORDER_COLUMNS);
  const orderClause = orderColumn ? `ORDER BY ${wrapIdentifier(orderColumn)} DESC` : '';
  const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 5, 20));

  const [rows, countRows] = await Promise.all([
    sequelize.query(
      `SELECT * FROM ${wrapIdentifier(table)} ${whereClause} ${orderClause} LIMIT :lim`,
      {
        replacements: { userId, lim: parsedLimit, ...scoped.replacements },
        type: QueryTypes.SELECT
      }
    ),
    sequelize.query(
      `SELECT COUNT(*) AS total FROM ${wrapIdentifier(table)} ${whereClause}`,
      {
        replacements: { userId, ...scoped.replacements },
        type: QueryTypes.SELECT
      }
    )
  ]);

  const unreadCount = countRows?.[0]?.total ? Number(countRows[0].total) : 0;

  return {
    notices: rows.map(mapNotice),
    unreadCount
  };
}

async function markNoticeRead({ noticeId, userId } = {}) {
  if (!noticeId || !userId) {
    throw new AppError('Notice ID and User ID are required', 400);
  }

  await sequelize.query(
    `INSERT INTO notice_reads (notice_id, user_id) VALUES (:noticeId, :userId) ON CONFLICT (notice_id, user_id) DO NOTHING`,
    {
      replacements: { noticeId: parseInt(noticeId, 10), userId: parseInt(userId, 10) },
      type: QueryTypes.INSERT
    }
  );

  return { marked: true };
}

module.exports = {
  listNotices,
  listEvents,
  listEventRegistrations,
  attendEvent,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  getUnreadNoticeCount,
  getUnreadNotices,
  markNoticeRead
};
