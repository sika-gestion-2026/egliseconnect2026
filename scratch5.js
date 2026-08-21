const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');

async function run() {
  await client.connect();
  
  await client.query(`
    ALTER TABLE public.members ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE public.members ADD COLUMN IF NOT EXISTS visit_planned BOOLEAN DEFAULT false;
  `);
  
  console.log('Success DB altered for pastoral tools');
  await client.end();
}
run().catch(console.error);
