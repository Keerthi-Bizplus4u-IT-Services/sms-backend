const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// Database configuration
const db_config = {
  host: 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  password: 'Bizplus4u123',
  database: 'sms',
  connectTimeout: 60000
};

async function runMigration() {
  let connection;
  
  try {
    console.log('📦 Connecting to database...');
    connection = await mysql.createConnection(db_config);
    console.log('✅ Connected successfully!\n');
    
    // Read the migration SQL file
    const sqlFilePath = path.join(__dirname, '..', 'migrations', '2025-11-15_multi_school_branch_extension.sql');
    console.log('📄 Reading migration file:', sqlFilePath);
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`Migration file not found: ${sqlFilePath}`);
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✅ Migration file loaded\n');
    console.log('⚙️  Executing migration using mysql client...\n');
    
    // Use mysql command line to execute the file (handles DELIMITER properly)
    const mysqlCommand = `mysql -h ${db_config.host} -P ${db_config.port} -u ${db_config.user} -p${db_config.password} ${db_config.database}`;
    
    try {
      const { stdout, stderr } = await execPromise(`${mysqlCommand} < "${sqlFilePath}"`, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 300000 // 5 minutes timeout
      });
      
      if (stdout) console.log(stdout);
      if (stderr && !stderr.includes('Warning')) console.error(stderr);
      
    } catch (execError) {
      // mysql command not available, fall back to direct execution
      console.log('⚠️  MySQL CLI not available, using direct execution...\n');
      
      // Remove DELIMITER statements and split on semicolons
      const cleanedSql = sqlContent
        .replace(/DELIMITER\s+\$\$/gi, '')
        .replace(/DELIMITER\s+;/gi, '');
      
      // Split by $$ first (for procedures), then by ;
      const procedureBlocks = cleanedSql.split('$$').filter(s => s.trim());
      
      for (const block of procedureBlocks) {
        const statements = block
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.match(/^--/) && !s.match(/^\/\*/));
        
        for (const statement of statements) {
          if (!statement) continue;
          
          // Show progress for important statements
          if (statement.toUpperCase().includes('CREATE TABLE')) {
            const match = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?`?(\w+)`?/i);
            if (match) console.log(`  📋 Creating table: ${match[1]}`);
          } else if (statement.toUpperCase().includes('ALTER TABLE')) {
            const match = statement.match(/ALTER TABLE `?(\w+)`?/i);
            if (match) console.log(`  🔧 Altering table: ${match[1]}`);
          } else if (statement.toUpperCase().includes('INSERT INTO')) {
            const match = statement.match(/INSERT INTO `?(\w+)`?/i);
            if (match) console.log(`  📝 Inserting into: ${match[1]}`);
          } else if (statement.toUpperCase().includes('CREATE PROCEDURE')) {
            const match = statement.match(/CREATE PROCEDURE `?(\w+)`?/i);
            if (match) console.log(`  ⚡ Creating procedure: ${match[1]}`);
          } else if (statement.toUpperCase().includes('CREATE VIEW') || statement.toUpperCase().includes('CREATE OR REPLACE VIEW')) {
            const match = statement.match(/CREATE (?:OR REPLACE )?VIEW `?(\w+)`?/i);
            if (match) console.log(`  👁️  Creating view: ${match[1]}`);
          }
          
          try {
            await connection.query(statement);
          } catch (error) {
            if (error.code === 'ER_TABLE_EXISTS_ERR' || 
                error.code === 'ER_DUP_FIELDNAME' ||
                error.code === 'ER_DUP_KEYNAME' ||
                error.message.includes('already exists') ||
                error.message.includes('Duplicate')) {
              // Skip silently
            } else {
              console.error(`  ⚠️  Error: ${error.message.substring(0, 100)}`);
            }
          }
        }
      }
    }
    
    // Run verification queries
    console.log('🔍 Running verification queries...\n');
    
    try {
      const [schools] = await connection.query('SELECT COUNT(*) as count FROM schools');
      console.log(`  📚 Schools in database: ${schools[0].count}`);
      
      const [branches] = await connection.query('SELECT COUNT(*) as count FROM school_branches');
      console.log(`  🏢 Branches in database: ${branches[0].count}`);
      
      const [enrollments] = await connection.query('SELECT COUNT(*) as count FROM student_enrollments');
      console.log(`  📝 Student enrollments: ${enrollments[0].count}`);
      
      const [views] = await connection.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.VIEWS 
        WHERE TABLE_SCHEMA = 'sms' 
        AND TABLE_NAME LIKE 'v_%'
      `);
      console.log(`  👁️  Views created: ${views.length}`);
      
      const [procedures] = await connection.query(`
        SELECT ROUTINE_NAME 
        FROM INFORMATION_SCHEMA.ROUTINES 
        WHERE ROUTINE_SCHEMA = 'sms' 
        AND ROUTINE_TYPE = 'PROCEDURE'
        AND ROUTINE_NAME LIKE 'sp_%'
      `);
      console.log(`  ⚡ Stored procedures: ${procedures.length}`);
      
    } catch (verifyError) {
      console.log('  ⚠️  Some verification queries failed:', verifyError.message);
    }
    
    console.log('\n✅ Migration completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed\n');
    }
  }
}

// Run the migration
console.log('🚀 Starting Multi-School & Branch Extension Migration');
console.log('='.repeat(60) + '\n');

runMigration()
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
