/**
 * Seed: Fees
 * Creates normalized fee structures, student fee ledgers, and deterministic
 * demo payments so student and parent fee views have data to render.
 */
const { QueryTypes } = require('sequelize');
const { sequelize, AcademicYear, Class, Student, SchoolBranch } = require('../../src/models');
const {
  tableExists,
  getTableColumns,
  resetSchemaCache
} = require('../../src/api/v1/repositories/helpers/schema.utils');

const FEE_BLUEPRINTS = [
  { key: 'annual', fee_type: 'tuition', due_term: 'annual', amount_multiplier: 1.0, is_mandatory: true, due_date: '2025-04-20' },
  { key: 'term1', fee_type: 'tuition', due_term: 'term_1', amount_multiplier: 0.35, is_mandatory: true, due_date: '2025-06-15' },
  { key: 'term2', fee_type: 'tuition', due_term: 'term_2', amount_multiplier: 0.35, is_mandatory: true, due_date: '2025-09-15' },
  { key: 'term3', fee_type: 'tuition', due_term: 'term_3', amount_multiplier: 0.3, is_mandatory: true, due_date: '2025-12-10' },
  { key: 'transport', fee_type: 'transport', due_term: 'annual', flat_amount: 18000, is_mandatory: false, due_date: '2025-05-10' },
  { key: 'sports', fee_type: 'sports', due_term: 'term_3', flat_amount: 2500, is_mandatory: false, due_date: '2025-07-05' }
];

const BASE_FEE_BY_GRADE = {
  1: 28000,
  2: 30000,
  3: 33000,
  4: 36000,
  5: 55000,
  6: 60000,
  7: 64000,
  8: 70000,
  9: 75000,
  10: 78000
};

const DEFAULT_FEE_TERM_TEMPLATES = [
  { name: 'Term 1', sort_order: 1, due_offset_days: 45 },
  { name: 'Term 2', sort_order: 2, due_offset_days: 45 },
  { name: 'Term 3', sort_order: 3, due_offset_days: 10 }
];

const DEMO_RECEIPT_PREFIX = 'DEMO-';
const DIALECT = typeof sequelize.getDialect === 'function' ? sequelize.getDialect() : sequelize?.options?.dialect;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const roundAmount = (value) => Number((value || 0).toFixed(2));

const normalizeDateOnly = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  const text = String(value).slice(0, 10);
  return new Date(`${text}T00:00:00.000Z`);
};

const formatDateOnly = (value) => normalizeDateOnly(value)?.toISOString().slice(0, 10) || null;

const addUtcDays = (date, days) => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const clampDate = (date, minDate, maxDate) => {
  if (date < minDate) {
    return minDate;
  }

  if (date > maxDate) {
    return maxDate;
  }

  return date;
};

function buildDefaultFeeTerms(academicYear) {
  const startDate = normalizeDateOnly(academicYear.start_date || academicYear.startDate);
  const endDate = normalizeDateOnly(academicYear.end_date || academicYear.endDate);

  if (!startDate || !endDate || endDate < startDate) {
    return [];
  }

  const totalDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / DAY_IN_MS) + 1);
  const segmentSize = Math.max(1, Math.floor(totalDays / DEFAULT_FEE_TERM_TEMPLATES.length));

  return DEFAULT_FEE_TERM_TEMPLATES.map((template, index) => {
    const rawStart = addUtcDays(startDate, index * segmentSize);
    const rawEnd = index === DEFAULT_FEE_TERM_TEMPLATES.length - 1
      ? endDate
      : addUtcDays(startDate, ((index + 1) * segmentSize) - 1);

    const termStart = clampDate(rawStart, startDate, endDate);
    const termEnd = clampDate(rawEnd, termStart, endDate);
    const maxDueOffset = Math.max(0, Math.floor((termEnd.getTime() - termStart.getTime()) / DAY_IN_MS));
    const dueDate = addUtcDays(termStart, Math.min(template.due_offset_days, maxDueOffset));

    return {
      name: template.name,
      startDate: formatDateOnly(termStart),
      endDate: formatDateOnly(termEnd),
      dueDate: formatDateOnly(dueDate),
      lateFeePerDay: 25,
      lateFeeMax: 1500,
      sortOrder: template.sort_order,
      isActive: true
    };
  });
}

