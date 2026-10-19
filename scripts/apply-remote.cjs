/**
 * Applique supabase/APPLY-PENDING.sql sur le projet live via l'API Management
 * de Supabase (POST /v1/projects/{ref}/database/query) — la même voie que
 * l'éditeur SQL.
 *
 * PRÉREQUIS
 * ---------
 *  1. Générer un Access Token Supabase (Dashboard → Account → Access Tokens)
 *     : il commence par « sbp_ » et n'est affiché qu'une seule fois.
 *  2. L'enregistrer dans .env.supabase.local (gitignoré) :
 *        SUPABASE_ACCESS_TOKEN=<votre-token-qui-commence-par-sbp_>
 *
 * USAGE
 * -----
 *  node scripts/apply-remote.cjs            # applique le bundle
 *  node scripts/apply-remote.cjs <fichier>  # applique un autre fichier SQL
 *
 * Le token n'est jamais affiché ; seuls son statut (présent/absent) et la
 * longueur de la signature sont imprimés.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROJECT_REF = 'ufvyihctwithnvrhxeec'; // projet live
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const ENV_FILE = path.join(ROOT, '.env.supabase.local');

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

async function main() {
  const sqlFile = process.argv[2] || path.join(ROOT, 'supabase', 'APPLY-PENDING.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  const env = loadEnv(ENV_FILE);
  const token = (env.SUPABASE_ACCESS_TOKEN || '').trim();

  if (!token) {
    console.error(
      '\n❌ SUPABASE_ACCESS_TOKEN absent de .env.supabase.local.\n' +
        '   1. Dashboard Supabase → Avatar (en bas à gauche) → Account → Access Tokens.\n' +
        '   2. Generate new token (nom : "Auto-apply migrations"), copier la valeur (sbp_…).\n' +
        '   3. Ajouter dans .env.supabase.local : SUPABASE_ACCESS_TOKEN=sbp_…\n'
    );
    process.exit(1);
  }

  console.log(`Token : présent (${token.length} caractères, masqué).`);
  console.log(`Fichier : ${path.basename(sqlFile)} — ${sql.length} caractères.`);
  console.log(`Cible : projet ${PROJECT_REF}, POST ${API}\n`);

  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (res.ok) {
    console.log('✅ SQL exécuté sans erreur HTTP.');
    if (json && Array.isArray(json.rows)) {
      console.log(`Lignes retournées : ${json.rows.length}`);
    }
  } else {
    console.log(`❌ HTTP ${res.status}.`);
    if (json) {
      const msg =
        json.message ||
        json.error ||
        json.details ||
        json.hint ||
        (json.error_description ? json.error_description : '(aucun détail)');
      console.log('Message :', msg);
      if (json.hint) console.log('Hint :', json.hint);
      console.log('\nJSON brut :', JSON.stringify(json).slice(0, 2000));
    } else {
      console.log('Réponse non-JSON :', text.slice(0, 2000));
    }
    process.exit(2);
  }
}

main().catch((e) => {
  console.error('Erreur technique :', e && e.message ? e.message : e);
  process.exit(3);
});