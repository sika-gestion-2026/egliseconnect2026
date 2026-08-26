const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');
async function run() {
  await client.connect();
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION authenticate_member(p_church_code TEXT, p_identifier TEXT)
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        v_church_id UUID;
        v_church_logo TEXT;
        v_member RECORD;
        v_clean_identifier TEXT;
        v_phone_identifier TEXT;
      BEGIN
        -- Find church
        SELECT id, logo_url INTO v_church_id, v_church_logo 
        FROM public.churches 
        WHERE code ILIKE p_church_code;

        IF v_church_id IS NULL THEN
          RETURN json_build_object('error', 'Code d''église invalide.');
        END IF;

        -- Clean identifier
        v_clean_identifier := lower(trim(p_identifier));
        v_phone_identifier := replace(v_clean_identifier, ' ', '');
        
        -- Find member
        SELECT id, first_name, last_name, photo_url INTO v_member
        FROM public.members
        WHERE church_id = v_church_id
        AND (
          lower(trim(email)) = v_clean_identifier
          OR lower(replace(phone, ' ', '')) = v_phone_identifier
        )
        LIMIT 1;

        IF v_member.id IS NOT NULL THEN
          RETURN json_build_object(
            'success', true,
            'member_id', v_member.id,
            'church_id', v_church_id,
            'profile', json_build_object(
              'first_name', COALESCE(v_member.first_name, ''),
              'last_name', COALESCE(v_member.last_name, ''),
              'photo_url', COALESCE(v_member.photo_url, ''),
              'church_logo', COALESCE(v_church_logo, '')
            )
          );
        ELSE
          RETURN json_build_object('error', 'Aucun membre trouvé avec cet identifiant (téléphone ou email) dans cette église.');
        END IF;
      END;
      $$;
    `);
    console.log('Function authenticate_member created successfully');
  } catch (err) {
    console.error('ERROR:', err);
  }
  await client.end();
}
run().catch(console.error);
