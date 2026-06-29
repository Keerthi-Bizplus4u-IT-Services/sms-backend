const { sequelize, School, SchoolBranch, SchoolSetting } = require('../../../models');

let settingsStorageReady = false;
let settingsStorageInitPromise = null;

const ensureSchoolSettingsStorage = async () => {
  if (settingsStorageReady) {
    return;
  }

  if (!settingsStorageInitPromise) {
    settingsStorageInitPromise = (async () => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS school_settings (
          id SERIAL PRIMARY KEY,
          school_id INTEGER NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
          transport_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          stock_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          hostel_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          bunny_cdn_api_key VARCHAR(255) DEFAULT NULL,
          bunny_cdn_storage_zone VARCHAR(255) DEFAULT NULL,
          bunny_cdn_pull_zone VARCHAR(255) DEFAULT NULL,
          bunny_cdn_storage_zone_name VARCHAR(255) DEFAULT NULL,
          smtp_host VARCHAR(255) DEFAULT NULL,
          smtp_port INTEGER DEFAULT NULL,
          smtp_user VARCHAR(255) DEFAULT NULL,
          smtp_password VARCHAR(255) DEFAULT NULL,
          smtp_from_email VARCHAR(255) DEFAULT NULL,
          smtp_from_name VARCHAR(255) DEFAULT NULL,
          smtp_secure BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      // Add new columns if they don't exist (for existing tables)
      const newColumns = [
        { name: 'bunny_cdn_api_key', type: 'VARCHAR(255) DEFAULT NULL' },
        { name: 'bunny_cdn_storage_zone', type: 'VARCHAR(255) DEFAULT NULL' },
        { name: 'bunny_cdn_pull_zone', type: 'VARCHAR(255) DEFAULT NULL' },
        { name: 'bunny_cdn_storage_zone_name', type: 'VARCHAR(255) DEFAULT NULL' },
        { name: 'smtp_host', type: 'VARCHAR(255) DEFAULT NULL' },
        { name: 'smtp_port', type: 'INTEGER DEFAULT NULL' },
        { name: 'smtp_user', type: 'VARCHAR(255) DEFAULT NULL' },
        { name: 'smtp_password', type: 'VARCHAR(255) DEFAULT NULL' },
        { name: 'smtp_from_email', type: 'VARCHAR(255) DEFAULT NULL' },
        { name: 'smtp_from_name', type: 'VARCHAR(255) DEFAULT NULL' },
        { name: 'smtp_secure', type: 'BOOLEAN NOT NULL DEFAULT TRUE' },
      ];

      for (const col of newColumns) {
        await sequelize.query(`
          DO $$ BEGIN
            ALTER TABLE school_settings ADD COLUMN ${col.name} ${col.type};
          EXCEPTION WHEN duplicate_column THEN NULL;
          END $$;
        `);
      }

      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_school_settings_transport_enabled ON school_settings(transport_enabled);');
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_school_settings_stock_enabled ON school_settings(stock_enabled);');
      await sequelize.query('CREATE INDEX IF NOT EXISTS idx_school_settings_hostel_enabled ON school_settings(hostel_enabled);');

      settingsStorageReady = true;
    })();
  }

  await settingsStorageInitPromise;
};

const schoolRepository = {
  async findAll({ includeInactive = false, schoolId = null } = {}) {
    const where = {};
    if (schoolId) {
      where.id = schoolId;
    }
    if (!includeInactive) {
      where.is_active = true;
    }
    return School.findAll({
      where,
      include: [{ model: SchoolBranch, as: 'branches' }],
      order: [['name', 'ASC']]
    });
  },

  async findById(id) {
    return School.findByPk(id, {
      include: [{ model: SchoolBranch, as: 'branches' }]
    });
  },

  async findByIdScoped(id, schoolId = null) {
    const where = { id };
    if (Number.isInteger(schoolId) && schoolId > 0) {
      where.id = schoolId;
    }

    return School.findOne({
      where,
      include: [{ model: SchoolBranch, as: 'branches' }]
    });
  },

  async findByCode(code) {
    return School.findOne({
      where: { code }
    });
  },

  async create(data) {
    return School.create(data);
  },

  async update(id, data) {
    const school = await School.findByPk(id);
    if (!school) return null;
    return school.update(data);
  },

  async updateScoped(id, data, schoolId = null) {
    const where = { id };
    if (Number.isInteger(schoolId) && schoolId > 0) {
      where.id = schoolId;
    }

    const school = await School.findOne({ where });
    if (!school) return null;
    return school.update(data);
  },

  async delete(id) {
    const school = await School.findByPk(id);
    if (!school) return null;
    await school.destroy();
    return true;
  },

  async deleteScoped(id, schoolId = null) {
    const where = { id };
    if (Number.isInteger(schoolId) && schoolId > 0) {
      where.id = schoolId;
    }

    const school = await School.findOne({ where });
    if (!school) return null;
    await school.destroy();
    return true;
  }
};

const schoolBranchRepository = {
  async create(data) {
    return SchoolBranch.create(data);
  },

  async findById(id) {
    return SchoolBranch.findByPk(id);
  },

  async findByCodeWithinSchool(schoolId, code) {
    return SchoolBranch.findOne({
      where: {
        school_id: schoolId,
        code
      }
    });
  },

  async findByNameWithinSchool(schoolId, name) {
    return SchoolBranch.findOne({
      where: {
        school_id: schoolId,
        name
      }
    });
  },

  async listBySchool(schoolId, { includeInactive = true } = {}) {
    const where = { school_id: schoolId };
    if (!includeInactive) {
      where.is_active = true;
    }
    return SchoolBranch.findAll({
      where,
      order: [['name', 'ASC']]
    });
  }
};

const schoolSettingsRepository = {
  async findBySchoolId(schoolId) {
    await ensureSchoolSettingsStorage();
    return SchoolSetting.findOne({
      where: { school_id: schoolId }
    });
  },

  async findOrCreateBySchoolId(schoolId, defaults = {}) {
    await ensureSchoolSettingsStorage();
    const [settings] = await SchoolSetting.findOrCreate({
      where: { school_id: schoolId },
      defaults: {
        school_id: schoolId,
        transport_enabled: false,
        stock_enabled: false,
        hostel_enabled: false,
        ...defaults
      }
    });
    return settings;
  },

  async updateBySchoolId(schoolId, data) {
    await ensureSchoolSettingsStorage();
    const settings = await this.findOrCreateBySchoolId(schoolId);
    return settings.update(data);
  }
};

module.exports = {
  schoolRepository,
  schoolBranchRepository,
  schoolSettingsRepository
};
