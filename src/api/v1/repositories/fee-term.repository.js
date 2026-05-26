const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { AppError } = require('../../../middleware/error.middleware');
const { tableExists, getTableColumns, resetSchemaCache } = require('./helpers/schema.utils');

class FeeTermRepository {
  async ensureSchema() {
    const feeTermsExists = await tableExists('fee_terms');

    if (!feeTermsExists) {
      await sequelize.query(
        `
          CREATE TABLE IF NOT EXISTS fee_terms (
            id SERIAL PRIMARY KEY,
            school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
            name VARCHAR(80) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            due_date DATE NOT NULL,
            late_fee_per_day DECIMAL(10,2) NOT NULL DEFAULT 0,
            late_fee_max DECIMAL(10,2) NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 1,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT fee_terms_dates_check CHECK (end_date >= start_date),
            CONSTRAINT fee_terms_due_date_check CHECK (due_date >= start_date AND due_date <= end_date),
            CONSTRAINT uq_fee_terms_name_per_year UNIQUE (school_id, academic_year_id, name)
          )
        `
      );

      await sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_fee_terms_school_year ON fee_terms(school_id, academic_year_id)'
      );
      await sequelize.query(
        'CREATE INDEX IF NOT EXISTS idx_fee_terms_sort_order ON fee_terms(academic_year_id, sort_order)'
      );

      resetSchemaCache();
    }
  }

  async list(filters = {}, context = {}) {
    await this.ensureSchema();

    const where = ['school_id = :schoolId'];
    const replacements = {
      schoolId: context.schoolId,
      isActive: true
    };

    if (filters.academicYearId) {
      where.push('academic_year_id = :academicYearId');
      replacements.academicYearId = filters.academicYearId;
    }

    if (!filters.includeInactive) {
      where.push('is_active = :isActive');
    }

    return sequelize.query(
      `
        SELECT
          id,
          school_id,
          academic_year_id,
          name,
          start_date,
          end_date,
          due_date,
          late_fee_per_day,
          late_fee_max,
          sort_order,
          is_active,
          created_at,
          updated_at
        FROM fee_terms
        WHERE ${where.join(' AND ')}
        ORDER BY academic_year_id DESC, sort_order ASC, id ASC
      `,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );
  }

  async findById(id, context = {}) {
    await this.ensureSchema();

    const rows = await sequelize.query(
      `
        SELECT
          id,
          school_id,
          academic_year_id,
          name,
          start_date,
          end_date,
          due_date,
          late_fee_per_day,
          late_fee_max,
          sort_order,
          is_active,
          created_at,
          updated_at
        FROM fee_terms
        WHERE id = :id
          AND school_id = :schoolId
        LIMIT 1
      `,
      {
        replacements: {
          id,
          schoolId: context.schoolId
        },
        type: QueryTypes.SELECT
      }
    );

    return rows[0] || null;
  }

  async create(payload = {}, context = {}) {
    await this.ensureSchema();

    const now = new Date();

    await sequelize.query(
      `
        INSERT INTO fee_terms (
          school_id,
          academic_year_id,
          name,
          start_date,
          end_date,
          due_date,
          late_fee_per_day,
          late_fee_max,
          sort_order,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          :schoolId,
          :academicYearId,
          :name,
          :startDate,
          :endDate,
          :dueDate,
          :lateFeePerDay,
          :lateFeeMax,
          :sortOrder,
          :isActive,
          :createdAt,
          :updatedAt
        )
      `,
      {
        replacements: {
          schoolId: context.schoolId,
          academicYearId: payload.academicYearId,
          name: payload.name,
          startDate: payload.startDate,
          endDate: payload.endDate,
          dueDate: payload.dueDate,
          lateFeePerDay: payload.lateFeePerDay,
          lateFeeMax: payload.lateFeeMax,
          sortOrder: payload.sortOrder,
          isActive: payload.isActive,
          createdAt: now,
          updatedAt: now
        },
        type: QueryTypes.INSERT
      }
    );

    const rows = await sequelize.query(
      `
        SELECT
          id,
          school_id,
          academic_year_id,
          name,
          start_date,
          end_date,
          due_date,
          late_fee_per_day,
          late_fee_max,
          sort_order,
          is_active,
          created_at,
          updated_at
        FROM fee_terms
        WHERE school_id = :schoolId
          AND academic_year_id = :academicYearId
          AND LOWER(name) = LOWER(:name)
        ORDER BY id DESC
        LIMIT 1
      `,
      {
        replacements: {
          schoolId: context.schoolId,
          academicYearId: payload.academicYearId,
          name: payload.name
        },
        type: QueryTypes.SELECT
      }
    );

    return rows[0] || null;
  }

  async update(id, payload = {}, context = {}) {
    await this.ensureSchema();

    const existing = await this.findById(id, context);
    if (!existing) {
      throw new AppError('Fee term not found', 404);
    }

    const setClauses = [];
    const replacements = {
      id,
      schoolId: context.schoolId,
      updatedAt: new Date()
    };

    if (typeof payload.name !== 'undefined') {
      setClauses.push('name = :name');
      replacements.name = payload.name;
    }

    if (typeof payload.startDate !== 'undefined') {
      setClauses.push('start_date = :startDate');
      replacements.startDate = payload.startDate;
    }

    if (typeof payload.endDate !== 'undefined') {
      setClauses.push('end_date = :endDate');
      replacements.endDate = payload.endDate;
    }

    if (typeof payload.dueDate !== 'undefined') {
      setClauses.push('due_date = :dueDate');
      replacements.dueDate = payload.dueDate;
    }

    if (typeof payload.lateFeePerDay !== 'undefined') {
      setClauses.push('late_fee_per_day = :lateFeePerDay');
      replacements.lateFeePerDay = payload.lateFeePerDay;
    }

    if (typeof payload.lateFeeMax !== 'undefined') {
      setClauses.push('late_fee_max = :lateFeeMax');
      replacements.lateFeeMax = payload.lateFeeMax;
    }

    if (typeof payload.sortOrder !== 'undefined') {
      setClauses.push('sort_order = :sortOrder');
      replacements.sortOrder = payload.sortOrder;
    }

    if (typeof payload.isActive !== 'undefined') {
      setClauses.push('is_active = :isActive');
      replacements.isActive = payload.isActive;
    }

    if (typeof payload.academicYearId !== 'undefined') {
      setClauses.push('academic_year_id = :academicYearId');
      replacements.academicYearId = payload.academicYearId;
    }

    if (setClauses.length === 0) {
      return existing;
    }

    setClauses.push('updated_at = :updatedAt');

    await sequelize.query(
      `
        UPDATE fee_terms
        SET ${setClauses.join(', ')}
        WHERE id = :id
          AND school_id = :schoolId
      `,
      {
        replacements,
        type: QueryTypes.UPDATE
      }
    );

    return this.findById(id, context);
  }

  async delete(id, context = {}) {
    await this.ensureSchema();

    const existing = await this.findById(id, context);
    if (!existing) {
      throw new AppError('Fee term not found', 404);
    }

    await sequelize.query(
      `
        DELETE FROM fee_terms
        WHERE id = :id
          AND school_id = :schoolId
      `,
      {
        replacements: {
          id,
          schoolId: context.schoolId
        },
        type: QueryTypes.DELETE
      }
    );

    return {
      id,
      deleted: true
    };
  }
}

module.exports = new FeeTermRepository();
