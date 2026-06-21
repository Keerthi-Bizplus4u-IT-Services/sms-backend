/**
 * Schema Drift Integration Test
 * Ensures the students table in the database matches the Sequelize model definition.
 */

const realDatabaseConfig = jest.requireActual('../../../../src/config/database');
const { sequelize, Sequelize } = realDatabaseConfig;
const defineStudent = require('../../../../src/models/Student');

describe('Student schema alignment', () => {
  let Student;

  beforeAll(() => {
    Student = defineStudent(sequelize, Sequelize.DataTypes);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const filterAuditColumns = (columns) =>
    columns.filter((column) => !['created_at', 'updated_at', 'deleted_at'].includes(column)).sort();

  it('detects column drift between DB schema and Sequelize model', async () => {
    const tableDefinition = await sequelize.getQueryInterface().describeTable('students');
    const dbColumns = filterAuditColumns(Object.keys(tableDefinition));
    const modelColumns = filterAuditColumns(Object.keys(Student.rawAttributes));

    const missingInModel = dbColumns.filter((column) => !modelColumns.includes(column)).sort();
    const extraInModel = modelColumns.filter((column) => !dbColumns.includes(column)).sort();

    expect(missingInModel).toEqual([]);
    expect(extraInModel).toEqual([]);
  });

  it('detects nullable constraint drift for overlapping columns', async () => {
    const tableDefinition = await sequelize.getQueryInterface().describeTable('students');

    const ignoredColumns = new Set(['id', 'created_at', 'updated_at', 'deleted_at']);

    const nullableDrift = Object.entries(tableDefinition)
      .map(([column, meta]) => {
        if (ignoredColumns.has(column)) {
          return null;
        }

        const attribute = Student.rawAttributes[column];
        if (!attribute) {
          return null;
        }

        const modelAllowsNull = attribute.allowNull !== false;
        const dbAllowsNull = meta.allowNull;

        if (dbAllowsNull === modelAllowsNull) {
          return null;
        }

        return {
          column,
          dbAllowsNull,
          modelAllowsNull
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.column.localeCompare(b.column));

    expect(nullableDrift).toEqual([]);
  });
});
