// Compare les colonnes versionnees dans les migrations avec celles utilisees
// par le code. Outil de diagnostic, execute a la main.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const migDir = path.join(root, 'supabase', 'migrations');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const mig = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => fs.readFileSync(path.join(migDir, f), 'utf8'))
  .join('\n');

function versionedColumns(table) {
  const cols = new Set();
  const t = table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const create = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:public\\.)?${t}\\s*\\(([\\s\\S]*?)\\n\\)\\s*;`,
    'gi'
  );
  for (const m of mig.matchAll(create)) {
    for (const line of m[1].split('\n')) {
      const l = line.trim();
      if (/^(?:CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)\b/i.test(l)) continue;
      const cm = /^"?([A-Za-z_]\w*)"?\s+[A-Za-z]/.exec(l);
      if (cm && typeof cm[1] === 'string') cols.add(cm[1].toLowerCase());
    }
  }
  const alter = new RegExp(
    `ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:public\\.)?${t}\\s+ADD\\s+COLUMN\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?"?(\\w+)"?`,
    'gi'
  );
  for (const m of mig.matchAll(alter)) cols.add(String(m[1]).toLowerCase());
  return cols;
}

// Colonnes explicitement citees dans les .select("...") ou .select('...')
const files = [...walk(path.join(root, 'app')), ...walk(path.join(root, 'components'))];
const usage = new Map(); // table -> Map(col -> count)
const KNOWN = [
  'churches', 'members', 'user_profiles', 'notifications', 'church_services',
  'service_declarations', 'department_leaders', 'church_departments',
  'member_notes', 'service_assignments', 'audit_logs', 'kids', 'kids_checkins',
];

const add = (t, c) => {
  if (!usage.has(t)) usage.set(t, new Map());
  const m = usage.get(t);
  m.set(c, (m.get(c) || 0) + 1);
};

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  // Associe chaque .select(...) a la table la plus proche en amont.
  const re = /\.from\(\s*["'`](\w+)["'`]\s*\)[\s\S]{0,400}?\.select\(\s*(["'`])((?:(?!\2)[\s\S])*?)\2/g;
  for (const m of src.matchAll(re)) {
    const table = m[1];
    if (!KNOWN.includes(table)) continue;
    for (const raw of m[3].split(',')) {
      const c = raw.trim().split(/\s+/)[0].replace(/["`]/g, '');
      if (/^[\w]+$/.test(c)) add(table, c);
    }
  }
}

console.log('=== Colonnes utilisees par le code mais ABSENTES des migrations ===\n');
let total = 0;
for (const [table, cols] of usage) {
  const known = versionedColumns(table);
  const missing = [...cols.entries()]
    .filter(([c]) => !known.has(c))
    .sort((a, b) => b[1] - a[1]);
  if (missing.length) {
    console.log(`${table}  (${known.size} colonnes versionnees)`);
    for (const [c, n] of missing) {
      console.log(`   ${c.padEnd(24)} x${n}`);
      total++;
    }
    console.log('');
  }
}
console.log(total === 0 ? 'Aucun ecart detecte.' : `Total : ${total} colonnes non versionnees.`);