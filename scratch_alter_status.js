const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');
async function run() {
  await client.connect();
  
  // Find check constraint name
  const res = await client.query("SELECT conname FROM pg_constraint WHERE conrelid = 'public.members'::regclass AND contype = 'c'");
  console.log('CONSTRAINTS:', res.rows);
  
  // Drop the status constraint (typically members_status_check)
  for (const row of res.rows) {
    if (row.conname.includes('status')) {
      await client.query(`ALTER TABLE public.members DROP CONSTRAINT "${row.conname}"`);
      console.log(`Dropped constraint: ${row.conname}`);
    }
  }
  
  // Add new constraint supporting: membre_actif, visiteur_simple, visiteur_occasionnel
  await client.query(`
    ALTER TABLE public.members 
    ADD CONSTRAINT members_status_check 
    CHECK (status IN ('membre_actif', 'visiteur_simple', 'visiteur_occasionnel'));
  `);
  
  console.log('Constraint updated successfully');
  await client.end();
}
run().catch(console.error);
