#!/usr/bin/env node

const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const pgConfig = {
  host: process.env.PG_DB_HOST || '127.0.0.1',
  port: Number(process.env.PG_DB_PORT || 5432),
  user: process.env.PG_DB_USER || 'postgres',
  password: process.env.PG_DB_PASSWORD || 'postgres',
  database: process.env.PG_DB_NAME || 'sms'
};

// Add SSL configuration if needed (for Neon, AWS RDS, etc.)
if (process.env.PG_DB_SSL === 'true') {
  pgConfig.ssl = {
    require: true,
    rejectUnauthorized: false
  };
}

function qIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function ensureDatabaseExists() {
  // For cloud-managed databases (Neon, AWS RDS), skip database creation
  // as the database already exists and we may not have admin privileges
  if (process.env.PG_DB_SSL === 'true') {
    console.log(`Using existing cloud database: ${pgConfig.database}`);
    return;
  }

  const adminClient = new Client({
    host: pgConfig.host,
    port: pgConfig.port,
    user: pgConfig.user,
    password: pgConfig.password,
    database: process.env.PG_ADMIN_DB || 'postgres'
  });

  await adminClient.connect();
  try {
    const exists = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [pgConfig.database]);
    if (exists.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE ${qIdent(pgConfig.database)}`);
      console.log(`Created PostgreSQL database: ${pgConfig.database}`);
    } else {
      console.log(`PostgreSQL database already exists: ${pgConfig.database}`);
    }
  } finally {
    await adminClient.end();
  }
}

function normalizeTableName(name) {
  if (!name) {
    return null;
  }
  if (typeof name === 'string') {
    return name;
  }
  if (typeof name === 'object' && name.tableName) {
    return name.tableName;
  }
  return String(name);
}

function buildValue(attrName, attr, modelName, index) {
  const typeKey = attr?.type?.key;
  const enumValues = attr?.values || attr?.type?.values;
  const maxLength = attr?.type?.options?.length || attr?.type?._length;

  const fit = (value) => {
    if (typeof value !== 'string') {
      return value;
    }
    if (!maxLength || value.length <= maxLength) {
      return value;
    }
    return value.slice(0, maxLength);
  };

  if (Array.isArray(enumValues) && enumValues.length > 0) {
    return enumValues[0];
  }

  if (attrName === 'start_date') {
    return '2026-01-01';
  }
  if (attrName === 'end_date') {
    return '2026-12-31';
  }
  if (attrName === 'admission_date') {
    return '2026-06-01';
  }
  if (attrName === 'join_date' || attrName === 'joining_date') {
    return '2026-05-01';
  }

  if (/email/i.test(attrName)) {
    return fit(`seed_${modelName.toLowerCase()}_${index}@example.com`);
  }
  if (/password/i.test(attrName)) {
    return 'Admin@123';
  }
  if (/phone|mobile/i.test(attrName)) {
    return fit(`900000${String(index).padStart(4, '0')}`);
  }
  if (/code/i.test(attrName)) {
    return fit(`${modelName.toUpperCase()}_${String(index).padStart(3, '0')}`);
  }
  if (/name/i.test(attrName)) {
    return fit(`${modelName} Seed ${index}`);
  }
  if (/room_number/i.test(attrName)) {
    return fit(`R${String(index).padStart(3, '0')}`);
  }
  if (/status/i.test(attrName)) {
    return 'active';
  }

  switch (typeKey) {
    case 'STRING':
    case 'TEXT':
    case 'CHAR':
    case 'UUID':
      return fit(`${modelName}_${attrName}_${index}`);
    case 'BOOLEAN':
      return true;
    case 'DATE':
      return new Date();
    case 'DATEONLY':
      return '2026-01-01';
    case 'TIME':
      return '09:00:00';
    case 'INTEGER':
    case 'BIGINT':
    case 'TINYINT':
    case 'SMALLINT':
      return 1;
    case 'FLOAT':
    case 'DOUBLE':
    case 'DECIMAL':
      return 1.0;
    case 'JSON':
    case 'JSONB':
      return {};
    default:
      return fit(`${modelName}_${attrName}_${index}`);
  }
}

async function seedAllTables() {
  const db = require('../src/models');
  const { sequelize } = db;

  const models = Object.entries(db)
    .filter(([name, model]) => name !== 'sequelize' && model && typeof model.create === 'function')
    .map(([name, model]) => ({ name, model }));

  await sequelize.authenticate();
  await sequelize.sync({ force: true });
  console.log('Schema synchronized on PostgreSQL (force: true).');

  const modelByTable = new Map();
  for (const item of models) {
    modelByTable.set(normalizeTableName(item.model.getTableName()), item);
  }

  const createdRows = new Map();
  const pending = new Map(models.map((m) => [m.name, m]));

  // Seed mandatory auth roots first so FK-dependent rows can be generated.
  if (db.Role) {
    const role = await db.Role.create({
      id: 1,
      name: 'ADMIN',
      description: 'Seed admin role'
    });
    createdRows.set(normalizeTableName(db.Role.getTableName()), role);
    pending.delete('Role');
    console.log(`Seeded Role -> ${normalizeTableName(db.Role.getTableName())}`);
  }

  if (db.User) {
    const user = await db.User.create({
      email: 'seed_admin@example.com',
      password_hash: 'Admin@123',
      role_id: 1,
      is_active: true
    });
    createdRows.set(normalizeTableName(db.User.getTableName()), user);
    pending.delete('User');
    console.log(`Seeded User -> ${normalizeTableName(db.User.getTableName())}`);
  }

  let progress = true;
  let pass = 0;

  while (pending.size > 0 && progress) {
    progress = false;
    pass += 1;

    for (const [modelName, item] of Array.from(pending.entries())) {
      const { model } = item;
      const attrs = model.rawAttributes;
      const payload = {};
      let blocked = false;

      for (const [attrName, attr] of Object.entries(attrs)) {
        if (attr._autoGenerated) {
          continue;
        }

        if (attr.primaryKey && attr.autoIncrement) {
          continue;
        }

        const hasDefault = typeof attr.defaultValue !== 'undefined';
        const isRequired = attr.allowNull === false && !hasDefault;
        if (!isRequired) {
          continue;
        }

        const refModel = attr.references?.model;
        if (refModel) {
          const refTable = normalizeTableName(refModel);
          const refRecord = createdRows.get(refTable);
          if (!refRecord) {
            blocked = true;
            break;
          }
          payload[attrName] = refRecord.id;
          continue;
        }

        if (attr.primaryKey && modelName === 'Role' && attrName === 'id') {
          payload[attrName] = 1;
          continue;
        }

        payload[attrName] = buildValue(attrName, attr, modelName, pass);
      }

      if (blocked) {
        continue;
      }

      try {
        const created = await model.create(payload);
        const tableName = normalizeTableName(model.getTableName());
        createdRows.set(tableName, created);
        pending.delete(modelName);
        progress = true;
        console.log(`Seeded ${modelName} -> ${tableName}`);
      } catch (error) {
        // Defer to next passes unless no model can progress.
      }
    }
  }

  if (pending.size > 0) {
    const failures = [];
    for (const [modelName, item] of pending.entries()) {
      const { model } = item;
      const attrs = model.rawAttributes;
      const payload = {};

      for (const [attrName, attr] of Object.entries(attrs)) {
        if (attr._autoGenerated) {
          continue;
        }

        if (attr.primaryKey && attr.autoIncrement) {
          continue;
        }

        const hasDefault = typeof attr.defaultValue !== 'undefined';
        const isRequired = attr.allowNull === false && !hasDefault;
        if (!isRequired) {
          continue;
        }

        if (attr.references?.model) {
          const refTable = normalizeTableName(attr.references.model);
          const refRecord = createdRows.get(refTable);
          if (!refRecord) {
            continue;
          }
          payload[attrName] = refRecord.id;
          continue;
        }

        if (attr.primaryKey && modelName === 'Role' && attrName === 'id') {
          payload[attrName] = 1;
          continue;
        }

        payload[attrName] = buildValue(attrName, attr, modelName, 99);
      }

      try {
        const created = await model.create(payload);
        const tableName = normalizeTableName(model.getTableName());
        createdRows.set(tableName, created);
        pending.delete(modelName);
        console.log(`Seeded ${modelName} on final pass -> ${tableName}`);
      } catch (error) {
        failures.push(`${modelName}: ${error.message}`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Some tables could not be seeded:\n${failures.join('\n')}`);
    }
  }

  const counts = [];
  for (const { name, model } of models) {
    const count = await model.count();
    counts.push({ name, count });
  }

  console.log('\nSeed summary (rows per model table):');
  for (const item of counts) {
    console.log(`- ${item.name}: ${item.count}`);
  }

  await sequelize.close();
}

async function main() {
  await ensureDatabaseExists();
  await seedAllTables();
  console.log('\nPostgreSQL database initialization and seeding completed successfully.');
}

main().catch((error) => {
  console.error('\nFailed to initialize and seed PostgreSQL:', error.message);
  process.exit(1);
});
