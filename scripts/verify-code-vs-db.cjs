/**
 * Confronte les colonnes utilisées par le code aux colonnes réellement
 * existantes en production.
 *
 * CONTEXTE
 * ---------
 * `check-schema-drift.cjs` compare le code aux MIGRATIONS. Ce script compare le
 * code à la BASE VIVANTE, via la spécification OpenAPI exposée par PostgREST.
 * La différence est capitale : la base a été modifiée à la main pendant le
 * développement, donc les migrations ne décrivent pas l'état réel. Un écart
 * détecté ici est un bug d'exécution, pas une approximation.
 *
 * Portée et limites
 * -----------------
 * Les listes de colonnes extraites du code sont brutes : elles incluent les noms
 * issus de sélélections imbriquées (`parent:members(...)`), qui sont des clés
 * d'alias et non des colonnes. Chaque écart est donc à relire — c'est une liste
 * de relecture, pas un verdict. Le script affiche la colonne et le contexte.
 *
 * Ce que le script ne fait pas : lire les DONNÉES des membres (vie privée). Il
 * se limite à la structure, plus un contrôle ponctuel et non nominatif de
 * cohérence sur `members.first_name` / `last_name`.
 *
 * Usage : node scripts/verify-code-vs-db.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'scripts', 'public']);

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

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

/**
 * Relève ce que les MIGRATIONS créent, sans les exécuter.
 *
 * Sert uniquement à classer un écart : l'objet manquant est-il prévu par une
 * migration (donc simple à appliquer), ou n'existe-t-il nulle part (donc
 * décision à prendre) ? On ne cherche pas à savoir si la migration a été
 * APPLIQUÉE — la base le dit déjà, par son absence.
 *
 * Les motifs couvrent `CREATE TABLE`, `ALTER TABLE … ADD COLUMN` et
 * `ADD COLUMN IF NOT EXISTS`. Les colonnes ajoutées par une fonction PL/pgSQL
 * (`EXECUTE format('ALTER TABLE … ADD COLUMN …')`) sont hors de portée : c'est
 * une limite assumée, signalée plus bas par l'absence d'origine.
 */
function scanMigrations() {
  const dir = path.join(ROOT, 'supabase', 'migrations');
  const tables = new Map(); // table -> fichier
  const columns = new Map(); // `${table}.${column}` -> fichier

  if (!fs.existsSync(dir)) return { tables, columns };

  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(dir, name), 'utf8');

    let m;
    const tableRe =
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi;
    while ((m = tableRe.exec(sql))) {
      if (!tables.has(m[1])) tables.set(m[1], name);
    }

    // `ALTER TABLE public.x ADD COLUMN y` et `ALTER TABLE x ADD y` (ADD seul
    // n'est pas valide pour une colonne, ADD COLUMN est la forme usuelle).
    const colRe =
      /ALTER\s+TABLE\s+(?:ONLY\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s+(?:ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?|ADD\s+(?:IF\s+NOT\s+EXISTS\s+)?)([a-z_][a-z0-9_]*)/gi;
    while ((m = colRe.exec(sql))) {
      const key = `${m[1].toLowerCase()}.${m[2].toLowerCase()}`;
      if (!columns.has(key)) columns.set(key, name);
    }
  }

  return { tables, columns };
}

/**
 * Extrait les colonnes réellement sélectionnées.
 *
 * On ne retient que ce qui suit un point dans une chaîne de sélection
 * PostgREST (`table.select('a, b(c)')`). Les alias de jointure
 * (`parent:members(...)`) sont ignorés, et la colonne d'alias (`name` dans
 * `nom:name`) est retenue — c'est bien une colonne de la table liée.
 */
