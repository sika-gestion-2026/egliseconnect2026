const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');
async function run() {
  await client.connect();
  
  // Try to update user_profiles as postgres admin (bypassing RLS)
  try {
    const res = await client.query(
      "UPDATE public.user_profiles SET church_id = '2641a5e2-89f1-4462-a81d-1b867aa016be', role = 'church_admin' WHERE email = 'aienr2025@gmail.com' RETURNING *"
    );
    console.log('UPDATE RESULT:', res.rows);
  } catch (err) {
    console.error('UPDATE ERROR:', err);
  }
  
  await client.end();
}
run().catch(console.error);
