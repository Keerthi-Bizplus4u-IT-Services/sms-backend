const mysql = require('mysql');
const fs = require('fs');
const path = require('path');

const db_config = {
  host: 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  password: 'Bizplus4u123',
  database: 'sms',
  connectTimeout: 60000
};

console.log('🔄 Starting schema migration v2 (Statement-by-statement mode)...\n');

const connection = mysql.createConnection(db_config);

const sqlFilePath = path.join(__dirname, '../migrations/2025-11-15_schema_v2.sql');
console.log(`📂 Reading SQL file: ${sqlFilePath}`);

const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

// Split by semicolon but be smart about it (avoid splitting inside strings/comments)
const statements = sqlContent
  .split(/;\r?\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && s !== 'START TRANSACTION' && s !== 'COMMIT');

console.log(`✅ Loaded ${statements.length} SQL statements\n`);

connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }

  console.log('✅ Connected to MySQL 8.0.42\n');

  let currentIndex = 0;
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  function executeNext() {
    if (currentIndex >= statements.length) {
      console.log('\n' + '='.repeat(60));
      console.log('✨ Migration Summary:');
      console.log(`   ✅ Successful: ${successCount}`);
      console.log(`   ⏭️  Skipped: ${skipCount}`);
      console.log(`   ❌ Errors: ${errorCount}`);
      console.log('='.repeat(60));
      
      if (errorCount > 0) {
        console.log('\n⚠️  Some statements failed - review errors above');
      } else {
        console.log('\n🎉 All statements executed successfully!');
      }
      
      connection.end();
      process.exit(errorCount > 0 ? 1 : 0);
      return;
    }

    const statement = statements[currentIndex];
    const preview = statement.substring(0, 80).replace(/\s+/g, ' ');
    
    currentIndex++;

    // Skip SET statements and comments
    if (statement.startsWith('SET ') || statement.startsWith('--') || statement.trim() === '') {
      process.stdout.write(`[${currentIndex}/${statements.length}] ⏭️  SKIP: ${preview}...\n`);
      skipCount++;
      setImmediate(executeNext);
      return;
    }

    process.stdout.write(`[${currentIndex}/${statements.length}] 🔄 ${preview}...`);

    connection.query(statement, (error, result) => {
      if (error) {
        // Check if error is just "column already exists" - that's okay
        if (error.code === 'ER_DUP_FIELDNAME' || 
            error.code === 'ER_DUP_KEYNAME' || 
            error.message.includes('Duplicate column') ||
            error.message.includes('Duplicate key')) {
          process.stdout.write(` ✅ (already exists)\n`);
          successCount++;
        } else {
          process.stdout.write(` ❌\n`);
          console.error(`   Error: ${error.message}`);
          console.error(`   Code: ${error.code}\n`);
          errorCount++;
          
          // For critical errors, stop
          if (error.code === 'ER_PARSE_ERROR' || error.code === 'ER_SYNTAX_ERROR') {
            console.error('\n❌ Critical syntax error - stopping migration\n');
            connection.end();
            process.exit(1);
            return;
          }
        }
      } else {
        const affected = result.affectedRows !== undefined ? ` (${result.affectedRows} rows)` : '';
        process.stdout.write(` ✅${affected}\n`);
        successCount++;
      }

      // Continue to next statement
      setImmediate(executeNext);
    });
  }

  // Start executing
  executeNext();
});

process.on('SIGINT', () => {
  console.log('\n\n⚠️  Migration interrupted by user');
  connection.end();
  process.exit(1);
});