const SELECT_RE =
  /\.from\(\s*['"]([a-z_]+)['"]\s*\)[\s\S]{0,80}?\.select\(\s*['"`]([^'"`]*)['"`]/g;

/**
 * Tables référencées, détectées par `.from('table')` ET par les relations
 * imbriquées des sélections (`children:kids_checkins(...)`).
 *
 * Pourquoi une détection séparée de celle des colonnes : une table dont TOUTES
 * les colonnes sont sélectionnées via une jointure imbriquée ne produit aucune
 * entrée dans l'index des colonnes. En déduisant les tables de cet index, ces
 * tables disparaissaient du rapport — un faux négatif, précisément la classe de
 * bug qu'on cherche à détecter. `kids` et `kids_checkins`, utilisés uniquement
 * par jointure, étaient ainsi invisible.
 */
const FROM_RE = /\.from\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*\)/g;

/**
 * Clés envoyées en INSERT / UPDATE.
 *
 * Complément indispensable à l'analyse des `select()`. Les deux reposent sur un
 * même piège : PostgREST rejette la requête ENTIÈRE dès qu'un nom de champ
 * est inconnu. Une colonne lue absente casse la page ; une colonne ÉCRITE
 * absente casse l'enregistrement — silencieusement, puisque le code se contente
 * de renvoyer `{ error }`.
 *
 * `member_notes` en est l'exemple : le code insère `title` et `verses`, deux
 * colonnes absentes du schéma, et la sauvegarde échouait à chaque fois sans
 * laisser de trace. Une vérification limitée aux `select()` ne l'aurait jamais
 * vu.
 *
 * On repère `.insert({…})`, `.update({…})`, `.upsert({…})` et les formes
 * `{ … }` sur plusieurs lignes, puis on n'en retient que les clés simples.
 */
const WRITE_RE =
  /\.(?:insert|upsert|update)\s*\(\s*\{([\s\S]{0,600}?)\}\s*\)/g;

function extractWriteKeys(files) {
  const keys = new Map(); // `${table}.${key}` -> [ {file, line} ]

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');

    // On remonte jusqu'au `.from('table')` qui précède l'écriture, en
    // traversant les appels intermédiaires (`.eq()`, `.select()`).
    let m;
    WRITE_RE.lastIndex = 0;
    while ((m = WRITE_RE.exec(src))) {
      const before = src.slice(Math.max(0, m.index - 500), m.index);
      const fromMatches = [...before.matchAll(FROM_RE)];
      const table = fromMatches.length
        ? fromMatches[fromMatches.length - 1][1]
        : null;
      if (!table) continue;

      const body = m[1];
      const line = src.slice(0, m.index).split('\n').length;

      // On ignore les valeurs imbriquées pour ne remonter que les clés de
      // premier niveau : un `{ … }` interne ouvre un second niveau.
      let depth = 0;
      let segment = '';
      const topLevel = [];
      for (const ch of body) {
        if (ch === '{' || ch === '[') depth++;
        else if (ch === '}' || ch === ']') depth--;

        if (ch === ',' && depth === 0) {
          topLevel.push(segment);
          segment = '';
        } else segment += ch;
      }
      topLevel.push(segment);

      for (const part of topLevel) {
        // Deux formes à retenir :
        //   - `title: value`  → clé explicite
        //   - `title`         → raccourci ES6, qui reste une clé
        // Le cas du raccourci n'est pas cosmétique : `saveNoteAction` insère
        // `{ member_id, church_id, title, content, verses }`, et ignorer le
        // raccourci faisait passer inaperçues deux colonnes inexistantes.
        const explicit = /^\s*([a-z_][a-z0-9_]*)\s*:/.exec(part);
        const shorthand = /^\s*([a-z_][a-z0-9_]*)\s*(?:,|$)/.exec(part);
        const key2 = explicit ? explicit[1] : shorthand ? shorthand[1] : null;
        if (!key2) continue;

        const key = `${table}.${key2}`;
        if (!keys.has(key)) keys.set(key, []);
        if (keys.get(key).length < 3) keys.get(key).push({ file: rel, line });
      }
    }
  }

  return keys;
}

