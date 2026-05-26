const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../../config/database');

const tableCache = new Map();
const columnCache = new Map();

const getSchemaName = () => {
  const configuredSchema = process.env.DB_SCHEMA || process.env.PG_DB_SCHEMA;
  if (configuredSchema) {
    return configuredSchema;
  }

  const dialect = typeof sequelize.getDialect === 'function'
    ? sequelize.getDialect()
    : sequelize?.options?.dialect;

  if (dialect === 'postgres') {
    return 'public';
  }

  return sequelize?.config?.database || process.env.DB_NAME || process.env.DATABASE || 'sms';
};

async function tableExists(tableName) {
  const cacheKey = tableName.toLowerCase();
  if (tableCache.has(cacheKey)) {
    return tableCache.get(cacheKey);
  }

  let exists = false;
  try {
    const rows = await sequelize.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = :schema AND table_name = :table LIMIT 1`,
      {
        replacements: {
          schema: getSchemaName(),
          table: tableName
        },
        type: QueryTypes.SELECT
      }
    );
    exists = rows.length > 0;
  } catch (error) {
    console.error('Failed to determine table existence', { table: tableName, error: error.message });
  }

  tableCache.set(cacheKey, exists);
  return exists;
}

async function resolveTableName(candidates = []) {
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await tableExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function getTableColumns(tableName) {
  const cacheKey = tableName.toLowerCase();
  if (columnCache.has(cacheKey)) {
    return columnCache.get(cacheKey);
  }

  let columns = new Set();
  try {
    const rows = await sequelize.query(
      `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = :schema AND table_name = :table`,
      {
        replacements: {
          schema: getSchemaName(),
          table: tableName
        },
        type: QueryTypes.SELECT
      }
    );
    columns = new Set(
      rows
        .map((row) => row.COLUMN_NAME || row.column_name)
        .filter(Boolean)
        .map((columnName) => String(columnName).toLowerCase())
    );
  } catch (error) {
    console.error('Failed to read table column metadata', { table: tableName, error: error.message });
  }

  columnCache.set(cacheKey, columns);
  return columns;
}

function resetSchemaCache() {
  tableCache.clear();
  columnCache.clear();
}

module.exports = {
  tableExists,
  resolveTableName,
  getTableColumns,
  resetSchemaCache
};
