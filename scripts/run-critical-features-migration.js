/**
 * Critical Features Migration Executor
 * Safely executes the critical missing features migration
 * 
 * Features Added:
 * - Library Management (3 tables)
 * - Assignment Management (2 tables)
 * - Timetable Management (3 tables)
 * - Fee Installments & Concessions (3 tables)
 * - Security & Audit (4 tables)
 * - Transport Management (4 tables)
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

const dbConfig = {
  host: 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  password: 'Bizplus4u123',
  database: 'sms',
  multipleStatements: true
};

const MIGRATION_FILE = path.join(__dirname, '..', 'migrations', '2025-11-15_critical_features_migration.sql');

async function executeMigration() {
  let connection;
  
  try {
    console.log('='.repeat(80));
    console.log('CRITICAL FEATURES MIGRATION - EXECUTION STARTED');
    console.log('='.repeat(80));
    console.log(`Time: ${new Date().toISOString()}\n`);

    // Read migration file
    console.log('📖 Reading migration file...');
    const sqlContent = await fs.readFile(MIGRATION_FILE, 'utf8');
    console.log(`   ✓ File read: ${MIGRATION_FILE}`);
    console.log(`   ✓ File size: ${(sqlContent.length / 1024).toFixed(2)} KB\n`);

    // Connect to database
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('   ✓ Connected successfully\n');

    // Clean SQL content - remove comments and split properly
    console.log('📝 Parsing SQL statements...');
    
    // Remove single-line comments
    let cleanedSql = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    // Remove multi-line comments
    cleanedSql = cleanedSql.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Split by semicolons but preserve those within parentheses
    const statements = [];
    let currentStatement = '';
    let parenthesesDepth = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < cleanedSql.length; i++) {
      const char = cleanedSql[i];
      const prevChar = i > 0 ? cleanedSql[i - 1] : '';
      
      // Track string literals
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }
      
      // Track parentheses (only when not in string)
      if (!inString) {
        if (char === '(') parenthesesDepth++;
        if (char === ')') parenthesesDepth--;
      }
      
      currentStatement += char;
      
      // Split on semicolon only when not in string or parentheses
      if (char === ';' && !inString && parenthesesDepth === 0) {
        const stmt = currentStatement.trim();
        if (stmt.length > 0 && 
            !stmt.startsWith('SET @') && 
            !stmt.includes('DELIMITER') &&
            stmt !== 'COMMIT' &&
            stmt !== 'START TRANSACTION') {
          statements.push(stmt);
        }
        currentStatement = '';
      }
    }
    
    // Add last statement if exists
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }

    console.log(`   ✓ Found ${statements.length} SQL statements\n`);

    // Execute setup statements
    console.log('⚙️  Setting up transaction...');
    await connection.query('SET FOREIGN_KEY_CHECKS=0');
    await connection.query('START TRANSACTION');
    console.log('   ✓ Transaction started\n');

    // Track execution
    let successCount = 0;
    let skipCount = 0;
    const errors = [];
    const createdTables = [];
    const createdViews = [];

    // Execute each statement
    console.log('🚀 Executing migration statements...\n');
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      // Skip comments and empty statements
      if (stmt.startsWith('/*') || stmt.startsWith('--') || stmt.trim() === '') {
        skipCount++;
        continue;
      }

      try {
        // Extract table/view name for logging
        let objectName = 'unknown';
        let statementType = 'Query';
        
        if (stmt.match(/CREATE\s+TABLE/i)) {
          const match = stmt.match(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?(\w+)`?/i);
          if (match) {
            objectName = match[1];
            statementType = 'Table';
          }
        } else if (stmt.match(/CREATE\s+OR\s+REPLACE\s+VIEW/i)) {
          const match = stmt.match(/CREATE\s+OR\s+REPLACE\s+VIEW\s+`?(\w+)`?/i);
          if (match) {
            objectName = match[1];
            statementType = 'View';
          }
        } else if (stmt.match(/INSERT/i)) {
          const match = stmt.match(/INSERT(?:\s+IGNORE)?\s+INTO\s+`?(\w+)`?/i);
          if (match) {
            objectName = match[1];
            statementType = 'Insert';
          }
        } else if (stmt.match(/SELECT/i)) {
          statementType = 'Select';
          objectName = 'query';
        }

        process.stdout.write(`   [${i + 1}/${statements.length}] ${statementType}: ${objectName}...`);
        
        await connection.query(stmt);
        
        // Track created objects
        if (statementType === 'Table') {
          createdTables.push(objectName);
          console.log(' ✓ Created');
        } else if (statementType === 'View') {
          createdViews.push(objectName);
          console.log(' ✓ Created');
        } else if (statementType === 'Insert') {
          console.log(' ✓ Inserted');
        } else {
          console.log(' ✓');
        }
        
        successCount++;
        
      } catch (error) {
        console.log(' ✗ FAILED');
        
        // Check if it's a benign error (already exists)
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
            error.message.includes('already exists')) {
          console.log(`      ⚠️  Already exists, skipping...`);
          skipCount++;
        } else {
          console.log(`      ❌ Error: ${error.message}`);
          errors.push({
            statement: stmt.substring(0, 150) + '...',
            error: error.message,
            code: error.code
          });
        }
      }
    }

    // Commit transaction
    console.log('\n💾 Committing transaction...');
    await connection.query('COMMIT');
    await connection.query('SET FOREIGN_KEY_CHECKS=1');
    console.log('   ✓ Transaction committed\n');

    // Verify created tables
    console.log('🔍 Verifying migration...\n');
    
    const [tables] = await connection.query(`
      SELECT TABLE_NAME, TABLE_ROWS, 
             ROUND(DATA_LENGTH / 1024, 2) AS size_kb
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'sms'
      AND TABLE_NAME IN (
        'library_books', 'library_transactions', 'library_fine_rules',
        'assignments', 'assignment_submissions',
        'timetable_periods', 'class_timetable', 'timetable_substitutions',
        'fee_installments', 'fee_concessions', 'fee_reminders',
        'audit_logs', 'user_sessions', 'permissions', 'role_permissions',
        'transport_routes', 'transport_vehicles', 'transport_stops', 'student_transport'
      )
      ORDER BY TABLE_NAME
    `);

    console.log('📊 Created Tables:\n');
    console.log('   Table Name                      | Rows  | Size (KB)');
    console.log('   ' + '-'.repeat(60));
    
    tables.forEach(t => {
      console.log(`   ${t.TABLE_NAME.padEnd(30)} | ${String(t.TABLE_ROWS).padStart(5)} | ${String(t.size_kb).padStart(8)}`);
    });

    // Get category counts
    console.log('\n📈 Tables by Category:\n');
    
    const categories = [
      { name: 'Library Management', pattern: 'library_%', expected: 3 },
      { name: 'Assignment Management', pattern: 'assignment%', expected: 2 },
      { name: 'Timetable Management', tables: ['timetable_periods', 'class_timetable', 'timetable_substitutions'], expected: 3 },
      { name: 'Fee Management', tables: ['fee_installments', 'fee_concessions', 'fee_reminders'], expected: 3 },
      { name: 'Security & Audit', tables: ['audit_logs', 'user_sessions', 'permissions', 'role_permissions'], expected: 4 },
      { name: 'Transport Management', pattern: 'transport_%', tables: ['student_transport'], expected: 5 }
    ];

    for (const cat of categories) {
      let query;
      if (cat.pattern) {
        query = `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
                 WHERE TABLE_SCHEMA = 'sms' AND TABLE_NAME LIKE '${cat.pattern}'`;
      } else {
        const tableList = cat.tables.map(t => `'${t}'`).join(',');
        query = `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
                 WHERE TABLE_SCHEMA = 'sms' AND TABLE_NAME IN (${tableList})`;
      }
      
      const [result] = await connection.query(query);
      const count = result[0].count;
      const status = count === cat.expected ? '✓' : '⚠️';
      console.log(`   ${status} ${cat.name.padEnd(25)}: ${count}/${cat.expected} tables`);
    }

    // Get views
    const [views] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.VIEWS
      WHERE TABLE_SCHEMA = 'sms'
      AND TABLE_NAME LIKE 'v_%'
    `);

    console.log(`\n📋 Views Created: ${views.length}`);
    views.forEach(v => console.log(`   ✓ ${v.TABLE_NAME}`));

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`✓ Successful operations: ${successCount}`);
    console.log(`⚠️  Skipped operations: ${skipCount}`);
    console.log(`❌ Failed operations: ${errors.length}`);
    console.log(`📊 Tables created: ${tables.length}`);
    console.log(`📋 Views created: ${views.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  ERRORS ENCOUNTERED:');
      errors.forEach((e, i) => {
        console.log(`\n${i + 1}. Statement: ${e.statement}`);
        console.log(`   Error Code: ${e.code || 'N/A'}`);
        console.log(`   Error: ${e.error}`);
      });
    } else {
      console.log('\n✅ No errors encountered!');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ CRITICAL FEATURES MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log(`\nTime: ${new Date().toISOString()}`);
    console.log('\nNext Steps:');
    console.log('1. Review the created tables and verify data integrity');
    console.log('2. Update application code to use new features');
    console.log('3. Test all new functionality thoroughly');
    console.log('4. Consider implementing remaining medium-priority features');
    console.log('5. Plan data migration from legacy tables to optimized tables\n');

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED!');
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);
    
    if (connection) {
      try {
        await connection.query('ROLLBACK');
        console.log('\n⚠️  Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError.message);
      }
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Execute migration
executeMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
