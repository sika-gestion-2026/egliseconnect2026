const { Client } = require('pg');
const client = new Client('postgresql://postgres:77916407@@Mu@db.ufvyihctwithnvrhxeec.supabase.co:5432/postgres');

async function run() {
  await client.connect();
  
  await client.query(`
    -- Add columns for leader info
    ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS leader_name TEXT;
    ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS leader_contact TEXT;
    
    -- Ensure storage schema exists (Supabase should have it by default)
    -- Create bucket for logos if it doesn't exist
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('logos', 'logos', true) 
    ON CONFLICT (id) DO NOTHING;
    
    -- Drop existing policies if needed to recreate them without error
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
    
    -- Create policies for the bucket
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
    CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');
  `);
  
  console.log('Success DB and Storage updated');
  await client.end();
}
run().catch(console.error);
