const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');
async function run() {
  await client.connect();
  const res = await client.query("SELECT * FROM public.user_profiles WHERE email = 'aienr2025@gmail.com'");
  console.log('USER PROFILE:', res.rows);
  
  const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'members'");
  console.log('MEMBERS COLUMNS:', cols.rows);
  
  await client.end();
}
run().catch(console.error);
