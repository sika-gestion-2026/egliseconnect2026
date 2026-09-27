const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');

async function run() {
  await client.connect();
  try {
    console.log("Enabling RLS on church_departments...");
    await client.query(`ALTER TABLE public.church_departments ENABLE ROW LEVEL SECURITY;`);
    
    console.log("Enabling RLS on department_leaders...");
    await client.query(`ALTER TABLE public.department_leaders ENABLE ROW LEVEL SECURITY;`);

    console.log("Creating SELECT policies to avoid breaking the app frontend...");
    
    // Create read policies so the app can still fetch this data
    await client.query(`
      CREATE POLICY "Allow read access to all users" 
      ON public.church_departments FOR SELECT 
      USING (true);
    `);

    await client.query(`
      CREATE POLICY "Allow read access to all users" 
      ON public.department_leaders FOR SELECT 
      USING (true);
    `);

    console.log("RLS successfully enabled and configured!");
  } catch (err) {
    // Ignore policy already exists error
    if (err.code === '42710') {
        console.log("Policy already exists, ignoring...");
    } else {
        console.error('ERROR:', err);
    }
  } finally {
    await client.end();
  }
}

run().catch(console.error);
