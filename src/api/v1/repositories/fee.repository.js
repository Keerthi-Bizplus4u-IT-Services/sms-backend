const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../../config/database');
const { resolveTableName, tableExists, getTableColumns } = require('./helpers/schema.utils');
const { AppError } = require('../../../middleware/error.middleware');

const FEE_TYPE_TARGETS = {
  1: [{ feeType: 'tuition', dueTerm: 'annual' }],
  2: [
    { feeType: 'tuition', dueTerm: 'term_1' },
    { feeType: 'tuition', dueTerm: 'semester_1' }
  ],
  3: [
    { feeType: 'tuition', dueTerm: 'term_2' },
    { feeType: 'tuition', dueTerm: 'semester_2' }
  ],
  4: [
    { feeType: 'sports' },
    { feeType: 'exam' },
    { feeType: 'tuition', dueTerm: 'term_3' }
  ],
  5: [
    { feeType: 'transport', dueTerm: 'term_1' },
    { feeType: 'transport', dueTerm: 'annual' }
  ]
};

const wrapIdentifier = (value) => String(value || '').replace(/[^a-zA-Z0-9_]/g, '');

class FeeRepository {
  constructor() {
    this.schemaMode = null;
    this.tableMap = null;
    this.currentYearId = null;
  }

  normalizePagination(page = 0, pageSize = 10) {
    const limit = Math.max(1, Math.min(parseInt(pageSize, 10) || 10, 100));
    const currentPage = Math.max(0, parseInt(page, 10) || 0);
    const offset = currentPage * limit;
    return { limit, offset, currentPage };
  }

  async getSchemaMode() {
    if (this.schemaMode) return this.schemaMode;
    const normalized = await tableExists('fee_structures');
    this.schemaMode = normalized ? 'normalized' : 'legacy';
    return this.schemaMode;
  }

  async getTableMap() {
    if (this.tableMap) return this.tableMap;
    const mode = await this.getSchemaMode();

    if (mode === 'normalized') {
      this.tableMap = {
        feeStructures: await resolveTableName(['fee_structures']),
        studentFees: await resolveTableName(['student_fees']),
        feePayments: await resolveTableName(['fee_payments']),
        students: await resolveTableName(['students']),
        classes: await resolveTableName(['classes']),
        sections: await resolveTableName(['sections']),
        persons: await resolveTableName(['persons']),
        users: await resolveTableName(['users']),
        schools: await resolveTableName(['schools'])
      };
    } else {
      this.tableMap = {
        feeDetails: await resolveTableName(['feedetails']),
        feeTransactions: await resolveTableName(['feetransactions']),
        students: await resolveTableName(['student']),
        classes: await resolveTableName(['class']),
        sections: await resolveTableName(['section']),
        schools: await resolveTableName(['schools'])
      };
    }

    return this.tableMap;
  }

  async getCurrentAcademicYearId() {
    if (this.currentYearId) {
      return this.currentYearId;
    }
    const currentYearFilter = sequelize.getDialect() === 'postgres' ? 'is_current = TRUE' : 'is_current = 1';
    const rows = await sequelize.query(
      `SELECT id FROM academic_years WHERE ${currentYearFilter} LIMIT 1`,
      { type: QueryTypes.SELECT }
    );
    this.currentYearId = rows?.[0]?.id || null;
    return this.currentYearId;
  }

  async resolveStudentContext(scope = {}, tables = null) {
    if (scope?.roleName !== 'student' || !Number.isInteger(scope?.userId) || scope.userId <= 0) {
      return null;
    }

    const resolvedTables = tables || await this.getTableMap();
    if (!resolvedTables.students || !resolvedTables.persons) {
      return null;
    }

    const rows = await sequelize.query(
      `
        SELECT s.id, s.class_id, s.roll_number
        FROM ${resolvedTables.students} AS s
        INNER JOIN ${resolvedTables.persons} AS p ON p.id = s.person_id
        WHERE p.user_id = ?
        LIMIT 1
      `,
      {
        replacements: [scope.userId],
        type: QueryTypes.SELECT
      }
    );

    return rows[0] || null;
  }

  isParentScope(scope = {}) {
    return String(scope?.roleName || '').toLowerCase() === 'parent';
  }

  async resolveParentLinkedStudents(scope = {}, tables = null) {
    if (!this.isParentScope(scope)) {
      return null;
    }

    if (!Number.isInteger(scope?.userId) || scope.userId <= 0) {
      return { studentIds: [], classIds: [] };
    }

    const resolvedTables = tables || await this.getTableMap();
    const studentsTable = resolvedTables.students;
    const personsTable = resolvedTables.persons || await resolveTableName(['persons', 'person']);
    const parentsTable = await resolveTableName(['parents', 'parent']);
    const studentParentsTable = await resolveTableName(['student_parents']);

    if (!studentsTable || !personsTable || !parentsTable || !studentParentsTable) {
      return { studentIds: [], classIds: [] };
    }

    const [studentColumns, studentParentColumns] = await Promise.all([
      getTableColumns(studentsTable),
      getTableColumns(studentParentsTable)
    ]);

    const studentIdCol = studentColumns.has('id') ? 'id' : studentColumns.has('sid') ? 'sid' : null;
    const classIdCol = studentColumns.has('class_id') ? 'class_id' : studentColumns.has('cid') ? 'cid' : null;
    const relationParentCol = studentParentColumns.has('parent_id') ? 'parent_id' : studentParentColumns.has('pid') ? 'pid' : null;
    const relationStudentCol = studentParentColumns.has('student_id') ? 'student_id' : studentParentColumns.has('sid') ? 'sid' : null;

    if (!studentIdCol || !relationParentCol || !relationStudentCol) {
      return { studentIds: [], classIds: [] };
    }

    const parentRows = await sequelize.query(
      `
        SELECT pa.id AS parent_id
        FROM ${parentsTable} pa
        INNER JOIN ${personsTable} p ON p.id = pa.person_id
        WHERE p.user_id = ?
        LIMIT 1
      `,
      {
        replacements: [scope.userId],
        type: QueryTypes.SELECT
      }
    );

    const parentId = Number(parentRows?.[0]?.parent_id);
    if (!Number.isInteger(parentId) || parentId <= 0) {
      return { studentIds: [], classIds: [] };
    }

    const linkedRows = await sequelize.query(
      `
        SELECT ${wrapIdentifier(relationStudentCol)} AS linked_student_id
        FROM ${studentParentsTable}
        WHERE ${wrapIdentifier(relationParentCol)} = :parentId
      `,
      {
        replacements: { parentId },
        type: QueryTypes.SELECT
      }
    );

    const linkedStudentIds = linkedRows
      .map((row) => Number(row.linked_student_id))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (!linkedStudentIds.length) {
      return { studentIds: [], classIds: [] };
    }

    const studentRows = await sequelize.query(
      `
        SELECT
          ${wrapIdentifier(studentIdCol)} AS student_id,
          ${classIdCol ? `${wrapIdentifier(classIdCol)} AS class_id` : 'NULL AS class_id'}
        FROM ${studentsTable}
        WHERE ${wrapIdentifier(studentIdCol)} IN (:studentIds)
      `,
      {
        replacements: { studentIds: linkedStudentIds },
        type: QueryTypes.SELECT
      }
    );

    const studentIds = studentRows
      .map((row) => Number(row.student_id))
      .filter((value) => Number.isInteger(value) && value > 0);

    const classIds = studentRows
      .map((row) => Number(row.class_id))
      .filter((value) => Number.isInteger(value) && value > 0);

    return {
      studentIds: [...new Set(studentIds)],
      classIds: [...new Set(classIds)],
      studentIdCol
    };
  }

