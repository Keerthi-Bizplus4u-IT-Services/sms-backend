const mysql = require('mysql');

const db_config = {
  host: 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  password: 'Bizplus4u123',
  database: 'sms',
  connectTimeout: 30000
};

const connection = mysql.createConnection(db_config);

connection.connect((err) => {
  if (err) {
    console.error('Connection failed:', err);
    process.exit(1);
  }

  connection.query('SELECT VERSION() as version', (error, results) => {
    if (error) {
      console.error('Query failed:', error);
      connection.end();
      process.exit(1);
    }

    console.log('MySQL Version:', results[0].version);
    connection.end();
  });
});
