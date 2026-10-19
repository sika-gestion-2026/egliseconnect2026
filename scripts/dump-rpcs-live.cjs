/**
 * Récupère la définition SQL des fonctions liste (4 RPC non versionnées)
 * directement sur la base live via l'API Management.
 * Usage : node scripts/dump-rpcs-live.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROJECT_REF = 'ufvyihctwithnvrhxeec';
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const ENV_FILE = path.join(ROOT, '.env.supabase.local');

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

const NAMES = [
  'auto_confirm_pastor',
  'check_pastor_email_exists',
  'link_pastor_to_church',
  'update_member_profile_secure',
];

const QUERY = `
SELECT p.proname,
       pg_get_functiondef(p.oid) AS def,
       l.rolname AS owner
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_authid l ON l.oid = p.proowner
WHERE n.nspname = 'public'
  AND p.proname IN ('${NAMES.join("','")}')
ORDER BY p.proname;
`;

async function main() {
  const env = loadEnv(ENV_FILE);
  const token = (env.SUPABASE_ACCESS_TOKEN || '').trim();
  if (!token) {
    console.error('❌ SUPABASE_ACCESS_TOKEN absent de .env.supabase.local.');
    process.exit(1);
  }
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`❌ HTTP ${res.status} :`, text.slice(0, 1000));
    process.exit(2);
  }
  const rows = JSON.parse(text);
  console.log(`${rows.length} fonction(s) trouvée(s) sur la base live :\n`);
  for (const r of rows) {
    console.log(`══════════════ ${r.proname} (owner : ${r.owner}) ═══════════════`);
    console.log(r.def);
    console.log('\n');
  }
}

main().catch((e) => {
  console.error('Erreur technique :', e && e.message ? e.message : e);
  process.exit(3);
});