/**
 * Relation PostgREST désignée par un fragment de sélection imbriqué.
 *
 * La syntaxe est `alias:relation(...)` : `children:kids_checkins(first_name)`
 * embarque la relation `kids_checkins` sous le nom `children`. C'est donc le
 * nom APRÈS `:` qui identifie la cible, et non l'alias — l'inverse remontait
 * `kid` ou `parent` comme si c'étaient des tables.
 *
 * Deux cas particuliers restent à signaler tels quels :
 *   - `auth_users:user_id(email)` : `user_id` n'est pas une relation. C'est une
 *     jointure cassée dans le code, et le rapport doit donc la montrer ;
 *   - `members!member_id(...)` : le `!` impose une jointure interne, le nom
 *     reste celui de la relation.
 */
function embedTable(item) {
  const head = item.slice(0, item.indexOf('('));
  const relation = head.includes(':') ? head.split(':').pop() : head;
  const clean = relation.replace(/!.*$/, '').trim();
  return /^[a-z_][a-z0-9_]*$/.test(clean) ? clean : null;
}

function extractReferencedTables(files) {
  const tables = new Map(); // table -> [ {file, line} ]

  const record = (table, file, line) => {
    if (!tables.has(table)) tables.set(table, []);
    if (tables.get(table).length < 3) tables.get(table).push({ file, line });
  };

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');

    // `supabase.storage.from('logos')` désigne un BUCKET, pas une table.
    //
    // Le filtre porte sur la SOURCE et non sur un motif : le chaînage
    // `.storage\n  .from('logos')` est fréquent, et un `(?<!storage)` placé sur
    // le `.` ne le voyait pas puisque le retour à la ligne s'intercale.
    let m;
    FROM_RE.lastIndex = 0;
    while ((m = FROM_RE.exec(src))) {
      const before = src.slice(Math.max(0, m.index - 80), m.index);
      if (/storage\s*$/i.test(before)) continue;
      record(m[1], rel, src.slice(0, m.index).split('\n').length);
    }

    // Relations imbriquées : on ne considère que les fragments situés à
    // l'intérieur d'une chaîne de sélection, sinon on ramasserait tous les
    // appels de fonction du projet.
    SELECT_RE.lastIndex = 0;
    while ((m = SELECT_RE.exec(src))) {
      const line = src.slice(0, m.index).split('\n').length;
      for (const item of splitTopLevel(m[2])) {
        if (!item.includes('(')) continue;
        const table = embedTable(item);
        if (table) record(table, rel, line);
      }
    }
  }

  return tables;
}

/**
 * Découpe une sélection PostgREST sur les virgules de PREMIER NIVEAU.
 *
 * `id, role, members!member_id(first_name, last_name)` →
 * `['id', 'role', 'members!member_id(first_name, last_name)']`
 */
function splitTopLevel(selection) {
  const parts = [];
  let depth = 0;
  let current = '';

  for (const ch of selection) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;

    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);

  return parts.map((s) => s.trim()).filter(Boolean);
}

function extractUsedColumns(files) {
  const usage = new Map(); // `${table}.${column}` -> [ {file, context} ]

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');

    let m;
    SELECT_RE.lastIndex = 0;
    while ((m = SELECT_RE.exec(src))) {
      const table = m[1];
      const selection = m[2];
      const line = src.slice(0, m.index).split('\n').length;

      // Découpe la sélection en ignorant les parenthèses de jointure.
      //
      // Un simple `split(',')` casse les sélections imbriquées :
      // `members!member_id(first_name, last_name)` devient trois morceaux dont
      // `last_name`, attribué à tort à la table courante. Il faut suivre la
      // profondeur de parenthèses, sans quoi chaque jointure génère un faux
      // signal — exactement ce qui polluait le premier passage de ce script.
      const topLevel = splitTopLevel(selection);

      for (const item of topLevel) {
        // `nom:colonne` → `colonne` ; `alias:table(...)` → ignoré (relation).
        const cleaned = item.includes(':') ? item.split(':').pop() : item;
        if (cleaned.includes('(')) continue;

        const bare = cleaned.replace(/\s+as\s+\w+$/i, '').replace(/^\w+\s+as\s+/i, '');
        if (!bare || !/^[a-z_][a-z0-9_]*$/i.test(bare)) continue;

        const key = `${table}.${bare}`;
        if (!usage.has(key)) usage.set(key, []);
        if (usage.get(key).length < 3) {
          usage.get(key).push({ file: rel, line });
        }
      }
    }
  }

  return usage;
}