const buildPaidStatus = (paidAmount, finalAmount) => {
  if (paidAmount <= 0) {
    return 'pending';
  }

  if (paidAmount >= finalAmount) {
    return 'paid';
  }

  return 'partial';
};

const shouldCreateOptionalFee = (studentId, blueprintKey) => {
  if (blueprintKey === 'transport') {
    return studentId % 2 === 0;
  }

  if (blueprintKey === 'sports') {
    return studentId % 3 === 0;
  }

  return true;
};

const calculateTargetPaid = (blueprintKey, amount, studentId) => {
  if (amount <= 0) {
    return 0;
  }

  switch (blueprintKey) {
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
};

const paymentDateForBlueprint = (blueprintKey) => {
  switch (blueprintKey) {
    case 'annual':
      return '2025-04-25';
    case 'term1':
      return '2025-06-20';
    case 'term2':
      return '2025-09-20';
    case 'term3':
      return '2025-12-15';
    case 'transport':
      return '2025-05-15';
    case 'sports':
      return '2025-07-10';
    default:
      return '2025-08-01';
  }
};

async function createFeeTablesIfMissing() {
  if (DIALECT === 'postgres') {
    await sequelize.query(
      `
      CREATE TABLE IF NOT EXISTS fee_terms (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        name VARCHAR(80) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        due_date DATE NOT NULL,
        late_fee_per_day DECIMAL(10,2) NOT NULL DEFAULT 0,
        late_fee_max DECIMAL(10,2) NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fee_terms_dates_check CHECK (end_date >= start_date),
        CONSTRAINT fee_terms_due_date_check CHECK (due_date >= start_date AND due_date <= end_date),
        CONSTRAINT uq_fee_terms_name_per_year UNIQUE (school_id, academic_year_id, name)
      )
    `,
      { type: QueryTypes.RAW }
    );

    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_fee_terms_school_year ON fee_terms(school_id, academic_year_id)',
      { type: QueryTypes.RAW }
    );

    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS idx_fee_terms_sort_order ON fee_terms(academic_year_id, sort_order)',
      { type: QueryTypes.RAW }
    );

    await sequelize.query(
      `
      CREATE TABLE IF NOT EXISTS fee_structures (
        id BIGSERIAL PRIMARY KEY,
        school_id INTEGER NULL REFERENCES schools(id) ON DELETE SET NULL,
        academic_year_id SMALLINT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        fee_type VARCHAR(30) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        due_term VARCHAR(30) NOT NULL DEFAULT 'annual',
        is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (academic_year_id, class_id, fee_type, due_term)
      )
    `,
      { type: QueryTypes.RAW }
    );

    await sequelize.query(
      `
      CREATE TABLE IF NOT EXISTS student_fees (
        id BIGSERIAL PRIMARY KEY,
        student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        fee_structure_id BIGINT NOT NULL REFERENCES fee_structures(id) ON DELETE RESTRICT,
        total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        final_amount NUMERIC(12, 2) GENERATED ALWAYS AS (total_amount - discount_amount) STORED,
        paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        balance_amount NUMERIC(12, 2) GENERATED ALWAYS AS ((total_amount - discount_amount) - paid_amount) STORED,
        due_date DATE NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (student_id, fee_structure_id)
      )
    `,
      { type: QueryTypes.RAW }
    );

    await sequelize.query(
      `
      CREATE TABLE IF NOT EXISTS fee_payments (
        id BIGSERIAL PRIMARY KEY,
        student_fee_id BIGINT NOT NULL REFERENCES student_fees(id) ON DELETE RESTRICT,
        receipt_number VARCHAR(50) NOT NULL UNIQUE,
        amount NUMERIC(12, 2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(30) NOT NULL,
        transaction_reference VARCHAR(100) NULL,
        collected_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
        remarks TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
      { type: QueryTypes.RAW }
    );
  } else {
    await sequelize.query(
      `
      CREATE TABLE IF NOT EXISTS fee_terms (
        id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INTEGER NOT NULL,
        academic_year_id INTEGER NOT NULL,
        name VARCHAR(80) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        due_date DATE NOT NULL,
        late_fee_per_day DECIMAL(10,2) NOT NULL DEFAULT 0,
        late_fee_max DECIMAL(10,2) NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_fee_terms_name_per_year (school_id, academic_year_id, name)
      )
    `,
      { type: QueryTypes.RAW }
    );

    await sequelize.query(
      `
      CREATE TABLE IF NOT EXISTS fee_structures (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INTEGER NULL,
        academic_year_id SMALLINT UNSIGNED NOT NULL,
        class_id BIGINT UNSIGNED NOT NULL,
        fee_type VARCHAR(30) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        due_term VARCHAR(30) NOT NULL DEFAULT 'annual',
        is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_year_class_type_term (academic_year_id, class_id, fee_type, due_term)
      )
    `,
      { type: QueryTypes.RAW }
    );

    await sequelize.query(
      `
      CREATE TABLE IF NOT EXISTS student_fees (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        student_id BIGINT UNSIGNED NOT NULL,
        fee_structure_id BIGINT UNSIGNED NOT NULL,
        total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        final_amount DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - discount_amount) STORED,
        paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        balance_amount DECIMAL(12, 2) GENERATED ALWAYS AS ((total_amount - discount_amount) - paid_amount) STORED,
        due_date DATE NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_student_fee_structure (student_id, fee_structure_id)
      )
    `,
      { type: QueryTypes.RAW }
    );

    await sequelize.query(
      `
      CREATE TABLE IF NOT EXISTS fee_payments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        student_fee_id BIGINT UNSIGNED NOT NULL,
        receipt_number VARCHAR(50) NOT NULL UNIQUE,
        amount DECIMAL(12, 2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(30) NOT NULL,
        transaction_reference VARCHAR(100) NULL,
        collected_by BIGINT UNSIGNED NULL,
        remarks TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `,
      { type: QueryTypes.RAW }
    );
  }

  resetSchemaCache();
}

async function insertAndReturnId(sql, replacements, transaction) {
  if (DIALECT === 'postgres') {
    const rows = await sequelize.query(`${sql} RETURNING id`, {
      replacements,
      type: QueryTypes.SELECT,
      transaction
    });
    return rows?.[0]?.id || null;
  }

  const [, metadata] = await sequelize.query(sql, {
    replacements,
    transaction
  });

  return metadata?.insertId || metadata?.[0]?.id || null;
}

async function ensureFeeTerm({ schoolId, academicYearId, term }, transaction) {
  const existingRows = await sequelize.query(
    `
      SELECT id
      FROM fee_terms
      WHERE school_id = ?
        AND academic_year_id = ?
        AND LOWER(name) = LOWER(?)
      LIMIT 1
    `,
    {
      replacements: [schoolId, academicYearId, term.name],
      type: QueryTypes.SELECT,
      transaction
    }
  );

  if (existingRows.length) {
    await sequelize.query(
      `
        UPDATE fee_terms
        SET start_date = ?,
            end_date = ?,
            due_date = ?,
            late_fee_per_day = ?,
            late_fee_max = ?,
            sort_order = ?,
            is_active = ?,
            updated_at = NOW()
        WHERE id = ?
      `,
      {
        replacements: [
          term.startDate,
          term.endDate,
          term.dueDate,
          term.lateFeePerDay,
          term.lateFeeMax,
          term.sortOrder,
          term.isActive,
          existingRows[0].id
        ],
        transaction
      }
    );

    return { id: existingRows[0].id, created: false };
  }

  const termId = await insertAndReturnId(
    `
      INSERT INTO fee_terms
        (school_id, academic_year_id, name, start_date, end_date, due_date, late_fee_per_day, late_fee_max, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
    [
      schoolId,
      academicYearId,
      term.name,
      term.startDate,
      term.endDate,
      term.dueDate,
      term.lateFeePerDay,
      term.lateFeeMax,
      term.sortOrder,
      term.isActive
    ],
    transaction
  );

  return { id: termId, created: true };
}

async function ensureFeeStructure({
  academicYearId,
  classId,
  schoolId,
  blueprint,
  amount,
  supportsSchoolId,
  supportsIsMandatory
}, transaction) {
  const existingRows = await sequelize.query(
    `
      SELECT id
      FROM fee_structures
      WHERE academic_year_id = ?
        AND class_id = ?
        AND fee_type = ?
        AND due_term = ?
      LIMIT 1
    `,
    {
      replacements: [academicYearId, classId, blueprint.fee_type, blueprint.due_term],
      type: QueryTypes.SELECT,
      transaction
    }
  );

  if (existingRows.length) {
    const assignments = ['amount = ?', 'updated_at = NOW()'];
    const replacements = [amount];

    if (supportsSchoolId) {
      assignments.push('school_id = ?');
      replacements.push(schoolId);
    }

    if (supportsIsMandatory) {
      assignments.push('is_mandatory = ?');
      replacements.push(blueprint.is_mandatory);
    }

    replacements.push(existingRows[0].id);

    await sequelize.query(
      `UPDATE fee_structures SET ${assignments.join(', ')} WHERE id = ?`,
      {
        replacements,
        transaction
      }
    );

    return existingRows[0].id;
  }

  const insertColumns = ['academic_year_id', 'class_id', 'fee_type', 'amount', 'due_term', 'created_at', 'updated_at'];
  const insertValues = [academicYearId, classId, blueprint.fee_type, amount, blueprint.due_term, new Date(), new Date()];

  if (supportsSchoolId) {
    insertColumns.splice(2, 0, 'school_id');
    insertValues.splice(2, 0, schoolId);
  }

  if (supportsIsMandatory) {
    insertColumns.splice(insertColumns.length - 2, 0, 'is_mandatory');
    insertValues.splice(insertValues.length - 2, 0, blueprint.is_mandatory);
  }

  const placeholders = insertColumns.map(() => '?').join(', ');
  return insertAndReturnId(
    `INSERT INTO fee_structures (${insertColumns.join(', ')}) VALUES (${placeholders})`,
    insertValues,
    transaction
  );
}

async function ensureStudentFee({ studentId, feeStructureId, amount, dueDate }, transaction) {
  const existingRows = await sequelize.query(
    `
      SELECT id
      FROM student_fees
      WHERE student_id = ?
        AND fee_structure_id = ?
      LIMIT 1
    `,
    {
      replacements: [studentId, feeStructureId],
      type: QueryTypes.SELECT,
      transaction
    }
  );

  if (existingRows.length) {
    await sequelize.query(
      `
        UPDATE student_fees
        SET total_amount = ?,
            due_date = ?,
            updated_at = NOW()
        WHERE id = ?
      `,
      {
        replacements: [amount, dueDate, existingRows[0].id],
        transaction
      }
    );

    return existingRows[0].id;
  }

  return insertAndReturnId(
    `
      INSERT INTO student_fees
        (student_id, fee_structure_id, total_amount, discount_amount, paid_amount, due_date, status, created_at, updated_at)
      VALUES (?, ?, ?, 0, 0, ?, 'pending', NOW(), NOW())
    `,
    [studentId, feeStructureId, amount, dueDate],
    transaction
  );
}

async function syncDemoPayment({ studentFeeId, amount, blueprintKey }, transaction) {
  const demoReceipt = `${DEMO_RECEIPT_PREFIX}${studentFeeId}`;

  const existingPayments = await sequelize.query(
    `
      SELECT id, receipt_number
      FROM fee_payments
      WHERE student_fee_id = ?
    `,
    {
      replacements: [studentFeeId],
      type: QueryTypes.SELECT,
      transaction
    }
  );

  const nonDemoPayments = existingPayments.filter(
    (payment) => !String(payment.receipt_number || '').startsWith(DEMO_RECEIPT_PREFIX)
  );
  if (nonDemoPayments.length > 0) {
    return { touched: false, skipped: true };
  }

  const existingDemoPayment = existingPayments.find(
    (payment) => String(payment.receipt_number || '').startsWith(DEMO_RECEIPT_PREFIX)
  );

  if (amount <= 0) {
    if (existingDemoPayment) {
      await sequelize.query('DELETE FROM fee_payments WHERE id = ?', {
        replacements: [existingDemoPayment.id],
        transaction
      });
      return { touched: true, skipped: false };
    }

    return { touched: false, skipped: false };
  }

  const paymentDate = paymentDateForBlueprint(blueprintKey);
  const transactionReference = `DEMOTXN-${studentFeeId}`;
  const remarks = `Auto-generated demo payment for ${blueprintKey}`;

  if (existingDemoPayment) {
    await sequelize.query(
      `
        UPDATE fee_payments
        SET receipt_number = ?,
            amount = ?,
            payment_date = ?,
            payment_method = 'online',
            transaction_reference = ?,
            remarks = ?
        WHERE id = ?
      `,
      {
        replacements: [demoReceipt, amount, paymentDate, transactionReference, remarks, existingDemoPayment.id],
        transaction
      }
    );

    return { touched: true, skipped: false };
  }

  await sequelize.query(
    `
      INSERT INTO fee_payments
        (student_fee_id, receipt_number, amount, payment_date, payment_method, transaction_reference, remarks, created_at)
      VALUES (?, ?, ?, ?, 'online', ?, ?, NOW())
    `,
    {
      replacements: [studentFeeId, demoReceipt, amount, paymentDate, transactionReference, remarks],
      transaction
    }
  );

  return { touched: true, skipped: false };
}

async function updateStudentFeeBalance(studentFeeId, paidAmount, transaction) {
  const feeRows = await sequelize.query(
    `
      SELECT total_amount, discount_amount, final_amount
      FROM student_fees
      WHERE id = ?
      LIMIT 1
    `,
    {
      replacements: [studentFeeId],
      type: QueryTypes.SELECT,
      transaction
    }
  );

  if (!feeRows.length) {
    return;
  }

  const row = feeRows[0];
  const finalAmount = Number(row.final_amount || (Number(row.total_amount || 0) - Number(row.discount_amount || 0)));
  const normalizedPaidAmount = Math.min(roundAmount(paidAmount), finalAmount);
  const status = buildPaidStatus(normalizedPaidAmount, finalAmount);

  await sequelize.query(
    `
      UPDATE student_fees
      SET paid_amount = ?,
          status = ?,
          updated_at = NOW()
      WHERE id = ?
    `,
    {
      replacements: [normalizedPaidAmount, status, studentFeeId],
      transaction
    }
  );
}

async function seed() {
  resetSchemaCache();

  const requiredTables = ['fee_terms', 'fee_structures', 'student_fees', 'fee_payments'];
  const missingTables = [];
  for (const tableName of requiredTables) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await tableExists(tableName);
    if (!exists) {
      missingTables.push(tableName);
    }
  }

  if (missingTables.length > 0) {
    await createFeeTablesIfMissing();
  }

  const currentAcademicYear = await AcademicYear.findOne({ where: { is_current: true }, raw: true });
  if (!currentAcademicYear) {
    throw new Error('No current academic year found for fee seeding');
  }

  const classes = await Class.findAll({
    where: { academic_year_id: currentAcademicYear.id },
    attributes: ['id', 'name', 'numeric_grade', 'branch_id'],
    raw: true,
    order: [['numeric_grade', 'ASC'], ['id', 'ASC']]
  });

  if (!classes.length) {
    console.log('   Skipped fee seeding because no classes were found for the current academic year');
    return;
  }

  const classIds = classes.map((item) => item.id);
  const students = await Student.findAll({
    where: { class_id: classIds },
    attributes: ['id', 'class_id', 'school_id'],
    raw: true,
    order: [['id', 'ASC']]
  });

  if (!students.length) {
    console.log('   Skipped fee seeding because no students were found for the current academic year classes');
    return;
  }

  const branches = await SchoolBranch.findAll({
    attributes: ['id', 'school_id'],
    raw: true
  });

  const branchSchoolMap = new Map(branches.map((branch) => [branch.id, branch.school_id]));
  const schoolIds = [...new Set(classes.map((cls) => branchSchoolMap.get(cls.branch_id)).filter(Boolean))];
  const studentsByClass = new Map();
  for (const student of students) {
    if (!studentsByClass.has(student.class_id)) {
      studentsByClass.set(student.class_id, []);
    }
    studentsByClass.get(student.class_id).push(student);
  }

  const feeStructureColumns = await getTableColumns('fee_structures');
  const supportsSchoolId = feeStructureColumns.has('school_id');
  const supportsIsMandatory = feeStructureColumns.has('is_mandatory');

  const counts = {
    feeTerms: 0,
    structures: 0,
    studentFees: 0,
    payments: 0,
    skippedPayments: 0
  };

  await sequelize.transaction(async (transaction) => {
    const defaultFeeTerms = buildDefaultFeeTerms(currentAcademicYear);
    for (const schoolId of schoolIds) {
      for (const term of defaultFeeTerms) {
        // eslint-disable-next-line no-await-in-loop
        const feeTermResult = await ensureFeeTerm({
          schoolId,
          academicYearId: currentAcademicYear.id,
          term
        }, transaction);

        if (feeTermResult.id) {
          counts.feeTerms += 1;
        }
      }
    }

    for (const cls of classes) {
      const grade = Number(cls.numeric_grade || 0);
      const baseAmount = BASE_FEE_BY_GRADE[grade] || 50000 + Math.max(grade, 1) * 1500;
      const schoolId = branchSchoolMap.get(cls.branch_id) || null;

      for (const blueprint of FEE_BLUEPRINTS) {
        const amount = roundAmount(blueprint.flat_amount || (baseAmount * blueprint.amount_multiplier));
        // eslint-disable-next-line no-await-in-loop
        const feeStructureId = await ensureFeeStructure({
          academicYearId: currentAcademicYear.id,
          classId: cls.id,
          schoolId,
          blueprint,
          amount,
          supportsSchoolId,
          supportsIsMandatory
        }, transaction);

        if (!feeStructureId) {
          continue;
        }
        counts.structures += 1;

        const classStudents = studentsByClass.get(cls.id) || [];
        for (const student of classStudents) {
          if (!blueprint.is_mandatory && !shouldCreateOptionalFee(student.id, blueprint.key)) {
            continue;
          }

          // eslint-disable-next-line no-await-in-loop
          const studentFeeId = await ensureStudentFee({
            studentId: student.id,
            feeStructureId,
            amount,
            dueDate: blueprint.due_date
          }, transaction);

          if (!studentFeeId) {
            continue;
          }
          counts.studentFees += 1;

          const targetPaid = calculateTargetPaid(blueprint.key, amount, student.id);
          // eslint-disable-next-line no-await-in-loop
          const paymentResult = await syncDemoPayment({
            studentFeeId,
            amount: targetPaid,
            blueprintKey: blueprint.key
          }, transaction);

          if (paymentResult.skipped) {
            counts.skippedPayments += 1;
            continue;
          }

          if (paymentResult.touched) {
            counts.payments += 1;
          }

          // eslint-disable-next-line no-await-in-loop
          await updateStudentFeeBalance(studentFeeId, targetPaid, transaction);
        }
      }
    }
  });

  console.log(
    `   Seeded fee demo data: ${counts.feeTerms} fee terms, ${counts.structures} structures, ${counts.studentFees} student fees, ${counts.payments} demo payment updates` +
    (counts.skippedPayments ? ` (${counts.skippedPayments} student fees left untouched because non-demo payments already exist)` : '')
  );
}

module.exports = seed;