const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');
async function run() {
  await client.connect();
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION update_member_profile_secure(
        p_member_id UUID,
        p_church_id UUID,
        p_first_name TEXT,
        p_last_name TEXT,
        p_phone TEXT,
        p_email TEXT,
        p_birth_date DATE,
        p_commune TEXT,
        p_quartier TEXT,
        p_profession TEXT,
        p_photo_url TEXT
      )
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        v_updated_id UUID;
      BEGIN
        -- Update the member record safely by ensuring church_id matches
        UPDATE public.members
        SET 
          first_name = p_first_name,
          last_name = p_last_name,
          phone = p_phone,
          email = p_email,
          birth_date = p_birth_date,
          commune = p_commune,
          quartier = p_quartier,
          profession = p_profession,
          photo_url = p_photo_url
        WHERE id = p_member_id 
        AND church_id = p_church_id
        RETURNING id INTO v_updated_id;

        IF v_updated_id IS NOT NULL THEN
          RETURN json_build_object('success', true);
        ELSE
          RETURN json_build_object('error', 'Erreur de mise à jour ou membre introuvable.');
        END IF;
      END;
      $$;
    `);
    console.log('Function update_member_profile_secure created successfully');
  } catch (err) {
    console.error('ERROR:', err);
  }
  await client.end();
}
run().catch(console.error);
