const connection = require('../config');

const tables = ['admin','student','parent','teacher'];

function show(table){
  return new Promise((resolve,reject)=>{
    connection.query(`SHOW COLUMNS FROM \`${table}\``, (err, rows)=>{
      if (err) return reject(err);
      resolve(rows);
    });
  });
}
(async ()=>{
  try{
    for(const t of tables){
      const cols = await show(t);
      console.log(`\n== ${t} ==`);
      cols.forEach(c=>{
        console.log(`${c.Field}\t${c.Type}\tNULL:${c.Null}\tDEFAULT:${c.Default}`);
      });
    }
    process.exit(0);
  }catch(e){
    console.error('Schema inspect failed:', e.message);
    process.exit(1);
  }
})();