  async getFees(params = {}, scope = {}) {
    const mode = await this.getSchemaMode();
    if (mode === 'normalized') {
      return this.getFeesNormalized(params, scope);
    }
    return this.getFeesLegacy(params, scope);
  }

  buildStudentScopeClause(tables, scope = {}) {
    const parts = [];
    const values = [];
    if (Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
      parts.push(`${tables.students}.school_id = ?`);
      values.push(scope.schoolId);
    }
    if (Number.isInteger(scope.branchId) && scope.branchId > 0) {
      parts.push(`${tables.students}.branch_id = ?`);
      values.push(scope.branchId);
    }
    return { parts, values };
  }

  async getFeesLegacy({ page = 0, pageSize = 10, roll, feeType, classId } = {}, scope = {}) {
    const tables = await this.getTableMap();
    const { limit, offset, currentPage } = this.normalizePagination(page, pageSize);
    const [transactionTableColumns, studentColumns] = await Promise.all([
      getTableColumns(tables.feeTransactions),
      getTableColumns(tables.students)
    ]);
    const parentScope = await this.resolveParentLinkedStudents(scope, tables);
    const selectedStudentId = Number(scope?.selectedStudentId || 0);
    const selectedStudentFilter = Number.isInteger(selectedStudentId) && selectedStudentId > 0 ? selectedStudentId : null;

    if (this.isParentScope(scope) && (!parentScope || !parentScope.studentIds.length)) {
      return {
        feeDetails: [],
        transactions: [],
        total: 0,
        page: currentPage,
        pageSize: limit
      };
    }

    if (this.isParentScope(scope) && selectedStudentFilter && !parentScope.studentIds.includes(selectedStudentFilter)) {
      return {
        feeDetails: [],
        transactions: [],
        total: 0,
        page: currentPage,
        pageSize: limit
      };
    }

    let selectedStudentClassId = null;
    if (selectedStudentFilter) {
      const selectedStudentColumn = studentColumns.has('id') ? 'id' : studentColumns.has('sid') ? 'sid' : null;

      if (selectedStudentColumn) {
      const selectedClassRows = await sequelize.query(
        `
          SELECT ${studentColumns.has('class_id') ? `${tables.students}.class_id` : studentColumns.has('cid') ? `${tables.students}.cid` : 'NULL'} AS class_id
          FROM ${tables.students}
          WHERE ${tables.students}.${selectedStudentColumn} = ?
          LIMIT 1
        `,
        {
          replacements: [selectedStudentFilter],
          type: QueryTypes.SELECT
        }
      );
      selectedStudentClassId = Number(selectedClassRows?.[0]?.class_id) || null;
      }
    }

    const paymentDateSelect = transactionTableColumns.has('payment_date')
      ? `${tables.feeTransactions}.payment_date`
      : transactionTableColumns.has('created_at')
        ? `${tables.feeTransactions}.created_at`
        : transactionTableColumns.has('date')
          ? `${tables.feeTransactions}.date`
          : 'NULL';

    const receiptNumberSelect = transactionTableColumns.has('receipt_number')
      ? `${tables.feeTransactions}.receipt_number`
      : `CONCAT('RCT-LEG-', ${tables.feeTransactions}.payid)`;

    const paymentMethodSelect = transactionTableColumns.has('payment_method')
      ? `${tables.feeTransactions}.payment_method`
      : `'cash'`;

    const transactionReferenceSelect = transactionTableColumns.has('transaction_reference')
      ? `${tables.feeTransactions}.transaction_reference`
      : 'NULL';

    const feeDetailFilters = [];
    const feeDetailValues = [];

    if (classId) {
      feeDetailFilters.push(`${tables.feeDetails}.class = ?`);
      feeDetailValues.push(classId);
    }

    if (selectedStudentClassId) {
      feeDetailFilters.push(`${tables.feeDetails}.class = ?`);
      feeDetailValues.push(selectedStudentClassId);
    }

    if (this.isParentScope(scope) && parentScope.classIds.length) {
      feeDetailFilters.push(`${tables.feeDetails}.class IN (${parentScope.classIds.join(',')})`);
    }

    const feeDetailsPromise = sequelize.query(
      `
        SELECT
          ${tables.feeDetails}.*,
          COALESCE(${tables.classes}.name, ${tables.classes}.cn) AS cname,
          ${tables.classes}.cn AS cn
        FROM ${tables.feeDetails}
        LEFT JOIN ${tables.classes} ON ${tables.classes}.cid = ${tables.feeDetails}.class
        ${feeDetailFilters.length ? `WHERE ${feeDetailFilters.join(' AND ')}` : ''}
      `,
      {
        type: QueryTypes.SELECT,
        replacements: feeDetailValues
      }
    );

    const sanitizedRoll = roll ? String(roll) : undefined;
    const sanitizedFeeType =
      feeType !== undefined && feeType !== null ? parseInt(feeType, 10) : undefined;

    const transactionFilters = [];
    const transactionValues = [];

    if (sanitizedRoll) {
      transactionFilters.push(`${tables.feeTransactions}.roll = ?`);
      transactionValues.push(sanitizedRoll);
    }

    if (!Number.isNaN(sanitizedFeeType) && sanitizedFeeType) {
      transactionFilters.push(`${tables.feeTransactions}.feetype = ?`);
      transactionValues.push(sanitizedFeeType);
    }

    // Tenant scope via the joined students table
    const studentScope = this.buildStudentScopeClause(tables, scope);
    transactionFilters.push(...studentScope.parts);
    transactionValues.push(...studentScope.values);

    if (this.isParentScope(scope) && parentScope.studentIds.length) {
      const studentIdFilterColumn = parentScope.studentIdCol || 'id';
      transactionFilters.push(`${tables.students}.${studentIdFilterColumn} IN (${parentScope.studentIds.join(',')})`);
    }

    if (selectedStudentFilter) {
      const selectedStudentColumn = studentColumns.has('id') ? 'id' : studentColumns.has('sid') ? 'sid' : null;
      if (selectedStudentColumn) {
        transactionFilters.push(`${tables.students}.${selectedStudentColumn} = ?`);
        transactionValues.push(selectedStudentFilter);
      }
    }

    const transactionWhereClause = transactionFilters.length
      ? `WHERE ${transactionFilters.join(' AND ')}`
      : '';

    const transactionsPromise = sequelize.query(
      `
        SELECT
          ${tables.feeTransactions}.payid AS ftid,
          ${tables.feeTransactions}.roll,
          ${tables.feeTransactions}.feetype,
          ${receiptNumberSelect} AS receipt_number,
          ${paymentDateSelect} AS payment_date,
          ${paymentMethodSelect} AS payment_method,
          ${transactionReferenceSelect} AS transaction_reference,
          COALESCE(${tables.feeTransactions}.amountpaid_decimal, ${tables.feeTransactions}.amountpaid) AS amountpaid,
          ${tables.students}.fname,
          ${tables.students}.lname,
          COALESCE(${tables.classes}.name, ${tables.classes}.cn) AS cname,
          ${tables.sections}.sname AS secname
        FROM ${tables.feeTransactions}
        JOIN ${tables.students} ON ${tables.students}.roll = ${tables.feeTransactions}.roll
        LEFT JOIN ${tables.classes} ON ${tables.classes}.cid = COALESCE(${tables.students}.class_id, CAST(${tables.students}.cid AS SIGNED))
        LEFT JOIN ${tables.sections} ON ${tables.sections}.secid = COALESCE(${tables.students}.section_id, CAST(${tables.students}.secid AS SIGNED))
        ${transactionWhereClause}
        ORDER BY ${tables.feeTransactions}.payid DESC
        LIMIT ? OFFSET ?
      `,
      {
        replacements: [...transactionValues, limit, offset],
        type: QueryTypes.SELECT
      }
    );

    const countPromise = sequelize.query(
      `
        SELECT COUNT(*) AS total
        FROM ${tables.feeTransactions}
        ${transactionWhereClause}
      `,
      {
        replacements: transactionValues,
        type: QueryTypes.SELECT
      }
    );

    const [feeDetails, transactions, countRows] = await Promise.all([
      feeDetailsPromise,
      transactionsPromise,
      countPromise
    ]);

    return {
      feeDetails,
      transactions: transactions.map((row) => this.mapLegacyTransactionRow(row)),
      total: countRows?.[0]?.total ? Number(countRows[0].total) : 0,
      page: currentPage,
      pageSize: limit
    };
  }

