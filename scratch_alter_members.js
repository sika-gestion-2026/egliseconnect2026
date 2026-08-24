const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');
async function run() {
  await client.connect();
  
  await client.query(`
    ALTER TABLE public.members 
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS marital_status TEXT,
    ADD COLUMN IF NOT EXISTS baptized BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS baptism_church TEXT,
    ADD COLUMN IF NOT EXISTS gender TEXT,
    ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
    ADD COLUMN IF NOT EXISTS children_count INTEGER DEFAULT 0;
  `);
  
  console.log('ALTER TABLE SUCCESSFUL');
  await client.end();
}
run().catch(console.error);
