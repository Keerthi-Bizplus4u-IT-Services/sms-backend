const mysql = require('mysql2/promise');

async function createView() {
  const conn = await mysql.createConnection({
    host: 'lms.c11qajqwxlix.us-west-2.rds.amazonaws.com',
    port: 3306,
    user: 'admin',
    password: 'Bizplus4u123',
    database: 'sms'
  });

  const viewSQL = `
    CREATE OR REPLACE VIEW v_library_books_issued AS
    SELECT 
      lb.id AS book_id,
      lb.isbn,
      lb.title,
      lb.authors,
      lt.id AS transaction_id,
      lt.borrower_type,
      lt.borrower_id,
      CASE 
        WHEN lt.borrower_type = 'student' THEN (
          SELECT CONCAT(p.first_name, ' ', p.last_name) 
          FROM students s 
          JOIN persons p ON p.id = s.person_id 
          WHERE s.id = lt.borrower_id
        )
        WHEN lt.borrower_type = 'teacher' THEN (
          SELECT CONCAT(p.first_name, ' ', p.last_name) 
          FROM teachers t 
          JOIN persons p ON p.id = t.person_id 
          WHERE t.id = lt.borrower_id
        )
        WHEN lt.borrower_type = 'staff' THEN (
          SELECT CONCAT(p.first_name, ' ', p.last_name) 
          FROM staff s 
          JOIN persons p ON p.id = s.person_id 
          WHERE s.id = lt.borrower_id
        )
      END AS borrower_name,
      lt.issue_date,
      lt.due_date,
      DATEDIFF(CURDATE(), lt.due_date) AS days_overdue,
      lt.fine_amount,
      lt.status
    FROM library_books lb
    JOIN library_transactions lt ON lt.book_id = lb.id
    WHERE lt.status IN ('issued', 'overdue')
  `;

  try {
    await conn.query(viewSQL);
    console.log('✅ View v_library_books_issued created successfully');
  } catch (error) {
    console.error('❌ Error creating view:', error.message);
  } finally {
    await conn.end();
  }
}

createView();
