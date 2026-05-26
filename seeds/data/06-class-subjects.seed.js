/**
 * Seed: Class-Subject Mapping
 * Ensures each class has subject mappings so class-scoped subject APIs return data.
 */
const { QueryTypes } = require('sequelize');
const { sequelize, Class, Subject, SchoolBranch } = require('../../src/models');
const { resolveTableName, getTableColumns } = require('../../src/api/v1/repositories/helpers/schema.utils');

const SUBJECT_CODES_BY_GRADE = {
  junior: ['ENG', 'MATH', 'SCI', 'SOC', 'HIN', 'ART', 'PE'],
  middle: ['ENG', 'MATH', 'SCI', 'SOC', 'HIN', 'CS', 'PE'],
  senior: ['ENG', 'MATH', 'PHY', 'CHE', 'BIO', 'CS', 'SOC']
};

function resolveSubjectCodes(numericGrade) {
  if (numericGrade >= 9) {
    return SUBJECT_CODES_BY_GRADE.senior;
  }

  if (numericGrade >= 6) {
    return SUBJECT_CODES_BY_GRADE.middle;
  }

  return SUBJECT_CODES_BY_GRADE.junior;
}

async function seed() {
  const classSubjectTable = await resolveTableName(['class_subjects']);
  if (!classSubjectTable) {
    console.log('   Skipped class-subject seeding (class_subjects table not found)');
    return;
  }

  const tableColumns = await getTableColumns(classSubjectTable);
  const supportsIsMandatory = tableColumns.has('is_mandatory');

  const classes = await Class.findAll({
    include: [{ model: SchoolBranch, as: 'branch', attributes: ['school_id'] }],
    order: [['id', 'ASC']]
  });

  let total = 0;

  for (const classRecord of classes) {
    const schoolId = classRecord?.branch?.school_id;
    if (!schoolId) {
      continue;
    }

    const codePrefixes = resolveSubjectCodes(classRecord.numeric_grade || 1);
    const subjectCodes = codePrefixes.map((code) => `${code}-${schoolId}`);

    const subjects = await Subject.findAll({
      where: {
        school_id: schoolId,
        code: subjectCodes
      },
      order: [['id', 'ASC']]
    });

    for (const subject of subjects) {
      const replacements = {
        classId: classRecord.id,
        subjectId: subject.id,
        isMandatory: subject.is_mandatory !== false
      };

      if (supportsIsMandatory) {
        await sequelize.query(
          `INSERT INTO ${classSubjectTable} (class_id, subject_id, is_mandatory)
           VALUES (:classId, :subjectId, :isMandatory)
           ON CONFLICT (class_id, subject_id) DO NOTHING`,
          { replacements, type: QueryTypes.INSERT }
        );
      } else {
        await sequelize.query(
          `INSERT INTO ${classSubjectTable} (class_id, subject_id)
           VALUES (:classId, :subjectId)
           ON CONFLICT (class_id, subject_id) DO NOTHING`,
          { replacements, type: QueryTypes.INSERT }
        );
      }

      total++;
    }
  }

  console.log(`   Seeded ${total} class-subject mappings`);
}

module.exports = seed;
