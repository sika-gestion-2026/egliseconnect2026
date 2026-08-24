const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');
async function run() {
  await client.connect();
  await client.query("INSERT INTO storage.buckets (id, name, public) VALUES ('member-photos', 'member-photos', true) ON CONFLICT (id) DO NOTHING");
  console.log('BUCKET CREATED');
  await client.end();
}
run().catch(console.error);
