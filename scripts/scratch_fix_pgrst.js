const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');

async function run() {
  await client.connect();
  try {
    console.log("Granting access to church_departments and department_leaders...");
    await client.query(`GRANT ALL ON TABLE public.church_departments TO authenticated, service_role, anon;`);
    await client.query(`GRANT ALL ON TABLE public.department_leaders TO authenticated, service_role, anon;`);
    
    console.log("Reloading schema cache for PostgREST...");
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    
    console.log("Done!");
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await client.end();
  }
}
run().catch(console.error);