  async getFeesNormalized({ page = 0, pageSize = 10, roll, feeType, classId, studentId } = {}, scope = {}) {
    const tables = await this.getTableMap();
    const { limit, offset, currentPage } = this.normalizePagination(page, pageSize);
    const currentYearId = await this.getCurrentAcademicYearId();
    const studentContext = await this.resolveStudentContext(scope, tables);
    const parentScope = await this.resolveParentLinkedStudents(scope, tables);
    const selectedStudentIdRaw = Number(studentId || scope?.selectedStudentId || 0);
    const selectedStudentId = Number.isInteger(selectedStudentIdRaw) && selectedStudentIdRaw > 0 ? selectedStudentIdRaw : null;

    if (this.isParentScope(scope) && (!parentScope || !parentScope.studentIds.length)) {
      return {
        feeDetails: [],
        transactions: [],
        total: 0,
        page: currentPage,
        pageSize: limit
      };
    }

    if (this.isParentScope(scope) && selectedStudentId && !parentScope.studentIds.includes(selectedStudentId)) {
      return {
        feeDetails: [],
        transactions: [],
        total: 0,
        page: currentPage,
        pageSize: limit
      };
    }

    let selectedStudentClassId = null;
    if (selectedStudentId) {
      const selectedRows = await sequelize.query(
        `SELECT class_id FROM ${tables.students} WHERE id = ? LIMIT 1`,
        {
          replacements: [selectedStudentId],
          type: QueryTypes.SELECT
        }
      );
      selectedStudentClassId = Number(selectedRows?.[0]?.class_id) || null;
    }

    const feeDetailFilters = [];
    const feeDetailValues = [];

    if (currentYearId) {
      feeDetailFilters.push(`${tables.feeStructures}.academic_year_id = ?`);
      feeDetailValues.push(currentYearId);
    }

    if (classId) {
      feeDetailFilters.push(`${tables.feeStructures}.class_id = ?`);
      feeDetailValues.push(classId);
    }

    if (studentContext?.class_id) {
      feeDetailFilters.push(`${tables.feeStructures}.class_id = ?`);
      feeDetailValues.push(studentContext.class_id);
    }

    if (selectedStudentClassId) {
      feeDetailFilters.push(`${tables.feeStructures}.class_id = ?`);
      feeDetailValues.push(selectedStudentClassId);
    }

    if (this.isParentScope(scope) && parentScope.classIds.length) {
      feeDetailFilters.push(`${tables.feeStructures}.class_id IN (${parentScope.classIds.join(',')})`);
    }

    const feeDetails = await sequelize.query(
      `
        SELECT
          ${tables.classes}.id AS class,
          COALESCE(${tables.classes}.name, CONCAT('Class ', ${tables.classes}.id)) AS cname,
          COALESCE(${tables.classes}.numeric_grade + 1, ${tables.classes}.id) AS cn,
          SUM(CASE WHEN ${tables.feeStructures}.fee_type = 'tuition' AND ${tables.feeStructures}.due_term = 'annual' THEN ${tables.feeStructures}.amount ELSE 0 END) AS tfee,
          SUM(CASE WHEN ${tables.feeStructures}.fee_type = 'tuition' AND ${tables.feeStructures}.due_term IN ('term_1','semester_1') THEN ${tables.feeStructures}.amount ELSE 0 END) AS fterm,
          SUM(CASE WHEN ${tables.feeStructures}.fee_type = 'tuition' AND ${tables.feeStructures}.due_term IN ('term_2','semester_2') THEN ${tables.feeStructures}.amount ELSE 0 END) AS sterm,
          SUM(CASE WHEN ${tables.feeStructures}.fee_type = 'tuition' AND ${tables.feeStructures}.due_term = 'term_3' THEN ${tables.feeStructures}.amount ELSE 0 END) AS thterm,
          SUM(CASE WHEN ${tables.feeStructures}.fee_type = 'transport' THEN ${tables.feeStructures}.amount ELSE 0 END) AS trans,
          SUM(CASE WHEN ${tables.feeStructures}.fee_type IN ('sports','exam') THEN ${tables.feeStructures}.amount ELSE 0 END) AS spofee
        FROM ${tables.feeStructures}
        JOIN ${tables.classes} ON ${tables.classes}.id = ${tables.feeStructures}.class_id
        ${feeDetailFilters.length ? `WHERE ${feeDetailFilters.join(' AND ')}` : ''}
        GROUP BY ${tables.classes}.id, ${tables.classes}.name, ${tables.classes}.numeric_grade
        ORDER BY ${tables.classes}.numeric_grade, ${tables.classes}.name
      `,
      {
        type: QueryTypes.SELECT,
        replacements: feeDetailValues
      }
    );

    const transactionFilters = [];
    const transactionValues = [];

    if (roll) {
      transactionFilters.push(`${tables.students}.roll_number = ?`);
      transactionValues.push(String(roll));
    }

    if (studentContext?.id) {
      transactionFilters.push(`${tables.studentFees}.student_id = ?`);
      transactionValues.push(studentContext.id);
    }

    const sanitizedFeeType =
      feeType !== undefined && feeType !== null ? parseInt(feeType, 10) : undefined;
    if (!Number.isNaN(sanitizedFeeType) && sanitizedFeeType) {
      const feeClause = this.buildFeeTypeClause(`${tables.feeStructures}`, sanitizedFeeType, transactionValues);
      if (feeClause) {
        transactionFilters.push(feeClause);
      }
    }

    // Tenant scope via the joined students table
    const studentScope = this.buildStudentScopeClause(tables, scope);
    transactionFilters.push(...studentScope.parts);
    transactionValues.push(...studentScope.values);

    if (this.isParentScope(scope) && parentScope.studentIds.length) {
      transactionFilters.push(`${tables.studentFees}.student_id IN (${parentScope.studentIds.join(',')})`);
    }

    if (selectedStudentId) {
      transactionFilters.push(`${tables.studentFees}.student_id = ?`);
      transactionValues.push(selectedStudentId);
    }

    const whereClause = transactionFilters.length ? `WHERE ${transactionFilters.join(' AND ')}` : '';

    const transactions = await sequelize.query(
      `
        SELECT
          ${tables.feePayments}.id AS payment_id,
          ${tables.feePayments}.student_fee_id,
          ${tables.feePayments}.receipt_number,
          ${tables.feePayments}.amount,
          ${tables.feePayments}.payment_date,
          ${tables.feePayments}.payment_method,
          ${tables.feePayments}.transaction_reference,
          ${tables.feePayments}.created_at,
          ${tables.studentFees}.student_id,
          ${tables.studentFees}.total_amount,
          ${tables.studentFees}.paid_amount,
          ${tables.feeStructures}.fee_type,
          ${tables.feeStructures}.due_term,
          ${tables.students}.roll_number,
          person.first_name,
          person.last_name,
          users.email AS student_email,
          ${tables.classes}.name AS cname,
          ${tables.sections}.name AS secname
        FROM ${tables.feePayments}
        JOIN ${tables.studentFees} ON ${tables.studentFees}.id = ${tables.feePayments}.student_fee_id
        JOIN ${tables.feeStructures} ON ${tables.feeStructures}.id = ${tables.studentFees}.fee_structure_id
        JOIN ${tables.students} ON ${tables.students}.id = ${tables.studentFees}.student_id
        LEFT JOIN ${tables.classes} ON ${tables.classes}.id = ${tables.students}.class_id
        LEFT JOIN ${tables.sections} ON ${tables.sections}.id = ${tables.students}.section_id
        LEFT JOIN ${tables.persons} AS person ON person.id = ${tables.students}.person_id
        LEFT JOIN ${tables.users} AS users ON users.id = person.user_id
        ${whereClause}
        ORDER BY ${tables.feePayments}.id DESC
        LIMIT ? OFFSET ?
      `,
      {
        replacements: [...transactionValues, limit, offset],
        type: QueryTypes.SELECT
      }
    );

    const countRows = await sequelize.query(
      `
        SELECT COUNT(*) AS total
        FROM ${tables.feePayments}
        JOIN ${tables.studentFees} ON ${tables.studentFees}.id = ${tables.feePayments}.student_fee_id
        JOIN ${tables.feeStructures} ON ${tables.feeStructures}.id = ${tables.studentFees}.fee_structure_id
        JOIN ${tables.students} ON ${tables.students}.id = ${tables.studentFees}.student_id
        ${whereClause}
      `,
      {
        replacements: transactionValues,
        type: QueryTypes.SELECT
      }
    );

    return {
      feeDetails: feeDetails.map((row) => this.mapFeeDetailsRow(row)),
      transactions: transactions.map((row) => this.mapNormalizedTransactionRow(row)),
      total: countRows?.[0]?.total ? Number(countRows[0].total) : 0,
      page: currentPage,
      pageSize: limit
    };
  }

