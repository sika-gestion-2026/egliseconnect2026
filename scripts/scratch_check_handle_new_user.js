const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');
async function run() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT prosrc 
      FROM pg_proc 
      WHERE proname = 'handle_new_user';
    `);
    console.log(res.rows[0].prosrc);
  } catch (err) {
    console.error('ERROR:', err);
  }
  await client.end();
}
run().catch(console.error);
