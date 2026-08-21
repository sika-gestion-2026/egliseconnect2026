const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');
async function run() {
  await client.connect();
  
  await client.query(`
    ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS logo_url TEXT;
    ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS vision TEXT;
    ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS commune TEXT;
    ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS quartier TEXT;
    
    ALTER TABLE public.members ADD COLUMN IF NOT EXISTS commune TEXT;
    ALTER TABLE public.members ADD COLUMN IF NOT EXISTS quartier TEXT;
  `);
  
  console.log('Success DB altered');
  await client.end();
}
run().catch(console.error);
