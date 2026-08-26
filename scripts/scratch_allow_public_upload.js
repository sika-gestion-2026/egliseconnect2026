const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');
async function run() {
  await client.connect();
  try {
    await client.query(`
      CREATE POLICY "Public Upload" 
      ON storage.objects FOR INSERT 
      TO public 
      WITH CHECK (bucket_id = 'logos');
    `);
    console.log('Public Upload policy created successfully');
  } catch (err) {
    if (err.code === '42710') { // duplicate_object
      console.log('Policy already exists.');
    } else {
      console.error('ERROR:', err);
    }
  }
  await client.end();
}
run().catch(console.error);
