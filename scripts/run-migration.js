/*
 Run a SQL migration file against the configured MySQL database.
 Usage:
   node scripts/run-migration.js [path-to-sql]
 Defaults to migrations/2025-11-15_schema_v2.sql
*/

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const sqlPath = process.argv[2] || path.join(__dirname, '..', 'migrations', '2025-11-15_schema_v2.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  const config = {
    host: process.env.DB_HOST || 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
    port: +(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASS || 'Bizplus4u123',
    database: process.env.DB_NAME || 'sms',
    multipleStatements: true,
    // reasonable timeouts for migration
    connectTimeout: 60000,
    enableKeepAlive: true
  };

  console.log('Connecting to MySQL:', `${config.host}:${config.port}/${config.database}`);
  const conn = await mysql.createConnection(config);
  try {
    console.log('Running migration:', sqlPath);
    await conn.query(sql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
