const { Client } = require('pg');
const fs = require('fs');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');

async function run() {
  await client.connect();
  try {
    console.log("Running migration...");
    const sql = fs.readFileSync('supabase/migrations/20260824200000_departments.sql', 'utf8');
    await client.query(sql);
    
    console.log("Granting access...");
    await client.query('GRANT ALL ON TABLE public.church_departments TO authenticated, service_role, anon;');
    await client.query('GRANT ALL ON TABLE public.department_leaders TO authenticated, service_role, anon;');
    
    console.log("Reloading schema cache...");
    await client.query("NOTIFY pgrst, 'reload schema';");
    
    console.log("Done!");
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await client.end();
  }
}
run().catch(console.error);
