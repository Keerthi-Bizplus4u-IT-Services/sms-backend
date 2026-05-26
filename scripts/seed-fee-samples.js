#!/usr/bin/env node

/**
 * Demo fee data generator
 * -----------------------
 * Populates fee_structures, student_fees and fee_payments with predictable
 * sample data so that the React fee screens have something to render.
 *
 * Usage:
 *   node scripts/seed-fee-samples.js
 */

const path = require('path');
const mysql = require('mysql2/promise');
const dotenvPath = path.resolve(__dirname, '..', '.env');

if (require('fs').existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
} else {
  require('dotenv').config();
}

const FEE_BLUEPRINTS = [
  { key: 'annual', label: 'Annual Tuition', feeType: 'tuition', dueTerm: 'annual', amountMultiplier: 1.0, isMandatory: true, dueDate: '2024-04-20' },
  { key: 'term1', label: 'First Term', feeType: 'tuition', dueTerm: 'term_1', amountMultiplier: 0.35, isMandatory: true, dueDate: '2024-06-15' },
  { key: 'term2', label: 'Second Term', feeType: 'tuition', dueTerm: 'term_2', amountMultiplier: 0.35, isMandatory: true, dueDate: '2024-09-15' },
  { key: 'term3', label: 'Third Term', feeType: 'tuition', dueTerm: 'term_3', amountMultiplier: 0.30, isMandatory: true, dueDate: '2024-12-10' },
  { key: 'transport', label: 'Transport', feeType: 'transport', dueTerm: 'term_1', flatAmount: 18000, isMandatory: false, dueDate: '2024-05-10' },
  { key: 'sports', label: 'Sports & Activities', feeType: 'sports', dueTerm: 'annual', flatAmount: 2500, isMandatory: false, dueDate: '2024-07-05' }
];

const BASE_FEE_BY_GRADE = {
  5: 55000,
  6: 60000,
  7: 64000,
  8: 70000,
  9: 75000,
  10: 78000
};

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    decimalNumbers: true,
    timezone: '+05:30'
  });

  try {
    const context = await buildContext(connection);
    await seedFeeStructures(connection, context);
    await seedStudentFees(connection, context);
    await seedFeePayments(connection, context);
    console.log('');
    console.log('✔️  Dummy fee structures and payments are ready for verification.');
    console.log(`   Classes touched : ${context.classes.length}`);
    console.log(`   Students touched: ${context.studentFees.length}`);
    console.log(`   Payments upserted: ${context.paymentCount}`);
  } finally {
    await connection.end();
  }
}

async function buildContext(connection) {
  const [yearRows] = await connection.query(
    'SELECT id, name FROM academic_years WHERE is_current = 1 LIMIT 1'
  );
  if (!yearRows.length) {
    throw new Error('No current academic year found – run academic year seed first.');
  }
  const currentYear = yearRows[0];

  const [classRows] = await connection.query(
    `
      SELECT c.id, c.name, c.numeric_grade
      FROM classes c
      WHERE c.academic_year_id = ?
      ORDER BY COALESCE(c.numeric_grade, 99)
    `,
    [currentYear.id]
  );
  if (!classRows.length) {
    throw new Error('No classes available for the current academic year.');
  }

  const classIds = classRows.map((cls) => cls.id);
  const [studentRows] = await connection.query(
    `
      SELECT id, class_id
      FROM students
      WHERE class_id IN (?)
      ORDER BY id
    `,
    [classIds]
  );
  if (!studentRows.length) {
    throw new Error('No students found for the selected classes.');
  }

  return {
    currentYear,
    classes: classRows,
    studentsByClass: studentRows.reduce((map, student) => {
      if (!map.has(student.class_id)) {
        map.set(student.class_id, []);
      }
      map.get(student.class_id).push(student);
      return map;
    }, new Map()),
    structureMap: new Map(),
    studentFees: [],
    paymentCount: 0
  };
}

async function seedFeeStructures(connection, context) {
  const sql = `
    INSERT INTO fee_structures (
      academic_year_id, class_id, fee_type, amount, due_term, is_mandatory, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      amount = VALUES(amount),
      is_mandatory = VALUES(is_mandatory),
      updated_at = NOW(),
      id = LAST_INSERT_ID(id)
  `;

  for (const cls of context.classes) {
    const baseAmount = BASE_FEE_BY_GRADE[cls.numeric_grade] || 50000 + (cls.numeric_grade || 1) * 1500;
    for (const blueprint of FEE_BLUEPRINTS) {
      const amount = blueprint.flatAmount || Math.round(baseAmount * blueprint.amountMultiplier);
      const [result] = await connection.execute(sql, [
        context.currentYear.id,
        cls.id,
        blueprint.feeType,
        amount,
        blueprint.dueTerm,
        blueprint.isMandatory ? 1 : 0
      ]);

      const structureId = result.insertId;
      context.structureMap.set(`${cls.id}|${blueprint.key}`, {
        id: structureId,
        classId: cls.id,
        blueprint,
        amount
      });
    }
  }

  console.log(`- Fee structures ensured for ${context.structureMap.size} class/fee combinations.`);
}

