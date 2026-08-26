const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'church_departments' });
  if (error) {
    console.log("RPC failed, fetching directly from pg_policies");
    const { data: policies, error: err2 } = await supabase.from('pg_policies').select('*').eq('tablename', 'church_departments');
    console.log(policies || err2);
  } else {
    console.log(data);
  }
}
test();
