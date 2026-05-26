require('dotenv').config();
const { Student } = require('../src/models');
(async () => {
  const s = Student.sequelize;
  const [r] = await s.query("SELECT column_name FROM information_schema.columns WHERE table_name='students' ORDER BY ordinal_position");
  console.log('Students columns:', r.map(x => x.column_name).join(', '));
  process.exit(0);
})();
