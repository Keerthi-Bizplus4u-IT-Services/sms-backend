const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyAndFixAdmin() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'Bizplus4u123',
    database: process.env.DB_NAME || 'sms',
  });

  console.log('Connected to database\n');

  try {
    // Check current user
    const [users] = await connection.query(`
      SELECT u.id, u.email, u.password_hash, u.role_id
      FROM users u 
      WHERE u.email = 'admin@sms.local'
    `);

    if (users.length === 0) {
      console.log('❌ No user found with email admin@sms.local');
      await connection.end();
      return;
    }

    const user = users[0];
    console.log('✓ Found user:', user.email);
    console.log('  User ID:', user.id);
    console.log('  Role ID:', user.role_id);
    console.log('  Current hash:', user.password_hash.substring(0, 20) + '...\n');

    // Test current password
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    
    console.log(`Testing password "${testPassword}":`, isValid ? '✓ VALID' : '❌ INVALID');

    if (!isValid) {
      console.log('\n🔧 Generating new hash for "admin123"...');
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('New hash:', newHash.substring(0, 20) + '...');

      await connection.query(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newHash, user.id]
      );

      console.log('✓ Password hash updated successfully\n');

      // Verify again
      const [updated] = await connection.query(
        'SELECT password_hash FROM users WHERE id = ?',
        [user.id]
      );
      const finalCheck = await bcrypt.compare(testPassword, updated[0].password_hash);
      console.log(`Final verification: ${finalCheck ? '✓ SUCCESS' : '❌ FAILED'}`);
    }

    console.log('\n✓ Admin credentials ready:');
    console.log('  Email: admin@sms.local');
    console.log('  Password: admin123');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

verifyAndFixAdmin().then(() => {
  console.log('\n✓ Verification complete');
  process.exit(0);
}).catch(err => {
  console.error('✗ Failed:', err);
  process.exit(1);
});
