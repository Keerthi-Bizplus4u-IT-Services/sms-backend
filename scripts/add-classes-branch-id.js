/**
 * Adds branch_id to classes table if missing.
 * Run from backend: node scripts/add-classes-branch-id.js
 * Uses .env for DB connection (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME or HOST, USER, PASSWORD, DATABASE).
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || process.env.HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || process.env.USER || 'root',
  password: process.env.DB_PASSWORD || process.env.PASSWORD,
  database: process.env.DB_NAME || process.env.DATABASE || 'sms'
};

async function columnExists(connection, table, column) {
  const db = dbConfig.database;
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ? LIMIT 1`,
    [db, table, column]
  );
  return rows.length > 0;
}

async function indexExists(connection, table, indexName) {
  const db = dbConfig.database;
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ? LIMIT 1`,
    [db, table, indexName]
  );
  return rows.length > 0;
}

async function main() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    if (await columnExists(connection, 'classes', 'branch_id')) {
      console.log('classes.branch_id already exists. Nothing to do.');
      return;
    }

    const defaultSchoolId = parseInt(process.env.DEFAULT_SCHOOL_ID || '1', 10);
    const [branches] = await connection.execute(
      'SELECT id FROM school_branches WHERE school_id = ? AND deleted_at IS NULL ORDER BY id ASC LIMIT 1',
      [defaultSchoolId]
    );
    let branchId;
    if (branches.length > 0) {
      branchId = branches[0].id;
    } else {
      const [anyBranch] = await connection.execute(
        'SELECT id FROM school_branches WHERE deleted_at IS NULL ORDER BY id ASC LIMIT 1'
      );
      if (anyBranch.length === 0) {
        throw new Error('No school_branches row found. Create a school and branch first (e.g. run seed-default-school.js).');
      }
      branchId = anyBranch[0].id;
    }

    console.log('Adding branch_id to classes (default branch id:', branchId, ')');
    await connection.execute(
      'ALTER TABLE `classes` ADD COLUMN `branch_id` INT UNSIGNED NULL AFTER `academic_year_id`'
    );
    await connection.execute('UPDATE `classes` SET `branch_id` = ? WHERE `branch_id` IS NULL', [branchId]);
    await connection.execute('ALTER TABLE `classes` MODIFY `branch_id` INT UNSIGNED NOT NULL');
    if (!(await indexExists(connection, 'classes', 'idx_branch_id'))) {
      await connection.execute('ALTER TABLE `classes` ADD INDEX idx_branch_id (`branch_id`)');
    }
    console.log('Done. classes.branch_id added and backfilled.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
