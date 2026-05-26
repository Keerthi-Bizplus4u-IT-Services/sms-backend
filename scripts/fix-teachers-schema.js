/**
 * Fixes teachers table schema by adding missing columns: join_date, designation, salary.
 * Backfills join_date from joining_date if possible.
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

async function main() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    console.log('Checking for missing columns in teachers table...');

    // 1. Join Date
    if (!(await columnExists(connection, 'teachers', 'join_date'))) {
      console.log('Adding join_date column...');
      await connection.execute(
        'ALTER TABLE `teachers` ADD COLUMN `join_date` DATE NULL AFTER `employee_id`'
      );
      
      // Backfill from joining_date
      console.log('Backfilling join_date from joining_date...');
      await connection.execute('UPDATE `teachers` SET `join_date` = `joining_date` WHERE `join_date` IS NULL AND `joining_date` IS NOT NULL');
      
      // Set default for those still NULL (to allow NOT NULL constraint)
      await connection.execute('UPDATE `teachers` SET `join_date` = CURDATE() WHERE `join_date` IS NULL');
      
      // Make it NOT NULL
      await connection.execute('ALTER TABLE `teachers` MODIFY `join_date` DATE NOT NULL');
      console.log('join_date added and backfilled.');
    }

    // 2. Designation
    if (!(await columnExists(connection, 'teachers', 'designation'))) {
      console.log('Adding designation column...');
      await connection.execute(
        'ALTER TABLE `teachers` ADD COLUMN `designation` VARCHAR(100) NULL AFTER `joining_date`'
      );
      console.log('designation added.');
    }

    // 3. Salary
    if (!(await columnExists(connection, 'teachers', 'salary'))) {
      console.log('Adding salary column...');
      await connection.execute(
        'ALTER TABLE `teachers` ADD COLUMN `salary` DECIMAL(10, 2) NULL AFTER `resignation_date`'
      );
      console.log('salary added.');
    }

    console.log('Schema fix completed successfully.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Error during schema fix:', err);
  process.exit(1);
});
