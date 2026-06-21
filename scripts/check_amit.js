// Simulate the exact repository flow for parent_id=4 (Amit)
const path = require('path');
process.chdir(path.resolve(__dirname, '..'));
require('dotenv').config();

const { sequelize } = require('../src/config/database');
const { resolveTableName, getTableColumns } = require('../src/api/v1/repositories/helpers/schema.utils');

(async () => {
  // Step 1: Resolve table
  const tableName = await resolveTableName(['student_parents']);
  console.log('Resolved table:', tableName);

  const columns = await getTableColumns(tableName);
  console.log('Columns:', [...columns]);

  const parentCol = columns.has('parent_id') ? 'parent_id' : columns.has('pid') ? 'pid' : null;
  const studentCol = columns.has('student_id') ? 'student_id' : columns.has('sid') ? 'sid' : null;
  console.log('parentCol:', parentCol, 'studentCol:', studentCol);

  // Step 2: Run the exact query the repository uses
  const parentIds = [4];
  const links = await sequelize.query(
    `SELECT "${parentCol}" AS parent_id, "${studentCol}" AS student_id FROM "${tableName}" WHERE "${parentCol}" IN (:parentIds)`,
    { replacements: { parentIds }, type: sequelize.constructor.QueryTypes.SELECT }
  );
  console.log('\nLinks from query:', JSON.stringify(links));

  // Step 3: Extract student IDs
  const studentIds = [...new Set(links.map(l => Number(l.student_id)).filter(Boolean))];
  console.log('Student IDs:', studentIds);

  // Step 4: Load students via Sequelize model
  const { Student, Person } = require('../src/models');
  const students = await Student.findAll({
    where: { id: studentIds },
    include: [{ model: Person, as: 'person', attributes: ['first_name', 'middle_name', 'last_name'] }],
    attributes: ['id']
  });
  console.log('\nStudents found:', students.length);
  students.forEach(s => {
    const p = s.person || {};
    console.log(`  Student ${s.id}: ${[p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ')}`);
  });

  // Step 5: Build the map
  const studentNameMap = new Map(
    students.map(s => {
      const p = s.person || {};
      return [Number(s.id), [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ').trim() || `Student ${s.id}`];
    })
  );
  console.log('\nStudentNameMap:', Object.fromEntries(studentNameMap));

  const parentStudentNamesMap = new Map();
  links.forEach(link => {
    const pid = Number(link.parent_id);
    const name = studentNameMap.get(Number(link.student_id));
    if (!name) return;
    if (!parentStudentNamesMap.has(pid)) parentStudentNamesMap.set(pid, []);
    const names = parentStudentNamesMap.get(pid);
    if (!names.includes(name)) names.push(name);
  });

  console.log('\nFinal parentStudentNamesMap for parent 4:', parentStudentNamesMap.get(4));

  await sequelize.close();
})().catch(e => { console.error(e); process.exit(1); });
