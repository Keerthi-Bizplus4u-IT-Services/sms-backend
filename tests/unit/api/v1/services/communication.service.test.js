/**
 * Unit tests for CommunicationService pagination helpers
 */

jest.mock('../../../../../src/config/database', () => {
  const queryMock = jest.fn();
  return {
    sequelize: {
      query: queryMock,
      getDialect: jest.fn(() => 'postgres')
    },
    Sequelize: {
      QueryTypes: {
        SELECT: 'SELECT',
        INSERT: 'INSERT',
        UPDATE: 'UPDATE',
        DELETE: 'DELETE',
        RAW: 'RAW'
      }
    }
  };
});

jest.mock('../../../../../src/api/v1/repositories/helpers/schema.utils', () => ({
  resolveTableName: jest.fn(),
  getTableColumns: jest.fn(),
  resetSchemaCache: jest.fn()
}));

const { sequelize } = require('../../../../../src/config/database');
const {
  resolveTableName,
  getTableColumns,
  resetSchemaCache
} = require('../../../../../src/api/v1/repositories/helpers/schema.utils');
const communicationService = require('../../../../../src/api/v1/services/communication.service');

describe('CommunicationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.query.mockReset();
    resolveTableName.mockReset();
    getTableColumns.mockReset();
    resetSchemaCache.mockReset();
  });

  const buildRows = (count, mapper) =>
    Array.from({ length: count }).map((_, index) => mapper(index));

  describe('listNotices', () => {
    it('should paginate notices with provided page and limit', async () => {
      resolveTableName.mockResolvedValueOnce('notice');
      getTableColumns.mockResolvedValueOnce(
        new Set(['nid', 'title', 'posted', 'date', 'details'])
      );

      const rows = buildRows(10, (idx) => ({
        nid: idx + 1,
        title: `Notice ${idx + 1}`,
        posted: 'Admin',
        date: `2024-04-${idx + 1}`,
        details: 'Details'
      }));

      sequelize.query
        .mockResolvedValueOnce(rows)
        .mockResolvedValueOnce([{ total: 42 }]);

      const result = await communicationService.listNotices({ page: 3, limit: 5 });

      expect(sequelize.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM "notice"'),
        expect.objectContaining({
          replacements: { limit: 5, offset: 10 },
          type: 'SELECT'
        })
      );
      expect(sequelize.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('FROM "notice"'),
        expect.objectContaining({ type: 'SELECT' })
      );
      expect(result.notices).toHaveLength(10);
      expect(result.total).toBe(42);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(9);
    });

    it('should apply school and transport audience filters when target_audience column exists', async () => {
      resolveTableName.mockResolvedValueOnce('notices');
      getTableColumns.mockResolvedValueOnce(
        new Set(['id', 'title', 'date', 'details', 'school_id', 'target_audience', 'is_published'])
      );

      sequelize.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }]);

      await communicationService.listNotices({
        page: 1,
        limit: 10,
        schoolId: 7,
        roleName: 'transport'
      });

      expect(sequelize.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('school_id = :schoolId'),
        expect.objectContaining({
          replacements: expect.objectContaining({
            schoolId: 7,
            audiences: ['all', 'transport', 'staff', 'non_teaching_staff']
          }),
          type: 'SELECT'
        })
      );
      expect(sequelize.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('LOWER(TRIM(target_audience)) IN (:audiences)'),
        expect.objectContaining({
          replacements: expect.objectContaining({
            schoolId: 7,
            audiences: ['all', 'transport', 'staff', 'non_teaching_staff']
          }),
          type: 'SELECT'
        })
      );
    });

    it('should not apply audience filter for admin role', async () => {
      resolveTableName.mockResolvedValueOnce('notices');
      getTableColumns.mockResolvedValueOnce(
        new Set(['id', 'title', 'date', 'details', 'target_audience'])
      );

      sequelize.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }]);

      await communicationService.listNotices({ page: 1, limit: 10, roleName: 'admin' });

      expect(sequelize.query).toHaveBeenNthCalledWith(
        1,
        expect.not.stringContaining('target_audience IN (:audiences)'),
        expect.objectContaining({
          replacements: expect.not.objectContaining({ audiences: expect.anything() }),
          type: 'SELECT'
        })
      );
    });
  });

  describe('listEvents', () => {
    it('should clamp limit to max value and calculate pagination metadata', async () => {
      resolveTableName.mockResolvedValueOnce('postevent');
      getTableColumns.mockResolvedValueOnce(
        new Set(['eid', 'ename', 'sdate', 'edate', 'stime', 'etime', 'location', 'dis', 'enote', 'tname'])
      );

      const rows = buildRows(50, (idx) => ({
        eid: idx + 1,
        ename: `Event ${idx + 1}`,
        sdate: `2024-05-${idx + 1}`,
        edate: `2024-05-${idx + 1}`,
        location: 'Auditorium'
      }));

      sequelize.query
        .mockResolvedValueOnce(rows)
        .mockResolvedValueOnce([{ total: 120 }]);

      const result = await communicationService.listEvents({ page: 1, limit: 200 });

      expect(sequelize.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM "postevent"'),
        expect.objectContaining({
          replacements: { limit: 50, offset: 0 },
          type: 'SELECT'
        })
      );
      expect(result.events).toHaveLength(50);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(Math.ceil(120 / 50));
    });

    it('should fall back to exam schedules when no event table is available', async () => {
      resolveTableName
        .mockResolvedValueOnce(null) // primary event table
        .mockResolvedValueOnce('exam_schedules')
        .mockResolvedValueOnce('exams')
        .mockResolvedValueOnce('classes');
      getTableColumns.mockResolvedValueOnce(new Set(['id', 'name']));

      const rows = [
        {
          event_id: 777,
          exam_name: 'Mid Term Assessment',
          exam_type: 'mid_term',
          exam_date: '2025-01-15',
          start_time: '09:00:00',
          end_time: '11:00:00',
          class_name: 'Grade 8'
        }
      ];

      sequelize.query
        .mockResolvedValueOnce(rows)
        .mockResolvedValueOnce([{ total: 1 }]);

      const result = await communicationService.listEvents({ page: 1, limit: 5 });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].ename).toContain('Mid Term Assessment');
      expect(result.total).toBe(1);
    });
  });

  describe('createNotice', () => {
    it('should insert notice with mapped columns and return normalized payload', async () => {
      resolveTableName.mockResolvedValueOnce('notice');
      getTableColumns.mockResolvedValueOnce(
        new Set(['nid', 'title', 'details', 'date', 'posted', 'created_by', 'school_id'])
      );
      sequelize.query.mockResolvedValueOnce([1, 1]);

      const result = await communicationService.createNotice({
        title: 'Result Announcement',
        details: 'Term results will be published tomorrow',
        date: '2026-03-23',
        postedBy: 'Jane Doe',
        userId: 11,
        schoolId: 2
      });

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "notice"'),
        expect.objectContaining({
          replacements: expect.objectContaining({
            title: 'Result Announcement',
            details: 'Term results will be published tomorrow',
            date: '2026-03-23',
            posted: 'Jane Doe',
            created_by: 11,
            school_id: 2
          }),
          type: 'INSERT'
        })
      );
      expect(result).toEqual({
        title: 'Result Announcement',
        details: 'Term results will be published tomorrow',
        date: '2026-03-23',
        posted: 'Jane Doe',
        target_audience: 'all'
      });
    });

    it('should fall back to event-style table when notice table is unavailable', async () => {
      resolveTableName
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('events');
      getTableColumns.mockResolvedValueOnce(
        new Set(['eid', 'ename', 'enote', 'sdate', 'edate', 'tname'])
      );
      sequelize.query.mockResolvedValueOnce([1, 1]);

      const result = await communicationService.createNotice({
        title: 'Holiday Circular',
        details: 'School remains closed on Friday',
        date: '2026-03-27',
        postedBy: 'Admin User'
      });

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "events"'),
        expect.objectContaining({
          replacements: expect.objectContaining({
            ename: 'Holiday Circular',
            enote: 'School remains closed on Friday',
            sdate: '2026-03-27',
            edate: '2026-03-27',
            tname: 'Admin User'
          }),
          type: 'INSERT'
        })
      );
      expect(result).toEqual({
        title: 'Holiday Circular',
        details: 'School remains closed on Friday',
        date: '2026-03-27',
        posted: 'Admin User',
        target_audience: 'all'
      });
    });
  });

  describe('getNoticeById', () => {
    it('should fetch notice by id and return normalized payload', async () => {
      resolveTableName.mockResolvedValueOnce('notice');
      getTableColumns.mockResolvedValueOnce(new Set(['nid', 'title', 'details', 'date', 'posted', 'deleted_at']));
      sequelize.query.mockResolvedValueOnce([
        {
          nid: 8,
          title: 'Circular',
          details: 'School reopens Monday',
          date: '2026-03-25',
          posted: 'Admin'
        }
      ]);

      const result = await communicationService.getNoticeById({ nid: '8' });

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM "notice"'),
        expect.objectContaining({
          replacements: { nid: 8 },
          type: 'SELECT'
        })
      );
      expect(result).toEqual({
        nid: 8,
        title: 'Circular',
        details: 'School reopens Monday',
        date: '2026-03-25',
        posted: 'Admin',
        target_audience: 'all'
      });
    });
  });

  describe('updateNotice', () => {
    it('should update notice fields and return normalized payload', async () => {
      resolveTableName.mockResolvedValue('notice');
      getTableColumns
        .mockResolvedValueOnce(new Set(['nid', 'title', 'details', 'date', 'updated_by', 'updated_at', 'deleted_at']))
        .mockResolvedValueOnce(new Set(['nid', 'title', 'details', 'date', 'posted', 'deleted_at']));

      sequelize.query
        .mockResolvedValueOnce([0, 1])
        .mockResolvedValueOnce([
          {
            nid: 5,
            title: 'Updated Notice',
            details: 'Updated Details',
            date: '2026-03-28',
            posted: 'Admin'
          }
        ]);

      const result = await communicationService.updateNotice({
        nid: '5',
        title: 'Updated Notice',
        details: 'Updated Details',
        date: '2026-03-28',
        userId: 44
      });

      expect(sequelize.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('UPDATE "notice" SET "title" = :title, "details" = :details, "date" = :date, "updated_by" = :updated_by, updated_at = CURRENT_TIMESTAMP'),
        expect.objectContaining({
          replacements: expect.objectContaining({
            nid: 5,
            title: 'Updated Notice',
            details: 'Updated Details',
            date: '2026-03-28',
            updated_by: 44
          }),
          type: 'UPDATE'
        })
      );
      expect(result).toEqual({
        nid: 5,
        title: 'Updated Notice',
        details: 'Updated Details',
        date: '2026-03-28',
        posted: 'Admin',
        target_audience: 'all'
      });
    });

  });

  describe('deleteNotice', () => {
    it('should soft delete a notice when deleted_at exists', async () => {
      resolveTableName.mockResolvedValueOnce('notice');
      getTableColumns.mockResolvedValueOnce(new Set(['nid', 'deleted_at', 'updated_at', 'school_id']));
      sequelize.query.mockResolvedValueOnce([0, 1]);

      const result = await communicationService.deleteNotice({ nid: '10', schoolId: 7 });

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "notice" SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP'),
        expect.objectContaining({
          replacements: { nid: 10, schoolId: 7 },
          type: 'UPDATE'
        })
      );
      expect(result).toEqual({ nid: 10 });
    });

    it('should hard delete a notice when deleted_at is unavailable', async () => {
      resolveTableName.mockResolvedValueOnce('notices');
      getTableColumns.mockResolvedValueOnce(new Set(['id']));
      sequelize.query.mockResolvedValueOnce(1);

      const result = await communicationService.deleteNotice({ nid: 5 });

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "notices" WHERE "id" = :nid'),
        expect.objectContaining({
          replacements: { nid: 5 },
          type: 'DELETE'
        })
      );
      expect(result).toEqual({ nid: 5 });
    });
  });
});
