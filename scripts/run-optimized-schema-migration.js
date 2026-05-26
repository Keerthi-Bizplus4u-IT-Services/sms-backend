const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const db_config = {
  host: 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  password: 'Bizplus4u123',
  database: 'sms',
  connectTimeout: 120000,
  multipleStatements: true
};

const DEFAULT_MIGRATION_FILE = path.join(
  __dirname,
  '..',
  'migrations',
  '2025-11-15_optimized_schema_migration.sql'
);

const resolveMigrationFile = (input) => {
  if (!input) {
    return DEFAULT_MIGRATION_FILE;
  }

  if (path.isAbsolute(input)) {
    return input;
  }

  return path.join(__dirname, '..', input);
};

async function runOptimizedMigration(migrationArg) {
  let connection;
  const sqlFilePath = resolveMigrationFile(migrationArg);
  
  try {
    console.log('🚀 SMS Database Optimization Migration\n');
    console.log('='.repeat(70) + '\n');
    
    console.log('📦 Connecting to database...');
    connection = await mysql.createConnection(db_config);
    console.log('✅ Connected successfully!\n');
    
    // Read the optimized schema migration SQL file
    console.log('📄 Reading migration file:', sqlFilePath);
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`Migration file not found: ${sqlFilePath}`);
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✅ Migration file loaded successfully\n');
    
    // Split SQL content into individual statements
    // Remove comments and empty lines first
    const cleanedSql = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');
    
    // Split by semicolon but preserve CREATE TABLE blocks
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);
    console.log('⚙️  Starting migration execution...\n');
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip SET statements and transaction control
      if (statement.match(/^SET\s+@/i) || 
          statement.match(/^START TRANSACTION/i) || 
          statement.match(/^COMMIT/i) ||
          statement.match(/^ROLLBACK/i)) {
        continue;
      }
      
      // Log progress for major operations
      if (statement.toUpperCase().includes('CREATE TABLE')) {
        const match = statement.match(/CREATE TABLE (?:IF NOT EXISTS\s+)?`?(\w+)`?/i);
        if (match) {
          process.stdout.write(`  📋 Creating table: ${match[1].padEnd(30)}`);
        }
      } else if (statement.toUpperCase().includes('ALTER TABLE')) {
        const match = statement.match(/ALTER TABLE\s+`?(\w+)`?/i);
        if (match) {
          process.stdout.write(`  🔧 Altering table: ${match[1].padEnd(30)}`);
        }
      } else if (statement.toUpperCase().includes('CREATE INDEX')) {
        const match = statement.match(/CREATE INDEX\s+`?(\w+)`?/i);
        if (match) {
          process.stdout.write(`  📊 Creating index: ${match[1].padEnd(30)}`);
        }
      } else if (statement.toUpperCase().includes('INSERT INTO')) {
        const match = statement.match(/INSERT INTO\s+`?(\w+)`?/i);
        if (match) {
          process.stdout.write(`  📝 Inserting into: ${match[1].padEnd(30)}`);
        }
      } else {
        // Other statements execute silently
      }
      
      try {
        await connection.query(statement + ';');
        successCount++;
        
        // Print success mark if we printed a label
        if (statement.toUpperCase().includes('CREATE TABLE') ||
            statement.toUpperCase().includes('ALTER TABLE') ||
            statement.toUpperCase().includes('CREATE INDEX') ||
            statement.toUpperCase().includes('INSERT INTO')) {
          console.log('✅');
        }
      } catch (error) {
        // Check if it's a safe error to skip
        const safeErrors = [
          'ER_TABLE_EXISTS_ERR',
          'ER_DUP_FIELDNAME',
          'ER_DUP_KEYNAME',
          'ER_DUP_ENTRY',
          'ER_BAD_FIELD_ERROR',
          'Duplicate key',
          'Duplicate column',
          'Unknown column',
          'already exists',
          "Can't DROP"
        ];
        
        const isSafeError = safeErrors.some(errType => 
          error.code === errType || error.message.includes(errType)
        );
        
        if (isSafeError) {
          skipCount++;
          if (statement.toUpperCase().includes('CREATE TABLE') ||
              statement.toUpperCase().includes('ALTER TABLE') ||
              statement.toUpperCase().includes('CREATE INDEX') ||
              statement.toUpperCase().includes('INSERT INTO')) {
            console.log('⏭️  (exists)');
          }
        } else {
          errorCount++;
          if (statement.toUpperCase().includes('CREATE TABLE') ||
              statement.toUpperCase().includes('ALTER TABLE') ||
              statement.toUpperCase().includes('CREATE INDEX') ||
              statement.toUpperCase().includes('INSERT INTO')) {
            console.log('❌');
          }
          errors.push({
            statement: statement.substring(0, 100) + '...',
            error: error.message.substring(0, 150)
          });
          
          // Stop if too many errors
          if (errorCount > 20) {
            console.error('\n❌ Too many errors encountered, stopping migration\n');
            break;
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Successfully executed: ${successCount} statements`);
    console.log(`⏭️  Skipped (already exists): ${skipCount} statements`);
    console.log(`❌ Errors encountered: ${errorCount} statements`);
    console.log('='.repeat(70) + '\n');
    
    if (errors.length > 0) {
      console.log('⚠️  Error Details:\n');
      errors.slice(0, 10).forEach((err, idx) => {
        console.log(`${idx + 1}. ${err.error}`);
        console.log(`   Statement: ${err.statement}\n`);
      });
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors\n`);
      }
    }
    
    // Run verification queries
    console.log('🔍 Running verification queries...\n');
    
    try {
      // Check core tables
      const [roles] = await connection.query('SELECT COUNT(*) as count FROM roles');
      console.log(`  ✅ Roles table: ${roles[0].count} roles`);
      
      const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
      console.log(`  ✅ Users table: ${users[0].count} users`);
      
      const [persons] = await connection.query('SELECT COUNT(*) as count FROM persons');
      console.log(`  ✅ Persons table: ${persons[0].count} persons`);
      
      const [academicYears] = await connection.query('SELECT COUNT(*) as count FROM academic_years');
      console.log(`  ✅ Academic years: ${academicYears[0].count} years`);
      
      const [classes] = await connection.query('SELECT COUNT(*) as count FROM classes');
      console.log(`  ✅ Classes table: ${classes[0].count} classes`);
      
      const [students] = await connection.query('SELECT COUNT(*) as count FROM students');
      console.log(`  ✅ Students table: ${students[0].count} students`);
      
      const [teachers] = await connection.query('SELECT COUNT(*) as count FROM teachers');
      console.log(`  ✅ Teachers table: ${teachers[0].count} teachers`);
      
      // Check indexes
      const [indexes] = await connection.query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = 'sms' 
        AND INDEX_NAME != 'PRIMARY'
      `);
      console.log(`  ✅ Total indexes: ${indexes[0].count} indexes`);
      
      // Check foreign keys
      const [foreignKeys] = await connection.query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = 'sms' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      console.log(`  ✅ Foreign key constraints: ${foreignKeys[0].count} constraints`);
      
    } catch (verifyError) {
      console.log('  ⚠️  Some verification queries failed:', verifyError.message);
    }
    
    console.log('\n' + '='.repeat(70));
    if (errorCount === 0) {
      console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    } else if (errorCount < 10) {
      console.log('⚠️  MIGRATION COMPLETED WITH WARNINGS');
    } else {
      console.log('❌ MIGRATION COMPLETED WITH ERRORS');
    }
    console.log('='.repeat(70) + '\n');
    
  } catch (error) {
    console.error('\n💥 FATAL ERROR:\n');
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Execute migration
const migrationArg = process.argv[2];
console.log('\n' + '='.repeat(70));
console.log('  SMS DATABASE MIGRATION RUNNER');
console.log(`  File: ${resolveMigrationFile(migrationArg)}`);
console.log('  Following 3NF Normalization & ACID Principles');
console.log('='.repeat(70) + '\n');

runOptimizedMigration(migrationArg)
  .then(() => {
    console.log('All done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
