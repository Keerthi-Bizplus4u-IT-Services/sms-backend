/*
  Seed runner for seeds/seed_roles.sql
  - Uses the app's MySQL connection to execute SQL statements sequentially
  - Filters out SQL comments starting with --
*/
const fs = require('fs');
const path = require('path');
const connection = require('../config');

function readSqlStatements(filePath) {
  const sqlRaw = fs.readFileSync(filePath, 'utf8');
  const noComments = sqlRaw
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  // Split on semicolon followed by line break(s); keep simple for our seed format
  const parts = noComments
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts;
}

function runStatements(statements) {
  return new Promise((resolve, reject) => {
    let i = 0;
    const runNext = () => {
      if (i >= statements.length) return resolve();
      const stmt = statements[i++];
      connection.query(stmt, (err) => {
        if (err) {
          console.error(`Error on statement ${i}:`, err.sqlMessage || err.message);
          console.error('Statement was:\n', stmt);
          return reject(err);
        }
        runNext();
      });
    };
    runNext();
  });
}

(async () => {
  try {
    const filePath = path.join(__dirname, 'seed_roles.sql');
    if (!fs.existsSync(filePath)) {
      console.error('Seed file not found:', filePath);
      process.exit(1);
    }
    const statements = readSqlStatements(filePath);
    if (statements.length === 0) {
      console.log('No SQL statements to run.');
      process.exit(0);
    }
    console.log(`Running ${statements.length} SQL statements from seed_roles.sql...`);
    await runStatements(statements);
    console.log('Seed executed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seed execution failed:', err.message);
    process.exit(1);
  }
})();
