const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');
async function run() {
  await client.connect();
  
  await client.query(`
    UPDATE auth.users 
    SET encrypted_password = crypt('77916407@Mu', gen_salt('bf'))
    WHERE email IN ('munokolive@gmail.com', 'fantome@egliseconnect.com');
  `);
  
  console.log('Success Password updated');
  await client.end();
}
run().catch(console.error);
