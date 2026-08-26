const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');

async function run() {
  await client.connect();
  try {
    console.log("Creating auto_confirm_pastor RPC...");
    await client.query(`
      CREATE OR REPLACE FUNCTION auto_confirm_pastor(p_email TEXT)
      RETURNS BOOLEAN AS $$
      DECLARE
        v_user_id UUID;
      BEGIN
        -- Security definer allows us to update auth.users
        UPDATE auth.users 
        SET email_confirmed_at = now() 
        WHERE email = p_email 
        RETURNING id INTO v_user_id;
        
        IF v_user_id IS NOT NULL THEN
          RETURN TRUE;
        END IF;
        
        RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    console.log("Creating link_pastor_to_church RPC...");
    await client.query(`
      CREATE OR REPLACE FUNCTION link_pastor_to_church(p_email TEXT)
      RETURNS BOOLEAN AS $$
      DECLARE
        v_user_id UUID;
        v_church_id UUID;
      BEGIN
        -- Get the user ID
        SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
        
        IF v_user_id IS NULL THEN
          RETURN FALSE;
        END IF;

        -- Check if the email exists in any church as a leader
        SELECT id INTO v_church_id FROM public.churches WHERE leader_contact ILIKE '%' || p_email || '%' LIMIT 1;
        
        IF v_church_id IS NOT NULL THEN
          -- Update user_profiles to make them a church_admin for that church
          UPDATE public.user_profiles 
          SET role = 'church_admin', church_id = v_church_id 
          WHERE id = v_user_id;
          
          RETURN TRUE;
        END IF;
        
        RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    console.log("Both RPCs created successfully.");
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await client.end();
  }
}
run().catch(console.error);