async function seedStudentFees(connection, context) {
  const sql = `
    INSERT INTO student_fees (
      student_id, fee_structure_id, total_amount, discount_amount, due_date, status, created_at, updated_at
    ) VALUES (?, ?, ?, 0, ?, 'pending', NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      total_amount = VALUES(total_amount),
      due_date = VALUES(due_date),
      updated_at = NOW(),
      id = LAST_INSERT_ID(id)
  `;

  for (const [classId, students] of context.studentsByClass.entries()) {
    for (const student of students) {
      for (const blueprint of FEE_BLUEPRINTS) {
        const structure = context.structureMap.get(`${classId}|${blueprint.key}`);
        if (!structure) {
          continue;
        }

        const isOptional = !blueprint.isMandatory;
        if (isOptional && student.id % 2 !== 0) {
          // create optional fee only for alternating students to produce variety
          continue;
        }

        const [result] = await connection.execute(sql, [
          student.id,
          structure.id,
          structure.amount,
          blueprint.dueDate
        ]);

        context.studentFees.push({
          id: result.insertId,
          studentId: student.id,
          blueprint,
          amount: structure.amount
        });
      }
    }
  }

  console.log(`- Student fee ledgers ensured for ${context.studentFees.length} records.`);
}

async function seedFeePayments(connection, context) {
  const paymentSql = `
    INSERT INTO fee_payments (
      student_fee_id, receipt_number, amount, payment_date,
      payment_method, transaction_reference, remarks, created_at
    ) VALUES (?, ?, ?, ?, 'online', ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      amount = VALUES(amount),
      payment_date = VALUES(payment_date),
      transaction_reference = VALUES(transaction_reference),
      remarks = VALUES(remarks)
  `;

  for (const feeEntry of context.studentFees) {
    const targetPaid = calculateTargetPaid(feeEntry);
    await connection.execute(
      `
        UPDATE student_fees
        SET paid_amount = ?, status = CASE
          WHEN ? <= 0 THEN 'pending'
          WHEN ? >= final_amount THEN 'paid'
          ELSE 'partial'
        END,
        updated_at = NOW()
        WHERE id = ?
      `,
      [targetPaid, targetPaid, targetPaid, feeEntry.id]
    );

    if (targetPaid <= 0) {
      continue;
    }

    const receiptNumber = `DEMO-${feeEntry.id}`;
    const paymentDate = paymentDateForBlueprint(feeEntry.blueprint.key);
    await connection.execute(paymentSql, [
      feeEntry.id,
      receiptNumber,
      targetPaid,
      paymentDate,
      `DEMOTXN-${feeEntry.id}`,
      `Auto generated payment for ${feeEntry.blueprint.label}`
    ]);
    context.paymentCount += 1;
  }

  console.log(`- Upserted ${context.paymentCount} deterministic fee payments.`);
}

function calculateTargetPaid(entry) {
  const amount = Number(entry.amount || 0);
  if (amount <= 0) return 0;
  const { blueprint, studentId } = entry;

  switch (blueprint.key) {
    case 'annual':
      return roundAmount(amount * (studentId % 2 === 0 ? 0.7 : 0.55));
    case 'term1':
      return roundAmount(amount * (studentId % 3 === 0 ? 1 : 0.5));
    case 'term2':
      return roundAmount(studentId % 4 === 0 ? amount : amount * 0.25);
    case 'term3':
      return studentId % 5 === 0 ? roundAmount(amount * 0.8) : 0;
    case 'transport':
      return studentId % 2 === 0 ? amount : 0;
    case 'sports':
      return studentId % 3 === 0 ? amount : 0;
    default:
      return 0;
  }
}

function paymentDateForBlueprint(key) {
  switch (key) {
    case 'annual':
      return '2024-04-25';
    case 'term1':
      return '2024-06-20';
    case 'term2':
      return '2024-09-20';
    case 'term3':
      return '2024-12-15';
    case 'transport':
      return '2024-05-15';
    case 'sports':
      return '2024-07-10';
    default:
      return '2024-08-01';
  }
}

function roundAmount(value) {
  return Number((value || 0).toFixed(2));
}

main().catch((err) => {
  console.error('❌  Fee demo seed failed:', err.message);
  process.exit(1);
});
