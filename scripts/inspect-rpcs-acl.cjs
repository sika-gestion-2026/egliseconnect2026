/**
 * État exact (ACL, recherche, colonne leader_contact) des 4 RPC historiques.
 * Usage : node scripts/inspect-rpcs-acl.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROJECT_REF = 'ufvyihctwithnvrhxeec';
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const ENV_FILE = path.join(ROOT, '.env.supabase.local');

const NAMES = ['auto_confirm_pastor', 'check_pastor_email_exists', 'link_pastor_to_church', 'update_member_profile_secure'];

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    env[m[1]] = m[2].trim();
  }
  return env;
}

const QUERY = `
SELECT p.proname,
       pg_get_function_arguments(p.oid) AS args,
       p.prosecdef AS security_definer,
       coalesce(array_to_string(p.proacl, ' | '), '(ACL par défaut)') AS acl,
       EXISTS(SELECT 1 FROM pg_proc q WHERE q.oid = p.oid AND position('search_path' in coalesce(array_to_string(q.proconfig, ','), '')) > 0) AS a_search_path_fige,
       EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name='churches' AND c.column_name='leader_contact') AS churches_leader_contact
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('${NAMES.join("','")}')
ORDER BY p.proname;
`;

async function main() {
  const env = loadEnv(ENV_FILE);
  const token = (env.SUPABASE_ACCESS_TOKEN || '').trim();
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`HTTP ${res.status}:`, text.slice(0, 800));
    process.exit(2);
  }
  for (const r of JSON.parse(text)) {
    console.log(`\n${r.proname}(${r.args})`);
    console.log(`  SECURITY DEFINER : ${r.security_definer}`);
    console.log(`  search_path figé : ${r.a_search_path_fige}`);
    console.log(`  ACL : ${r.acl}`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(3); });