  mapFeeDetailsRow(row) {
    return {
      ...row,
      cn: Number(row.cn || 0),
      tfee: Number(row.tfee || 0),
      fterm: Number(row.fterm || 0),
      sterm: Number(row.sterm || 0),
      thterm: Number(row.thterm || 0),
      trans: Number(row.trans || 0),
      spofee: Number(row.spofee || 0)
    };
  }

  async resolveClassIdNormalized(classToken, tables, scope = {}) {
    const parsed = Number(classToken);
    if (!parsed || parsed <= 0) {
      return null;
    }

    const classColumns = await getTableColumns(tables.classes);
    const clauses = [`id = ?`];
    const values = [parsed];

    if (classColumns.has('numeric_grade')) {
      clauses.push(`numeric_grade + 1 = ?`);
      values.push(parsed);
    }

    const schoolId = Number(scope?.schoolId || 0);
    if (classColumns.has('school_id') && Number.isInteger(schoolId) && schoolId > 0) {
      clauses.push(`school_id = ?`);
      values.push(schoolId);
    }

    const rows = await sequelize.query(
      `
        SELECT id
        FROM ${tables.classes}
        WHERE ${clauses.join(' OR ')}
        ORDER BY id
        LIMIT 1
      `,
      {
        replacements: values,
        type: QueryTypes.SELECT
      }
    );

    return rows?.[0]?.id || null;
  }

  mapLegacyTransactionRow(row) {
    return {
      ftid: row.ftid,
      roll: row.roll,
      feetype: row.feetype,
      amountpaid: Number(row.amountpaid || 0),
      created_at: row.payment_date || null,
      updated_at: row.payment_date || null,
      date: row.payment_date || null,
      receiptNumber: row.receipt_number || `RCT-LEG-${row.ftid}`,
      paymentMethod: row.payment_method || 'cash',
      transactionReference: row.transaction_reference || null,
      fname: row.fname,
      lname: row.lname,
      cname: row.cname,
      secname: row.secname
    };
  }

  mapNormalizedTransactionRow(row) {
    return {
      ftid: row.payment_id,
      roll: row.roll_number,
      feetype: this.mapFeeTypeCode(row.fee_type, row.due_term),
      amountpaid: Number(row.amount || 0),
      created_at: row.payment_date,
      updated_at: row.created_at,
      date: row.payment_date,
      receiptNumber: row.receipt_number || `RCT-${row.payment_id}`,
      paymentMethod: row.payment_method || 'online',
      transactionReference: row.transaction_reference || null,
      studentEmail: row.student_email || null,
      fname: row.first_name,
      lname: row.last_name,
      cname: row.cname,
      secname: row.secname
    };
  }

