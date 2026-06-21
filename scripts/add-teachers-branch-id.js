/**
 * Adds branch_id to teachers table if missing.
 * Run from backend: node scripts/add-teachers-branch-id.js
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
    if (await columnExists(connection, 'teachers', 'branch_id')) {
      console.log('teachers.branch_id already exists. Nothing to do.');
      return;
    }

    // Get a default branch ID to backfill
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
        console.warn('No school_branches found. Column will be added as NULL and not backfilled.');
      } else {
        branchId = anyBranch[0].id;
      }
    }

    console.log(`Adding branch_id to teachers table (default branch id: ${branchId || 'NULL'})`);
    
    // Add the column
    await connection.execute(
      'ALTER TABLE `teachers` ADD COLUMN `branch_id` INT UNSIGNED NULL AFTER `school_id`'
    );

    // Backfill if we have a branch ID
    if (branchId) {
      await connection.execute('UPDATE `teachers` SET `branch_id` = ? WHERE `branch_id` IS NULL', [branchId]);
    }

    // Add index
    if (!(await indexExists(connection, 'teachers', 'idx_teachers_branch_id'))) {
      await connection.execute('ALTER TABLE `teachers` ADD INDEX idx_teachers_branch_id (`branch_id`)');
    }

    // Add foreign key constraint
    console.log('Adding foreign key constraint for branch_id');
    try {
        await connection.execute(
            'ALTER TABLE `teachers` ADD CONSTRAINT `fk_teachers_branch` FOREIGN KEY (`branch_id`) REFERENCES `school_branches` (`id`) ON DELETE RESTRICT'
        );
    } catch (fkError) {
        console.warn('Could not add foreign key constraint (possibly due to data inconsistency):', fkError.message);
    }

    console.log('Done. teachers.branch_id added.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
