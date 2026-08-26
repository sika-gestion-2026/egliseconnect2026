const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');
async function run() {
  await client.connect();
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION check_pastor_email_exists(p_email TEXT)
      RETURNS BOOLEAN AS $$
      DECLARE
        v_exists BOOLEAN;
      BEGIN
        SELECT EXISTS (
          SELECT 1 
          FROM public.churches 
          WHERE leader_contact ILIKE '%' || p_email || '%'
        ) INTO v_exists;
        RETURN v_exists;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log("RPC check_pastor_email_exists created successfully.");
  } catch (err) {
    console.error('ERROR:', err);
  }
  await client.end();
}
run().catch(console.error);