  mapFeeTypeCode(feeType, dueTerm) {
    if (feeType === 'transport') return 5;
    if (feeType === 'sports' || feeType === 'exam') return 4;
    if (feeType === 'tuition') {
      if (dueTerm === 'annual') return 1;
      if (dueTerm === 'term_1' || dueTerm === 'semester_1') return 2;
      if (dueTerm === 'term_2' || dueTerm === 'semester_2') return 3;
      if (dueTerm === 'term_3') return 4;
    }
    return 1;
  }

  buildFeeTypeClause(alias, feeCode, values) {
    const targets = FEE_TYPE_TARGETS[feeCode];
    if (!targets || !targets.length) return null;
    const clauses = targets.map((target) => {
      if (target.dueTerm) {
        values.push(target.feeType, target.dueTerm);
        return `(${alias}.fee_type = ? AND ${alias}.due_term = ?)`;
      }
      values.push(target.feeType);
      return `${alias}.fee_type = ?`;
    });
    return clauses.length ? `(${clauses.join(' OR ')})` : null;
  }

  async findTransactionById(id) {
    const mode = await this.getSchemaMode();
    if (mode === 'normalized') {
      return this.findPaymentByIdNormalized(id);
    }
    return this.findPaymentByIdLegacy(id);
  }

  async getPaymentReceiptData(paymentId, scope = {}) {
    const mode = await this.getSchemaMode();
    if (mode === 'normalized') {
      return this.getPaymentReceiptDataNormalized(paymentId, scope);
    }
    return this.getPaymentReceiptDataLegacy(paymentId, scope);
  }

  async getPaymentReceiptDataNormalized(paymentId, scope = {}) {
    const tables = await this.getTableMap();
    const parentScope = await this.resolveParentLinkedStudents(scope, tables);

    if (this.isParentScope(scope) && (!parentScope || !parentScope.studentIds.length)) {
      return null;
    }

    const scopeClauses = [];
    const scopeValues = [paymentId];
    if (Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
      scopeClauses.push(`${tables.students}.school_id = ?`);
      scopeValues.push(scope.schoolId);
    }
    if (Number.isInteger(scope.branchId) && scope.branchId > 0) {
      scopeClauses.push(`${tables.students}.branch_id = ?`);
      scopeValues.push(scope.branchId);
    }
    if (this.isParentScope(scope) && parentScope.studentIds.length) {
      scopeClauses.push(`${tables.students}.id IN (${parentScope.studentIds.join(',')})`);
    }

    const whereScope = scopeClauses.length ? ` AND ${scopeClauses.join(' AND ')}` : '';

    const rows = await sequelize.query(
      `
        SELECT
          ${tables.feePayments}.id AS payment_id,
          ${tables.feePayments}.receipt_number,
          ${tables.feePayments}.amount,
          ${tables.feePayments}.payment_date,
          ${tables.feePayments}.payment_method,
          ${tables.feePayments}.transaction_reference,
          ${tables.feeStructures}.fee_type,
          ${tables.feeStructures}.due_term,
          ${tables.students}.id AS student_id,
          ${tables.students}.roll_number,
          ${tables.students}.school_id,
          person.first_name,
          person.last_name,
          users.email AS student_email,
          ${tables.classes}.name AS class_name,
          ${tables.sections}.name AS section_name,
          ${tables.schools}.name AS school_name,
          ${tables.schools}.code AS school_code
        FROM ${tables.feePayments}
        JOIN ${tables.studentFees} ON ${tables.studentFees}.id = ${tables.feePayments}.student_fee_id
        JOIN ${tables.feeStructures} ON ${tables.feeStructures}.id = ${tables.studentFees}.fee_structure_id
        JOIN ${tables.students} ON ${tables.students}.id = ${tables.studentFees}.student_id
        LEFT JOIN ${tables.persons} AS person ON person.id = ${tables.students}.person_id
        LEFT JOIN ${tables.users} AS users ON users.id = person.user_id
        LEFT JOIN ${tables.classes} ON ${tables.classes}.id = ${tables.students}.class_id
        LEFT JOIN ${tables.sections} ON ${tables.sections}.id = ${tables.students}.section_id
        LEFT JOIN ${tables.schools} ON ${tables.schools}.id = ${tables.students}.school_id
        WHERE ${tables.feePayments}.id = ?${whereScope}
        LIMIT 1
      `,
      {
        replacements: scopeValues,
        type: QueryTypes.SELECT
      }
    );

    return rows[0] || null;
  }

  async getPaymentReceiptDataLegacy(paymentId, scope = {}) {
    const tables = await this.getTableMap();
    const parentScope = await this.resolveParentLinkedStudents(scope, tables);

    if (this.isParentScope(scope) && (!parentScope || !parentScope.studentIds.length)) {
      return null;
    }

    const feeTransactionColumns = await getTableColumns(tables.feeTransactions);
    const studentColumns = await getTableColumns(tables.students);

    const hasStudentSchoolId = studentColumns.has('school_id');
    const hasStudentBranchId = studentColumns.has('branch_id');
    const hasStudentClassId = studentColumns.has('class_id');
    const hasStudentSectionId = studentColumns.has('section_id');
    const hasStudentEmail = studentColumns.has('email');
    const studentIdSelect = studentColumns.has('id')
      ? `${tables.students}.id`
      : studentColumns.has('sid')
        ? `${tables.students}.sid`
        : 'NULL';

    const paymentDateSelect = feeTransactionColumns.has('payment_date')
      ? `${tables.feeTransactions}.payment_date`
      : feeTransactionColumns.has('created_at')
        ? `${tables.feeTransactions}.created_at`
        : feeTransactionColumns.has('date')
          ? `${tables.feeTransactions}.date`
          : 'NOW()';

    const receiptNumberSelect = feeTransactionColumns.has('receipt_number')
      ? `${tables.feeTransactions}.receipt_number`
      : `CONCAT('RCT-LEG-', ${tables.feeTransactions}.payid)`;

    const paymentMethodSelect = feeTransactionColumns.has('payment_method')
      ? `${tables.feeTransactions}.payment_method`
      : `'cash'`;

    const transactionReferenceSelect = feeTransactionColumns.has('transaction_reference')
      ? `${tables.feeTransactions}.transaction_reference`
      : 'NULL';

    const studentClassJoinKey = hasStudentClassId
      ? `${tables.students}.class_id`
      : `CAST(${tables.students}.cid AS SIGNED)`;

    const studentSectionJoinKey = hasStudentSectionId
      ? `${tables.students}.section_id`
      : `CAST(${tables.students}.secid AS SIGNED)`;

    const scopeClauses = [];
    const scopeValues = [paymentId];
    if (hasStudentSchoolId && Number.isInteger(scope.schoolId) && scope.schoolId > 0) {
      scopeClauses.push(`${tables.students}.school_id = ?`);
      scopeValues.push(scope.schoolId);
    }
    if (hasStudentBranchId && Number.isInteger(scope.branchId) && scope.branchId > 0) {
      scopeClauses.push(`${tables.students}.branch_id = ?`);
      scopeValues.push(scope.branchId);
    }
    if (this.isParentScope(scope) && parentScope.studentIds.length) {
      const studentScopeColumn = parentScope.studentIdCol || (studentColumns.has('id') ? 'id' : studentColumns.has('sid') ? 'sid' : null);
      if (studentScopeColumn) {
        scopeClauses.push(`${tables.students}.${studentScopeColumn} IN (${parentScope.studentIds.join(',')})`);
      }
    }

    const whereScope = scopeClauses.length ? ` AND ${scopeClauses.join(' AND ')}` : '';

    const schoolNameSelect = hasStudentSchoolId
      ? `${tables.schools}.name`
      : 'NULL';

    const schoolCodeSelect = hasStudentSchoolId
      ? `${tables.schools}.code`
      : 'NULL';

    const studentEmailSelect = hasStudentEmail
      ? `${tables.students}.email`
      : 'NULL';

    const schoolLeftJoin = hasStudentSchoolId
      ? `LEFT JOIN ${tables.schools} ON ${tables.schools}.id = ${tables.students}.school_id`
      : '';

    const rows = await sequelize.query(
      `
        SELECT
          ${tables.feeTransactions}.payid AS payment_id,
          ${tables.feeTransactions}.feetype,
          ${tables.feeTransactions}.roll,
          COALESCE(${tables.feeTransactions}.amountpaid_decimal, ${tables.feeTransactions}.amountpaid) AS amount,
          ${receiptNumberSelect} AS receipt_number,
          ${paymentDateSelect} AS payment_date,
          ${paymentMethodSelect} AS payment_method,
          ${transactionReferenceSelect} AS transaction_reference,
          ${studentIdSelect} AS student_id,
          ${studentEmailSelect} AS student_email,
          ${tables.students}.fname AS first_name,
          ${tables.students}.lname AS last_name,
          COALESCE(${tables.classes}.name, ${tables.classes}.cn) AS class_name,
          ${tables.sections}.sname AS section_name,
          ${schoolNameSelect} AS school_name,
          ${schoolCodeSelect} AS school_code
        FROM ${tables.feeTransactions}
        JOIN ${tables.students} ON ${tables.students}.roll = ${tables.feeTransactions}.roll
        LEFT JOIN ${tables.classes} ON ${tables.classes}.cid = ${studentClassJoinKey}
        LEFT JOIN ${tables.sections} ON ${tables.sections}.secid = ${studentSectionJoinKey}
        ${schoolLeftJoin}
        WHERE ${tables.feeTransactions}.payid = ?${whereScope}
        LIMIT 1
      `,
      {
        replacements: scopeValues,
        type: QueryTypes.SELECT
      }
    );

    return rows[0] || null;
  }

