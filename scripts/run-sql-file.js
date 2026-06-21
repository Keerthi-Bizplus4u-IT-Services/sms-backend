#!/usr/bin/env node

/**
 * Simple utility to execute a SQL file against the configured MySQL database.
 *
 * Usage:
 *   node scripts/run-sql-file.js path/to/file.sql
 *
 * The script reads connection settings from backend/.env (if present) and
 * falls back to the defaults used across the project.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenvPath = path.resolve(__dirname, '..', '.env');

if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
} else {
  require('dotenv').config();
}

const [, , fileArg] = process.argv;

async function main() {
  if (!fileArg) {
    console.error('❌  Please provide a path to the SQL file.\nExample: node scripts/run-sql-file.js migrations/2025-11-16_add_postevent_metadata.sql');
    process.exit(1);
  }

  const sqlPath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌  SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8').trim();
  if (!sql) {
    console.log('ℹ️  SQL file is empty, nothing to execute.');
    return;
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'Bizplus4u123',
    database: process.env.DB_NAME || 'sms',
    multipleStatements: true,
    connectTimeout: 30000,
  });

  console.log(`🚀  Executing ${path.relative(process.cwd(), sqlPath)} against ${connection.config.database}@${connection.config.host}...`);
  try {
    await connection.query(sql);
    console.log('✅  SQL executed successfully.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('❌  SQL execution failed:', err.message);
  process.exit(1);
});
