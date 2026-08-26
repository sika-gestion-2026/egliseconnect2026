const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');
async function run() {
  await client.connect();
  
  await client.query(`
    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
        'b487e3f8-6623-455b-8d77-628d087bba5b', 'b487e3f8-6623-455b-8d77-628d087bba5b', '{"sub":"b487e3f8-6623-455b-8d77-628d087bba5b","email":"fantome@egliseconnect.com"}', 'email', 'b487e3f8-6623-455b-8d77-628d087bba5b', NOW(), NOW(), NOW()
    );
  `);
  
  await client.query(`
    UPDATE public.user_profiles SET role = 'super_admin' WHERE email = 'fantome@egliseconnect.com';
  `);
  console.log('Success');
  await client.end();
}
run().catch(console.error);
