/**
 * Liste les fonctions RPC réellement exposées par PostgREST en production.
 *
 * POURQUOI
 * --------
 * Quatre fonctions utilisées par le code n'étaient pas versionnées
 * (`auto_confirm_pastor`, `check_pastor_email_exists`,
 * `link_pastor_to_church`, `update_member_profile_secure`). Sans `psql` ni la
 * CLI Supabase, impossible de lire leur corps SQL pour les migrer fidèlement.
 *
 * Mais PostgREST publie la liste des fonctions qu'il expose sur `/rest/v1/`.
 * Cela ne donne pas le SQL, mais cela donne deux informations décisives :
 *
 *   1. quelles fonctions existent VRAIMENT (donc lesquelles sont dead code) ;
 *   2. leur signature — le nom des paramètres — ce qui suffit pour本案控告
 *      d'ordre d'appel et pour repérer un décalage d'API.
 *
 * Un écart entre le code et cette liste est un bug d'intégration avéré.
 *
 * Portée : lecture seule, aucune donnée de membre exposée.
 * Usage : node scripts/inspect-rpcs.cjs
 */
const fs = require('fs');
const path = require('path');

function loadEnv(file) {
  const env = {};
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

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.next', '.git', 'scripts', 'public']);

/** Récupère tous les appels `.rpc('nom'` présents dans le code. */
function rpcCallsInCode() {
  const found = new Map();
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(e.name)) {
        const src = fs.readFileSync(full, 'utf8');
        const rel = path.relative(ROOT, full).replace(/\\/g, '/');
        const re = /\.rpc\(\s*['"`]([a-z_][a-z0-9_]*)['"`]/gi;
        let m;
        while ((m = re.exec(src))) {
          const name = m[1];
          if (!found.has(name)) found.set(name, []);
          const line = src.slice(0, m.index).split('\n').length;
          if (found.get(name).length < 3) found.get(name).push(`${rel}:${line}`);
        }
      }
    }
  };
  walk(ROOT);
  return found;
}

async function main() {
  const env = loadEnv(path.join(ROOT, '.env.local'));
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Variables Supabase absentes de .env.local');
    process.exit(1);
  }

  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/openapi+json',
    },
  });
  if (!res.ok) {
    console.error(`Échec ${res.status} : ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  }

  const spec = await res.json();

  // Signature = paramètres acceptés, lus dans la spec de chaque chemin.
  const live = new Map();
  for (const [p, methods] of Object.entries(spec.paths ?? {})) {
    if (!p.startsWith('/rpc/')) continue;
    const name = p.slice(5);
    const post = methods?.post ?? methods?.get;
    const params = [];
    for (const param of post?.parameters ?? []) {
      if (param?.name) params.push(param.name);
    }
    live.set(name, params);
  }

  const code = rpcCallsInCode();

  console.log(`Base : ${url}`);
  console.log(`${live.size} RPC exposées · ${code.size} RPC appelées par le code.\n`);

  const called = [...live.keys()].filter((n) => code.has(n)).sort();
  const uncalled = [...live.keys()].filter((n) => !code.has(n)).sort();
  const missing = [...code.keys()].filter((n) => !live.has(n)).sort();

  console.log('── Appelées par le code, présentes en base ──');
  for (const n of called) {
    const params = live.get(n);
    console.log(
      `  ✓ ${n}(${params.join(', ')})  — ${code.get(n).length} site(s) : ${code.get(n)[0]}`
    );
  }

  if (missing.length) {
    console.log('\n── 🔴 AppELées par le code mais ABSENTES de la base ──');
    for (const n of missing) {
      console.log(`  ✗ ${n}  — ${code.get(n).join(', ')}`);
    }
    console.log(
      '\n   PostgREST renvoie 404 sur ces appels. Toutes les migrations qui les\n' +
        '   créent doivent être appliquées avant que ces écrans fonctionnent.'
    );
  }

  if (uncalled.length) {
    console.log('\n── Exposées mais jamais appelées (migrations à nettoyer) ──');
    for (const n of uncalled) console.log(`  · ${n}(${live.get(n).join(', ')})`);
  }

  // Comparaison des paramètres.
  //
  // ATTENTION : PostgREST ne publie JAMAIS les noms réels des paramètres d'une
  // RPC dans cette spécification. Toutes les fonctions y apparaissent avec un
  // unique paramètre `args` de type JSON, y compris celles dont le code appelle
  // les paramètres par leur nom (`{ p_email: ... }`). Confronter le code à la
  // liste des paramètres produit donc un faux positif systématique — c'est
  // exactement ce qu'un premier passage de ce script a signalé sur les 7
  // fonctions appelées.
  //
  // Seul reste vérifiable : la présence de la fonction, et l'existence d'au
  // moins un nom de paramètre utilisé par le code.
  console.log('\n── Vérification des arguments nommés ──');
  let argless = 0;
  for (const n of called) {
    for (const site of readCallSites(n)) {
      const named = [...site.text.matchAll(/([a-z_][a-z0-9_]*)\s*:/g)].map(
        (m) => m[1]
      );
      if (!named.length) {
        console.log(
          `  ⚠️  ${n} appelé sans argument nommé (${site.file}:${site.line})`
        );
        argless++;
      }
    }
  }
  if (!argless) {
    console.log(
      '  ✓ Tous les appels passent des arguments nommés.\n' +
        '    (La spec ne publie pas les noms de paramètres : un décalage ne peut\n' +
        '     être détecté que par un test réel de la fonction.)'
    );
  }
}

function readCallSites(name) {
  const sites = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(e.name)) {
        const text = fs.readFileSync(full, 'utf8');
        const rel = path.relative(ROOT, full).replace(/\\/g, '/');
        const re = new RegExp(
          `\\.rpc\\(\\s*['"\`]${name}['"\`][\\s\\S]{0,200}?\\)`,
          'g'
        );
        let m;
        while ((m = re.exec(text))) {
          sites.push({
            text: m[0],
            file: rel,
            line: text.slice(0, m.index).split('\n').length,
          });
        }
      }
    }
  };
  walk(ROOT);
  return sites;
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});