  async findPaymentByIdLegacy(id) {
    const tables = await this.getTableMap();
    const paymentColumns = await getTableColumns(tables.feeTransactions);

    const paymentDateSelect = paymentColumns.has('payment_date')
      ? `${tables.feeTransactions}.payment_date`
      : paymentColumns.has('created_at')
        ? `${tables.feeTransactions}.created_at`
        : paymentColumns.has('date')
          ? `${tables.feeTransactions}.date`
          : 'NULL';

    const receiptNumberSelect = paymentColumns.has('receipt_number')
      ? `${tables.feeTransactions}.receipt_number`
      : `CONCAT('RCT-LEG-', ${tables.feeTransactions}.payid)`;

    const paymentMethodSelect = paymentColumns.has('payment_method')
      ? `${tables.feeTransactions}.payment_method`
      : `'cash'`;

    const transactionReferenceSelect = paymentColumns.has('transaction_reference')
      ? `${tables.feeTransactions}.transaction_reference`
      : 'NULL';

    const results = await sequelize.query(
      `
        SELECT
          ${tables.feeTransactions}.payid AS id,
          ${tables.feeTransactions}.roll,
          ${tables.feeTransactions}.feetype,
          COALESCE(${tables.feeTransactions}.amountpaid_decimal, ${tables.feeTransactions}.amountpaid) AS amountpaid,
          ${receiptNumberSelect} AS receipt_number,
          ${paymentDateSelect} AS payment_date,
          ${paymentMethodSelect} AS payment_method,
          ${transactionReferenceSelect} AS transaction_reference
        FROM ${tables.feeTransactions}
        WHERE ${tables.feeTransactions}.payid = ?
        LIMIT 1
      `,
      {
        type: QueryTypes.SELECT,
        replacements: [id]
      }
    );

    if (!results.length) {
      return null;
    }

    return {
      ...results[0],
      amountpaid: Number(results[0].amountpaid || 0),
      created_at: results[0].payment_date || null,
      updated_at: results[0].payment_date || null,
      receipt_number: results[0].receipt_number || `RCT-LEG-${results[0].id}`
    };
  }

  async findPaymentByIdNormalized(id) {
    const tables = await this.getTableMap();
    const rows = await sequelize.query(
      `
        SELECT
          ${tables.feePayments}.id AS payment_id,
          ${tables.feePayments}.receipt_number,
          ${tables.feePayments}.amount,
          ${tables.feePayments}.payment_date,
          ${tables.feePayments}.payment_method,
          ${tables.feePayments}.transaction_reference,
          ${tables.feePayments}.created_at,
          ${tables.feeStructures}.fee_type,
          ${tables.feeStructures}.due_term,
          ${tables.students}.roll_number,
          person.first_name,
          person.last_name,
          users.email AS student_email,
          ${tables.classes}.name AS cname,
          ${tables.sections}.name AS secname
        FROM ${tables.feePayments}
        JOIN ${tables.studentFees} ON ${tables.studentFees}.id = ${tables.feePayments}.student_fee_id
        JOIN ${tables.feeStructures} ON ${tables.feeStructures}.id = ${tables.studentFees}.fee_structure_id
        JOIN ${tables.students} ON ${tables.students}.id = ${tables.studentFees}.student_id
        LEFT JOIN ${tables.classes} ON ${tables.classes}.id = ${tables.students}.class_id
        LEFT JOIN ${tables.sections} ON ${tables.sections}.id = ${tables.students}.section_id
        LEFT JOIN ${tables.persons} AS person ON person.id = ${tables.students}.person_id
        LEFT JOIN ${tables.users} AS users ON users.id = person.user_id
        WHERE ${tables.feePayments}.id = ?
        LIMIT 1
      `,
      {
        replacements: [id],
        type: QueryTypes.SELECT
      }
    );

    if (!rows.length) {
      return null;
    }

    return {
      id: rows[0].payment_id,
      roll: rows[0].roll_number,
      feetype: this.mapFeeTypeCode(rows[0].fee_type, rows[0].due_term),
      amountpaid: Number(rows[0].amount || 0),
      created_at: rows[0].payment_date,
      updated_at: rows[0].created_at,
      receipt_number: rows[0].receipt_number || `RCT-${rows[0].payment_id}`,
      payment_method: rows[0].payment_method || 'online',
      transaction_reference: rows[0].transaction_reference || null,
      student_email: rows[0].student_email || null,
      cname: rows[0].cname,
      secname: rows[0].secname,
      fname: rows[0].first_name,
      lname: rows[0].last_name
    };
  }

