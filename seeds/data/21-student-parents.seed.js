/**
 * Seed: Student-Parent Links
 * Connects seeded parent profiles to seeded students through the student_parents join table.
 */
const { QueryTypes } = require('sequelize');
const { Parent, Person, Student, User, sequelize } = require('../../src/models');
const { resolveTableName, resetSchemaCache } = require('../../src/api/v1/repositories/helpers/schema.utils');

async function ensureStudentParentsTable() {
  const dialect = typeof sequelize.getDialect === 'function' ? sequelize.getDialect() : sequelize?.options?.dialect;

  if (dialect === 'postgres') {
    await sequelize.query(
      `
        CREATE TABLE IF NOT EXISTS student_parents (
          id BIGSERIAL PRIMARY KEY,
          student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          parent_id BIGINT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
          relationship_type VARCHAR(20) NOT NULL,
          is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,
          is_emergency_contact BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (student_id, parent_id)
        )
      `
    );
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_student_parents_student_id ON student_parents(student_id)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_student_parents_parent_id ON student_parents(parent_id)');
    return;
  }

  await sequelize.query(
    `
      CREATE TABLE IF NOT EXISTS student_parents (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        student_id BIGINT UNSIGNED NOT NULL,
        parent_id BIGINT UNSIGNED NOT NULL,
        relationship_type ENUM('father', 'mother', 'guardian', 'other') NOT NULL,
        is_primary_contact BOOLEAN DEFAULT FALSE,
        is_emergency_contact BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_student_parent (student_id, parent_id),
        INDEX idx_student_parents_student_id (student_id),
        INDEX idx_student_parents_parent_id (parent_id),
        CONSTRAINT fk_student_parents_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        CONSTRAINT fk_student_parents_parent FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE
      )
    `
  );
}

async function seed() {
  let tableName = await resolveTableName(['student_parents']);
  if (!tableName) {
    await ensureStudentParentsTable();
    resetSchemaCache();
    tableName = await resolveTableName(['student_parents']);
  }

  if (!tableName) {
    console.warn('   Skipped student-parent links: student_parents table not available');
    return;
  }

  const parents = await Parent.findAll({
    include: [{ model: Person, as: 'person', attributes: ['gender'], include: [{ model: User, as: 'user', attributes: ['school_id'] }] }],
    order: [['id', 'ASC']],
  });
  const students = await Student.findAll({
    order: [['school_id', 'ASC'], ['id', 'ASC']],
  });

  const parentsBySchool = parents.reduce((map, parent) => {
    const schoolId = Number(parent.person?.user?.school_id || 0);
    const personGender = parent.person?.gender || 'other';
    if (!schoolId) {
      return map;
    }
    if (!map.has(schoolId)) {
      map.set(schoolId, []);
    }
    map.get(schoolId).push({ id: parent.id, gender: personGender });
    return map;
  }, new Map());
  let linksCreated = 0;
  const studentsBySchool = students.reduce((map, student) => {
    const schoolId = Number(student.school_id);
    if (!map.has(schoolId)) {
      map.set(schoolId, []);
    }
    map.get(schoolId).push(student);
    return map;
  }, new Map());

  for (const [schoolId, schoolStudents] of studentsBySchool.entries()) {
    const schoolParents = parentsBySchool.get(Number(schoolId)) || [];
    if (!schoolParents.length) {
      continue;
    }

    for (const [index, student] of schoolStudents.entries()) {
      const parent = schoolParents[index % schoolParents.length];
      const relationshipType = parent.gender === 'female' ? 'mother' : parent.gender === 'male' ? 'father' : 'guardian';
      const existing = await sequelize.query(
        `SELECT 1 FROM ${tableName} WHERE student_id = :studentId AND parent_id = :parentId LIMIT 1`,
        {
          replacements: {
            studentId: student.id,
            parentId: parent.id,
          },
          type: QueryTypes.SELECT,
        }
      );

      if (existing.length) {
        continue;
      }

      await sequelize.query(
        `
          INSERT INTO ${tableName} (student_id, parent_id, relationship_type, is_primary_contact, is_emergency_contact, created_at)
          VALUES (:studentId, :parentId, :relationshipType, TRUE, TRUE, NOW())
        `,
        {
          replacements: {
            studentId: student.id,
            parentId: parent.id,
            relationshipType,
          }
        }
      );
      linksCreated += 1;
    }
  }

  console.log(`   Seeded ${linksCreated} student-parent links`);
}

module.exports = seed;