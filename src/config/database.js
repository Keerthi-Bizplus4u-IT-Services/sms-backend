const { Sequelize } = require('sequelize');
const { loadEnv } = require('./env');

loadEnv();

/**
 * Sequelize Database Configuration
 * Primary connection targets local PostgreSQL for backend API usage.
 */

const buildBaseOptions = (dialect) => {
  const baseOptions = {
    dialect,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true
    }
  };

  if (dialect === 'mysql') {
    baseOptions.dialectOptions = {
      connectTimeout: 30000,
      dateStrings: true,
      typeCast: true
    };
    baseOptions.timezone = '+05:30';
  }

  if (dialect === 'postgres' && process.env.PG_DB_SSL === 'true') {
    baseOptions.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    };
  }

  return baseOptions;
};

const localPostgresSequelize = new Sequelize(
  process.env.PG_DB_NAME || process.env.DB_NAME || 'sms',
  process.env.PG_DB_USER || process.env.DB_USER || 'postgres',
  process.env.PG_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
  {
    ...buildBaseOptions('postgres'),
    host: process.env.PG_DB_HOST || '127.0.0.1',
    port: Number(process.env.PG_DB_PORT || 5432)
  }
);

const legacyMysqlSequelize = new Sequelize(
  process.env.DB_NAME || 'sms',
  process.env.DB_USER || 'admin',
  process.env.DB_PASSWORD || 'Bizplus4u123',
  {
    ...buildBaseOptions('mysql'),
    host: process.env.DB_HOST || 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
    port: Number(process.env.DB_PORT || 3306)
  }
);

// Keep exported name "sequelize" as the primary instance used by models/repositories/controllers.
const sequelize = localPostgresSequelize;

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ PostgreSQL connection established successfully');
    return true;
  } catch (error) {
    console.error('✗ Unable to connect to PostgreSQL database:', error.message);
    return false;
  }
};

// Sync models with database (use with caution in production)
const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('✓ Database synchronized successfully');
  } catch (error) {
    console.error('✗ Database sync failed:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  localPostgresSequelize,
  legacyMysqlSequelize,
  testConnection,
  syncDatabase,
  Sequelize
};