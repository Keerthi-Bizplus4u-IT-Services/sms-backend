const mysql = require('mysql');
const fs = require('fs');
const path = require('path');

// Database configuration from config.js
const db_config = {
  host: 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  password: 'Bizplus4u123',
  database: 'sms',
  multipleStatements: true, // Required for running multiple SQL statements
  connectTimeout: 30000
};

console.log('🔄 Starting schema migration v2...\n');

// Create connection
const connection = mysql.createConnection(db_config);

// Read the SQL file
const sqlFilePath = path.join(__dirname, '../migrations/2025-11-15_schema_v2.sql');
console.log(`📂 Reading SQL file: ${sqlFilePath}`);

fs.readFile(sqlFilePath, 'utf8', (err, sql) => {
  if (err) {
    console.error('❌ Error reading SQL file:', err.message);
    process.exit(1);
  }

  console.log(`✅ SQL file loaded (${sql.length} characters)\n`);

  // Connect to database
  connection.connect((err) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
      process.exit(1);
    }

    console.log('✅ Connected to database:', db_config.database);
    console.log('🏃 Executing migration...\n');

    // Execute the SQL
    connection.query(sql, (error, results) => {
      if (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Error code:', error.code);
        console.error('SQL State:', error.sqlState);
        console.error('\nFull error:', error);
        
        connection.end();
        process.exit(1);
      }

      console.log('✅ Migration completed successfully!\n');
      
      // Show results summary
      if (Array.isArray(results)) {
        console.log(`📊 Executed ${results.length} SQL statements`);
        
        // Show affected rows for modifications
        let totalAffected = 0;
        results.forEach((result, index) => {
          if (result.affectedRows !== undefined) {
            totalAffected += result.affectedRows;
            if (result.affectedRows > 0) {
              console.log(`   Statement ${index + 1}: ${result.affectedRows} rows affected`);
            }
          }
        });
        
        if (totalAffected > 0) {
          console.log(`\n📈 Total rows affected: ${totalAffected}`);
        }
      } else {
        console.log('Result:', results);
      }

      console.log('\n✨ Schema v2 migration complete!');
      console.log('\n📋 Next steps:');
      console.log('   1. Verify foreign keys: SHOW CREATE TABLE timetable;');
      console.log('   2. Check for remaining sentinels: SELECT COUNT(*) FROM timetable WHERE tid IN (-1, 0);');
      console.log('   3. Test application CRUD operations');
      console.log('   4. Review migrations/README_SENTINEL_CLEANUP.md for details\n');

      connection.end();
      process.exit(0);
    });
  });
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Migration interrupted by user');
  connection.end();
  process.exit(1);
});
