const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');
async function run() {
  await client.connect();
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION get_member_secure(p_member_id UUID)
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        v_member RECORD;
      BEGIN
        SELECT * INTO v_member
        FROM public.members
        WHERE id = p_member_id
        LIMIT 1;

        IF v_member.id IS NOT NULL THEN
          RETURN row_to_json(v_member);
        ELSE
          RETURN NULL;
        END IF;
      END;
      $$;
    `);
    console.log('Function get_member_secure created successfully');
  } catch (err) {
    console.error('ERROR:', err);
  }
  await client.end();
}
run().catch(console.error);
