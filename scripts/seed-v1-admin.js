const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function seedV1Admin() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'Bizplus4u123',
    database: process.env.DB_NAME || 'sms',
    multipleStatements: true
  });

  console.log('Connected to database');

  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../seeds/seed_v1_admin.sql'),
      'utf8'
    );

    const defaultSchoolId = parseInt(process.env.DEFAULT_SCHOOL_ID || '1', 10);
    if (Number.isNaN(defaultSchoolId)) {
      throw new Error('DEFAULT_SCHOOL_ID must be a valid number');
    }

    const bootstrapSql = `SET @default_school_id = ${defaultSchoolId};\n`;
    await connection.query(bootstrapSql + sql);
    console.log('✓ V1 admin user seeded successfully');

    // Verify
    const [rows] = await connection.query(`
      SELECT u.id, u.email, u.role_id, r.name as role, p.first_name, p.last_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      LEFT JOIN persons p ON p.user_id = u.id 
      WHERE u.email = 'admin@sms.local'
    `);

    if (rows.length > 0) {
      console.log('\nAdmin user details:');
      console.log('Email:', rows[0].email);
      console.log('Role:', rows[0].role);
      console.log('Name:', rows[0].first_name, rows[0].last_name);
      console.log('\nLogin credentials:');
      console.log('  Email: admin@sms.local');
      console.log('  Password: admin123');
    }

  } catch (error) {
    console.error('Error seeding admin user:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

seedV1Admin().then(() => {
  console.log('\n✓ Seed complete');
  process.exit(0);
}).catch(err => {
  console.error('✗ Seed failed:', err);
  process.exit(1);
});
