/**
 * Test du garde-fou auto_confirm_pastor : sur un email qui n'est contact
 * d'aucune église, la fonction doit renvoyer false sans rien modifier.
 * Usage : node scripts/test-auto-confirm-guard.cjs
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

const QUERY = `
SELECT
  public.check_pastor_email_exists('jamais-un-contact-xyz@example.invalid') AS check_bidon,
  public.auto_confirm_pastor('jamais-un-contact-xyz@example.invalid')       AS confirm_bidon;
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
  const row = JSON.parse(text)[0];
  console.log('Email bidon (jamais contact d\'église) :');
  console.log(`  check_pastor_email_exists = ${row.check_bidon}  (attendu : false)`);
  console.log(`  auto_confirm_pastor       = ${row.confirm_bidon}  (attendu : false)`);
  const ok = row.check_bidon === false && row.confirm_bidon === false;
  console.log(ok ? '\n✅ Garde-fou actif.' : '\n❌ Comportement inattendu.');
  process.exitCode = ok ? 0 : 1;
}

main().catch((e) => { console.error(e.message); process.exit(3); });