  async createPayment({ roll, feeType, amount }, scope = {}) {
    const mode = await this.getSchemaMode();
    if (mode === 'normalized') {
      return this.createPaymentNormalized({ roll, feeType, amount }, scope);
    }
    return this.createPaymentLegacy({ roll, feeType, amount }, scope);
  }

  async createPaymentLegacy({ roll, feeType, amount }, scope = {}) {
    const tables = await this.getTableMap();
    const parsedAmount = Number(amount);
    const schoolId = Number(scope?.schoolId || 0);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return null;
    }

    const studentColumns = await getTableColumns(tables.students);
    if (studentColumns.has('school_id')) {
      if (!Number.isInteger(schoolId) || schoolId <= 0) {
        throw new AppError('School context is required', 400);
      }

      const schoolScopedStudent = await sequelize.query(
        `SELECT 1 FROM ${tables.students} WHERE roll = ? AND school_id = ? LIMIT 1`,
        {
          replacements: [roll, schoolId],
          type: QueryTypes.SELECT
        }
      );

      if (!schoolScopedStudent.length) {
        throw new AppError('Student not found for the provided roll number in current school', 404);
      }
    }

    const [, metadata] = await sequelize.query(
      `
        INSERT INTO ${tables.feeTransactions}
          (roll, feetype, amountpaid, amountpaid_decimal)
        VALUES (?, ?, ?, ?)
      `,
      {
        replacements: [roll, feeType, Math.round(parsedAmount), parsedAmount]
      }
    );

    const insertedId = metadata?.insertId;
    if (!insertedId) {
      return null;
    }

