/**
 * Introspection du schéma réel via l'API PostgREST.
 *
 * POURQUOI CE SCRIPT EXISTE
 * -------------------------
 * Ni `psql`, ni la CLI Supabase, ni Docker ne sont disponibles sur cette
 * machine : impossible de lancer `pg_dump --schema-only`. Mais le client
 * `@supabase/supabase-js` et la clé `service_role` sont présents, et PostgREST
 * expose la description complète de la base sur `/rest/v1/`, au format OpenAPI.
 *
 * C'est ce qui manquait pour trancher sans deviner : savoir quelles colonnes
 * EXISTENT réellement en production, plutôt que de déduire l'état de la base
 * depuis le code — une déduction qui produit des faux positifs et des faux
 * négatifs.
 *
 * CE QUE LE SCRIPT NE FAIT PAS
 * ---------------------------
 * Il ne lit ni les données, ni les définitions de fonctions, ni les politiques
 * RLS, ni les index. Il ne modifie rien : uniquement des requêtes GET en lecture.
 * Un `pg_dump --schema-only` reste nécessaire pour versionner les fonctions.
 *
 * Usage : node scripts/inspect-schema.cjs [--json]
 */
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env.local');

/** Lit .env.local sans dépendance externe et sans jamais afficher de valeur. */
function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;

  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

async function main() {
  const env = loadEnv(ENV_PATH);

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error(
      'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absente de .env.local'
    );
    process.exit(1);
  }

  // La clé n'apparaît jamais dans la sortie : ni en cas de succès, ni en cas
  // d'erreur (le message HTTP de PostgREST ne la contient pas, mais on ne prend
  // pas le risque de la propager).
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/openapi+json',
    },
  });

  if (!res.ok) {
    const body = (await res.text()).slice(0, 400);
    console.error(`Échec ${res.status} : ${body}`);
    process.exit(1);
  }

  const spec = await res.json();
  const definitions = spec.definitions ?? {};

  // `definitions` décrit aussi les agrégats PostgREST et les types composites.
  // On ne retient que les objets ayant des propriétés, ce qui correspond aux
  // tables et vues exposées.
  const tables = Object.entries(definitions)
    .filter(([, def]) => def && typeof def === 'object' && def.properties)
    .map(([name, def]) => ({
      table: name,
      columns: Object.keys(def.properties).sort(),
    }))
    .sort((a, b) => a.table.localeCompare(b.table));

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ url, tables }, null, 2));
    return;
  }

  console.log(`Base introspectée : ${url}`);
  console.log(`${tables.length} tables/vues exposées.\n`);

  for (const t of tables) {
    console.log(`${t.table}  (${t.columns.length})`);
    console.log(`  ${t.columns.join(', ')}\n`);
  }

  // Écriture du JSON sur disque : utile comme référence lors des prochaines
  // étapes, et pour comparer après l'exécution des migrations.
  const outPath = path.join(__dirname, '..', 'supabase', 'schema-inspecte.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify({ url, tables, generatedAt: new Date().toISOString() }, null, 2),
    'utf8'
  );
  console.log(`→ ${path.relative(path.join(__dirname, '..'), outPath)}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