async function main() {
  const env = loadEnv(path.join(ROOT, '.env.local'));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Variables Supabase absentes de .env.local');
    process.exit(1);
  }

  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
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

  // Index par table ET par colonne.
  //
  // Indexer seulement par nom de colonne produirait un faux négatif majeur :
  // `first_name` existe sur `members`, donc `user_profiles.first_name` —
  // colonne réellement absente — passerait pour valide. Le couple
  // table/colonne est la seule unité correcte.
  const liveTables = new Map();
  for (const [name, def] of Object.entries(spec.definitions ?? {})) {
    if (def?.properties) {
      liveTables.set(name, new Set(Object.keys(def.properties)));
    }
  }

  const files = walk(ROOT);
  const usage = extractUsedColumns(files);
  const referenced = extractReferencedTables(files);
  const migrations = scanMigrations();

  // Tables absentes : détectées depuis les RÉFÉRENCES, pas depuis l'index des
  // colonnes — voir la note sur FROM_RE plus haut.
  const missingTables = [...referenced.entries()]
    .filter(([table]) => !liveTables.has(table))
    .sort(([a], [b]) => a.localeCompare(b));

  // Colonnes absentes : lues ET écrites. Quand la table manque, parler de ses
  // colonnes n'apporte rien et noie le rapport.
  const writes = extractWriteKeys(files);

  const missingColumns = [];
  const seen = new Set();

  for (const [key, sites] of usage) {
    const [table, column] = key.split('.');
    const cols = liveTables.get(table);
    if (!cols || cols.has(column)) continue;
    const id = `${key}:select`;
    seen.add(id);
    missingColumns.push({ table, column, sites, io: 'lecture' });
  }

  for (const [key, sites] of writes) {
    const [table, column] = key.split('.');
    const cols = liveTables.get(table);
    if (!cols || cols.has(column)) continue;
    const id = `${key}:write`;
    if (seen.has(id)) continue;
    seen.add(id);
    // Une écriture absente est plus grave qu'une lecture absente : l'écran se
    // charge mais l'enregistrement échoue toujours, sans message.
    missingColumns.push({ table, column, sites, io: 'écriture' });
  }

  console.log(
    `${referenced.size} tables utilisées par le code · ` +
      `${usage.size} colonnes distinctes · ` +
      `${liveTables.size} tables exposées, ` +
      `${[...liveTables.values()].reduce((n, s) => n + s.size, 0)} colonnes en base.\n`
  );

  // Séparer les deux causes est ce qui rend le rapport exploitable : un objet
  // manquant dont la migration existe s'applique en exécutant le fichier, alors
  // qu'un objet qu'aucune migration ne crée demande une décision d'architecture.
  const tableRows = missingTables.map(([table, sites]) => ({
    name: table,
    sites,
    origin: migrations.tables.get(table) ?? null,
  }));
  const applied = tableRows.filter((r) => r.origin);
  const unexplained = tableRows.filter((r) => !r.origin);

  if (applied.length) {
    console.log(
      `🔴 ${applied.length} table(s) absentes — la MIGRATION EXISTE, elle n'a simplement pas été appliquée :\n`
    );
    for (const r of applied) {
      console.log(`  ${r.name}`);
      console.log(`      à appliquer : ${r.origin}`);
      console.log(`      utilisée  : ${r.sites[0].file}:${r.sites[0].line}`);
    }
    console.log();
  }

  if (unexplained.length) {
    console.log(
      `🟠 ${unexplained.length} table(s) absentes qu'AUCUNE migration ne crée :\n`
    );
    for (const r of unexplained) {
      console.log(`  ${r.name}`);
      console.log(`      utilisée : ${r.sites[0].file}:${r.sites[0].line}`);
    }
    console.log(
      '\n   Soit la migration correspondante manque, soit ce sont des buckets\n' +
        '   de stockage ou des jointures invalides : à vérifier une par une.\n'
    );
  }

  if (missingColumns.length) {
    // Même classement pour les colonnes : migration existante = simple
    // exécution à faire ; migration absente = le code demande quelque chose que
    // personne n'a jamais écrit.
    const withOrigin = missingColumns.map((c) => ({
      ...c,
      origin:
        migrations.columns.get(`${c.table}.${c.column}`) ??
        migrations.columns.get(`${c.table}.${c.column}`) ??
        null,
    }));
    const colApplied = withOrigin.filter((c) => c.origin);
    const colUnexplained = withOrigin.filter((c) => !c.origin);

    if (colApplied.length) {
      console.log(
        `⚠️  ${colApplied.length} colonne(s) absentes — la MIGRATION EXISTE, elle n'a pas été appliquée :\n`
      );
      for (const c of colApplied) {
        console.log(`  ${c.table}.${c.column}  (${c.io})`);
        console.log(`      à appliquer : ${c.origin}`);
        console.log(`      utilisée  : ${c.sites[0].file}:${c.sites[0].line}`);
      }
      console.log();
    }

    if (colUnexplained.length) {
      console.log(
        `🟠 ${colUnexplained.length} colonne(s) qu'aucune migration ne crée :\n`
      );
      for (const c of colUnexplained) {
        console.log(`  ${c.table}.${c.column}  (${c.io})`);
        console.log(`      utilisée : ${c.sites[0].file}:${c.sites[0].line}`);
      }
      console.log(
        '\n   Une écriture dans cette colonne échoue TOUJOURS, sans laisser de trace.\n'
      );
    }
  }

  if (!missingTables.length && !missingColumns.length) {
    console.log('✅ Le code ne référence aucune colonne ni table absente de la base.');
  }

  // --- Contrôle ponctuel : cohérence de `members.first_name` / `last_name` ---
  // Vérifié par agrégation, sans lire ni exposer de donnée nominative : si les
  // deux champs sont remplis de la même façon, la différence des deux compteurs
  // doit être nulle.
  // `Prefer: count=exact` est INDISPENSABLE : sans cet en-tête, PostgREST ne
  // renvoie pas `Content-Range`, et le comptage retombait sur NaN.
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: 'count=exact',
  };
  const build = (col) =>
    fetch(
      `${url.replace(/\/$/, '')}/rest/v1/members?select=id&${col}=not.is.null`,
      { headers }
    ).then(async (r) => ({
      ok: r.ok,
      count: r.ok ? r.headers.get('content-range') : null,
      status: r.status,
    }));

  const [first, last] = await Promise.all([build('first_name'), build('last_name')]);

  if (first.ok && last.ok) {
    const parse = (cr) => parseInt((cr ?? '/0').split('/')[1] ?? '0', 10);
    const nFirst = parse(first.count);
    const nLast = parse(last.count);

    if (nFirst === nLast) {
      console.log(
        `\n✅ members.first_name et last_name sont remplis de façon cohérente (${nFirst} lignes de chaque).`
      );
    } else {
      console.log(
        `\n⚠️  members.first_name : ${nFirst} lignes non nulles, last_name : ${nLast}.\n` +
          `    Les deux champs ne sont pas alimentés par le même chemin — les comparer\n` +
          `    dans une jointure peut donc produire des incohérences visibles.`
      );
    }
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
