const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  password: 'Bizplus4u123',
  database: 'sms'
};

async function verify() {
  const conn = await mysql.createConnection(dbConfig);
  
  console.log('🔍 Verifying Critical Features Migration\n');
  
  // Check transport tables
  const [transport] = await conn.query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'sms' 
    AND (TABLE_NAME LIKE 'transport_%' OR TABLE_NAME = 'student_transport')
    ORDER BY TABLE_NAME
  `);
  
  console.log('Transport Tables:');
  transport.forEach(t => console.log(`  ✓ ${t.TABLE_NAME}`));
  
  // Check views
  const [views] = await conn.query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS 
    WHERE TABLE_SCHEMA = 'sms' 
    AND TABLE_NAME LIKE 'v_%'
  `);
  
  console.log('\nViews Created:');
  views.forEach(v => console.log(`  ✓ ${v.TABLE_NAME}`));
  
  // Check permissions
  const [perms] = await conn.query(`
    SELECT COUNT(*) as count FROM permissions
  `);
  console.log(`\nPermissions: ${perms[0].count} entries`);
  
  // Check role permissions
  const [rolePerms] = await conn.query(`
    SELECT COUNT(*) as count FROM role_permissions
  `);
  console.log(`Role Permissions: ${rolePerms[0].count} entries`);
  
  // Check library fine rules
  const [fines] = await conn.query(`
    SELECT user_type, fine_per_day, grace_period_days FROM library_fine_rules
  `);
  console.log('\nLibrary Fine Rules:');
  fines.forEach(f => console.log(`  ✓ ${f.user_type}: ₹${f.fine_per_day}/day (${f.grace_period_days} days grace)`));
  
  // Check timetable periods
  const [periods] = await conn.query(`
    SELECT COUNT(*) as count FROM timetable_periods
  `);
  console.log(`\nTimetable Periods: ${periods[0].count} periods configured`);
  
  // Check all critical tables exist
  console.log('\n📊 Critical Tables Status:\n');
  const expectedTables = [
    'library_books', 'library_transactions', 'library_fine_rules',
    'assignments', 'assignment_submissions',
    'timetable_periods', 'class_timetable', 'timetable_substitutions',
    'fee_installments', 'fee_concessions', 'fee_reminders',
    'audit_logs', 'user_sessions', 'permissions', 'role_permissions',
    'transport_routes', 'transport_vehicles', 'transport_stops', 'student_transport'
  ];
  
  for (const table of expectedTables) {
    const [exists] = await conn.query(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = 'sms' AND TABLE_NAME = ?`,
      [table]
    );
    const status = exists[0].count > 0 ? '✓' : '✗';
    console.log(`  ${status} ${table}`);
  }
  
  await conn.end();
  console.log('\n✅ Verification complete!');
}

verify().catch(console.error);
