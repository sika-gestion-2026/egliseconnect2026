/**
 * Vérifie que les objets essentiels du bundle (APPLY-PENDING.sql) existent
 * bien sur le projet live, via l'API Management.
 * Usage : node scripts/verify-db-objects.cjs
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
SELECT jsonb_build_object(
  'contrainte_members_status', EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'members_status_check'),
  'vue_church_stats', to_regclass('public.church_stats') IS NOT NULL,
  'vue_church_finance_balance', to_regclass('public.church_finance_balance') IS NOT NULL,
  'fn_authenticate_member', EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'authenticate_member'),
  'fn_get_user_role', EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_user_role'),
  'fn_get_user_church_id', EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_user_church_id'),
  'policies_pointage', (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('attendances', 'attendance_members')),
  'policy_lecture_droite_profil', EXISTS(SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Authenticated users can read their own profile'),
  'uniq_service_declarations', EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'service_declarations_service_member_uniq'),
  'uniq_attendance_church_date', EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_attendances_church_date_unique'),
  'owner_munokolive_super_admin', (SELECT role FROM public.user_profiles WHERE email = 'munokolive@gmail.com'),
  'membres_statut_inconnu', (SELECT count(*) FROM public.members WHERE status IS NULL OR status NOT IN ('membre_actif','visiteur_simple','visiteur_occasionnel','active','member','visitor','inactive')),
  'table_kids', to_regclass('public.kids') IS NOT NULL,
  'table_kids_checkins', to_regclass('public.kids_checkins') IS NOT NULL,
  'table_prayer_requests', to_regclass('public.prayer_requests') IS NOT NULL,
  'table_sms_campaigns', to_regclass('public.sms_campaigns') IS NOT NULL,
  'table_member_login_attempts', to_regclass('public.member_login_attempts') IS NOT NULL,
  'table_pastoral_visits', to_regclass('public.pastoral_visits') IS NOT NULL,
  'table_church_announcements', to_regclass('public.church_announcements') IS NOT NULL
);
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
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  // La réponse est généralement [ { ... } ] ; on prend le premier objet.
  const row = Array.isArray(json) ? json[0] : json;
  console.log(`\nRapport objet-live (HTTP ${res.status}) :\n`);
  if (row && typeof row === 'object') {
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'boolean') {
        console.log(`${v ? '✅' : '❌'} ${k}${v ? '' : '  <-- MANQUANT'}`);
      } else {
        console.log(`ℹ️  ${k} = ${JSON.stringify(v)}`);
      }
    }
  } else {
    console.log(text.slice(0, 2000));
  }
}

main().catch((e) => {
  console.error('Erreur technique :', e && e.message ? e.message : e);
  process.exit(3);
});