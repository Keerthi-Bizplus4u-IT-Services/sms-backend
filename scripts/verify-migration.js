const mysql = require('mysql2/promise');

const db_config = {
  host: 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  password: 'Bizplus4u123',
  database: 'sms'
};

async function verify() {
  const conn = await mysql.createConnection(db_config);
  
  console.log('📊 MIGRATION VERIFICATION\n');
  console.log('='.repeat(60) + '\n');
  
  // Check tables
  const [tables] = await conn.query("SHOW TABLES LIKE '%school%'");
  console.log('✅ Tables created:');
  tables.forEach(t => console.log('  -', Object.values(t)[0]));
  
  // Check enrollments table
  const [enrollTables] = await conn.query("SHOW TABLES LIKE '%enrollment%'");
  console.log('\n✅ Enrollment tables:');
  enrollTables.forEach(t => console.log('  -', Object.values(t)[0]));
  
  // Check promotion tables
  const [promoTables] = await conn.query("SHOW TABLES LIKE '%promotion%'");
  console.log('\n✅ Promotion tables:');
  promoTables.forEach(t => console.log('  -', Object.values(t)[0]));
  
  // Check schools data
  const [schools] = await conn.query('SELECT * FROM schools');
  console.log('\n📚 Schools in database:', schools.length);
  schools.forEach(s => console.log(`  - ${s.code}: ${s.name} (${s.school_type})`));
  
  // Check branches data
  const [branches] = await conn.query('SELECT * FROM school_branches');
  console.log('\n🏢 Branches in database:', branches.length);
  branches.forEach(b => console.log(`  - ${b.code}: ${b.name} (${b.branch_type})`));
  
  // Check enrollments
  const [enrollments] = await conn.query('SELECT COUNT(*) as count FROM student_enrollments');
  console.log(`\n📝 Student enrollments: ${enrollments[0].count}`);
  
  // Check promotions
  const [promotions] = await conn.query('SELECT COUNT(*) as count FROM student_promotions');
  console.log(`📈 Student promotions: ${promotions[0].count}`);
  
  // Check transfers
  const [transfers] = await conn.query('SELECT COUNT(*) as count FROM student_branch_transfers');
  console.log(`🔄 Branch transfers: ${transfers[0].count}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Verification complete!\n');
  
  await conn.end();
}

verify().catch(console.error);