    return this.findPaymentByIdLegacy(insertedId);
  }

  async createPaymentNormalized({ roll, feeType, amount }, scope = {}) {
    const tables = await this.getTableMap();
    const parsedAmount = Number(amount);
    const schoolId = Number(scope?.schoolId || 0);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return null;
    }

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError('School context is required', 400);
    }

    return sequelize.transaction(async (transaction) => {
      const students = await sequelize.query(
        `SELECT id FROM ${tables.students} WHERE roll_number = ? AND school_id = ? LIMIT 1`,
        {
          replacements: [roll, schoolId],
          type: QueryTypes.SELECT,
          transaction
        }
      );
      if (!students.length) {
        throw new AppError('Student not found for the provided roll number', 404);
      }

      const targetFee = await this.findStudentFeeForCode(
        students[0].id,
        feeType,
        tables,
        transaction
      );

      if (!targetFee) {
        throw new AppError('Requested fee component is not configured for this student', 400);
      }

      const remaining =
        Number(targetFee.final_amount || targetFee.total_amount || 0) -
        Number(targetFee.paid_amount || 0);
      if (remaining <= 0) {
        throw new AppError('Selected fee is already settled', 409);
      }

      const appliedAmount = Math.min(parsedAmount, remaining);

      const [, metadata] = await sequelize.query(
        `
          INSERT INTO ${tables.feePayments}
            (student_fee_id, receipt_number, amount, payment_date, payment_method, transaction_reference, created_at)
          VALUES (?, ?, ?, NOW(), 'online', ?, NOW())
        `,
        {
          replacements: [
            targetFee.id,
            `RCT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            appliedAmount,
            `TXN${Math.floor(Math.random() * 1_000_000)}`
          ],
          transaction
        }
      );

      await sequelize.query(
        `
          UPDATE ${tables.studentFees}
          SET paid_amount = paid_amount + ?,
              status = CASE
                WHEN paid_amount + ? >= final_amount THEN 'paid'
                ELSE 'partial'
              END,
              updated_at = NOW()
          WHERE id = ?
        `,
        {
          replacements: [appliedAmount, appliedAmount, targetFee.id],
          transaction
        }
      );

      const insertedId = metadata?.insertId;
      return this.findPaymentByIdNormalized(insertedId);
    });
  }

  async findStudentFeeForCode(studentId, feeCode, tables, transaction) {
    const targets = FEE_TYPE_TARGETS[feeCode] || FEE_TYPE_TARGETS[1];
    if (!targets || !targets.length) {
      return null;
    }

    const clauses = [];
    const values = [studentId];
    targets.forEach((target) => {
      if (target.dueTerm) {
        clauses.push(
          `(${tables.feeStructures}.fee_type = ? AND ${tables.feeStructures}.due_term = ?)`
        );
        values.push(target.feeType, target.dueTerm);
      } else {
        clauses.push(`${tables.feeStructures}.fee_type = ?`);
        values.push(target.feeType);
      }
    });

    const rows = await sequelize.query(
      `
        SELECT ${tables.studentFees}.*, ${tables.feeStructures}.fee_type, ${tables.feeStructures}.due_term
        FROM ${tables.studentFees}
        JOIN ${tables.feeStructures} ON ${tables.feeStructures}.id = ${tables.studentFees}.fee_structure_id
        WHERE ${tables.studentFees}.student_id = ?
          AND (${clauses.join(' OR ')})
        ORDER BY ${tables.studentFees}.id
        LIMIT 1
      `,
      {
        replacements: values,
        type: QueryTypes.SELECT,
        transaction
      }
    );

    return rows[0] || null;
  }

  /**
   * Fee Structure Management (feedetails table)
   */
  async getAllFeeDetails(scope = {}) {
    const mode = await this.getSchemaMode();
    const tables = await this.getTableMap();
    const parentScope = await this.resolveParentLinkedStudents(scope, tables);

    if (this.isParentScope(scope) && (!parentScope || !parentScope.studentIds.length)) {
      return [];
    }

    if (mode === 'normalized') {
      const currentYearId = await this.getCurrentAcademicYearId();
      const studentContext = await this.resolveStudentContext(scope, tables);

      const whereClauses = [];
      const replacements = [];

      if (currentYearId) {
        whereClauses.push('fs.academic_year_id = ?');
        replacements.push(currentYearId);
      }

      if (studentContext?.class_id) {
        whereClauses.push('classes.id = ?');
        replacements.push(studentContext.class_id);
      }

      if (this.isParentScope(scope) && parentScope.classIds.length) {
        whereClauses.push(`classes.id IN (${parentScope.classIds.join(',')})`);
      }

      const results = await sequelize.query(
        `
          SELECT
            classes.id AS class,
            COALESCE(classes.name, CONCAT('Class ', classes.id)) AS cname,
            COALESCE(classes.numeric_grade + 1, classes.id) AS cn,
            SUM(CASE WHEN fs.fee_type = 'tuition' AND fs.due_term = 'annual' THEN fs.amount ELSE 0 END) AS tfee,
            SUM(CASE WHEN fs.fee_type = 'tuition' AND fs.due_term IN ('term_1','semester_1') THEN fs.amount ELSE 0 END) AS fterm,
            SUM(CASE WHEN fs.fee_type = 'tuition' AND fs.due_term IN ('term_2','semester_2') THEN fs.amount ELSE 0 END) AS sterm,
            SUM(CASE WHEN fs.fee_type = 'tuition' AND fs.due_term = 'term_3' THEN fs.amount ELSE 0 END) AS thterm,
            SUM(CASE WHEN fs.fee_type = 'transport' THEN fs.amount ELSE 0 END) AS trans,
            SUM(CASE WHEN fs.fee_type IN ('sports','exam') THEN fs.amount ELSE 0 END) AS spofee
          FROM ${tables.classes} AS classes
          LEFT JOIN ${tables.feeStructures} AS fs ON fs.class_id = classes.id
          ${whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''}
          GROUP BY classes.id, classes.name, classes.numeric_grade
          ORDER BY classes.id ASC
        `,
        {
          type: QueryTypes.SELECT,
          replacements
        }
      );
      return results.map(row => this.mapFeeDetailsRow(row));
    }

    const legacyWhere = [];

    if (this.isParentScope(scope) && parentScope.classIds.length) {
      legacyWhere.push(`${tables.feeDetails}.class IN (${parentScope.classIds.join(',')})`);
    }

    return await sequelize.query(
      `
        SELECT
          ${tables.feeDetails}.*,
          COALESCE(${tables.classes}.name, ${tables.classes}.cn) AS cname,
          ${tables.classes}.cn AS cn
        FROM ${tables.feeDetails}
        LEFT JOIN ${tables.classes} ON ${tables.classes}.cid = ${tables.feeDetails}.class
        ${legacyWhere.length ? `WHERE ${legacyWhere.join(' AND ')}` : ''}
        ORDER BY CAST(${tables.feeDetails}.class AS SIGNED) ASC
      `,
      {
        type: QueryTypes.SELECT
      }
    );
  }

  async updateFeeDetails(data, scope = {}) {
    const mode = await this.getSchemaMode();
    const tables = await this.getTableMap();
    const schoolId = Number(scope?.schoolId || 0);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError('School context is required', 400);
    }

    if (mode === 'normalized') {
      const currentYearId = await this.getCurrentAcademicYearId();
      if (!currentYearId) {
        throw new AppError('Cannot update normalized fee structure without an active academic year', 400);
      }

      const classId = await this.resolveClassIdNormalized(data.sclass, tables, scope);
      if (!classId) {
        throw new AppError('Class could not be resolved in normalized schema', 400);
      }

      const components = [
        { feeType: 'tuition', dueTerm: 'annual', amount: Number(data.tfee || 0) },
        { feeType: 'tuition', dueTerm: 'term_1', amount: Number(data.fterm || 0) },
        { feeType: 'tuition', dueTerm: 'term_2', amount: Number(data.sterm || 0) },
        { feeType: 'tuition', dueTerm: 'term_3', amount: Number(data.thterm || 0) },
        { feeType: 'transport', dueTerm: 'annual', amount: Number(data.trans || 0) },
        { feeType: 'sports', dueTerm: 'term_3', amount: Number(data.spofee || 0) }
      ];

      await sequelize.transaction(async (transaction) => {
        for (const component of components) {
          // eslint-disable-next-line no-await-in-loop
          const existing = await sequelize.query(
            `
              SELECT id
              FROM ${tables.feeStructures}
              WHERE academic_year_id = ?
                AND class_id = ?
                AND fee_type = ?
                AND due_term = ?
              LIMIT 1
            `,
            {
              replacements: [currentYearId, classId, component.feeType, component.dueTerm],
              type: QueryTypes.SELECT,
              transaction
            }
          );

          const existingId = existing?.[0]?.id;
          if (component.amount > 0) {
            if (existingId) {
              const updateSql = `
                  UPDATE ${tables.feeStructures}
                  SET amount = ?, updated_at = NOW()
                  WHERE id = ?
                `;

              const updateReplacements = [component.amount, existingId];

              // eslint-disable-next-line no-await-in-loop
              await sequelize.query(updateSql, {
                replacements: updateReplacements,
                transaction
              });
            } else {
              const insertColumns = '(academic_year_id, class_id, fee_type, amount, due_term, is_mandatory, created_at, updated_at)';

              const insertValues = '(?, ?, ?, ?, ?, 1, NOW(), NOW())';

              const insertReplacements = [currentYearId, classId, component.feeType, component.amount, component.dueTerm];

              // eslint-disable-next-line no-await-in-loop
              await sequelize.query(
                `
                  INSERT INTO ${tables.feeStructures}
                  ${insertColumns}
                  VALUES ${insertValues}
                `,
                {
                  replacements: insertReplacements,
                  transaction
                }
              );
            }
          } else if (existingId) {
            // eslint-disable-next-line no-await-in-loop
            await sequelize.query(
              `DELETE FROM ${tables.feeStructures} WHERE id = ?`,
              {
                replacements: [existingId],
                transaction
              }
            );
          }
        }
      });

      return { success: true };
    }

    const { sclass, tfee, fterm, sterm, thterm, trans, spofee } = data;

    // Check if exists
    const existing = await sequelize.query(
      `SELECT * FROM ${tables.feeDetails} WHERE class = ?`,
      {
        replacements: [sclass],
        type: QueryTypes.SELECT
      }
    );

    if (existing.length) {
      // Update
      await sequelize.query(
        `
          UPDATE ${tables.feeDetails}
          SET tfee = ?, fterm = ?, sterm = ?, thterm = ?, trans = ?, spofee = ?
          WHERE class = ?
        `,
        {
          replacements: [tfee, fterm, sterm, thterm, trans, spofee, sclass]
        }
      );
    } else {
      // Insert
      await sequelize.query(
        `
          INSERT INTO ${tables.feeDetails}
          (class, tfee, fterm, sterm, thterm, trans, spofee)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        {
          replacements: [sclass, tfee, fterm, sterm, thterm, trans, spofee]
        }
      );
    }

    return { success: true };
  }

  async deleteFeeDetails(classId, scope = {}) {
    const mode = await this.getSchemaMode();
    const tables = await this.getTableMap();
    const schoolId = Number(scope?.schoolId || 0);

    if (!Number.isInteger(schoolId) || schoolId <= 0) {
      throw new AppError('School context is required', 400);
    }

    if (mode === 'normalized') {
      const currentYearId = await this.getCurrentAcademicYearId();
      const classIdScoped = await this.resolveClassIdNormalized(classId, tables, scope);
      if (!classIdScoped) {
        throw new AppError('Class could not be resolved in normalized schema', 400);
      }
      if (currentYearId) {
        await sequelize.query(
          `DELETE FROM ${tables.feeStructures} WHERE class_id = ? AND academic_year_id = ?`,
          {
            replacements: [classIdScoped, currentYearId]
          }
        );
      }
      return { success: true };
    }

    await sequelize.query(
      `DELETE FROM ${tables.feeDetails} WHERE class = ?`,
      {
        replacements: [classId]
      }
    );
    return { success: true };
  }
}

module.exports = new FeeRepository();
