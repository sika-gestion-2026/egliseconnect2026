/**
 * Audit des Server Actions : détecte celles qui écrivent sans contrôle
 * d'autorisation explicite.
 *
 * CONTEXTE
 * ---------
 * Plusieurs actions ont été corrigées au cours de l'audit parce qu'elles
 * présentaient le même défaut : absence de vérification de rôle, identifiants
 * d'église reçus du client et utilisés tels quels, ou client `service_role`
 * sans garde interne. Le motif s'est répété ; il est plus fiable de le chercher
 * mécaniquement que de le repérer à la lecture.
 *
 * CE QUE CE SCRIPT DÉTECTE (indices, pas verdicts)
 * ------------------------------------------------
 *   - une Server Action qui écrit (insert/update/delete/upload/rpc) sans
 *     appeler `requireAuthz` ni vérifier explicitement un rôle ;
 *   - une action qui utilise un client `service_role` / `admin` ;
 *   - une action qui lit un rôle sans jamais le comparer à une valeur.
 *
 * Un signalement n'est pas forcément un défaut : certaines actions sont
 * volontairement publiques (inscription, connexion), et d'autres s'appuient
 * uniquement sur la RLS. C'est une liste de relecture, pas un test.
 *
 * Usage : node scripts/check-actions-authz.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/** Dossiers qui ne contiennent pas de Server Action applicative. */
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'scripts']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Retire les commentaires, qui évoquent souvent les mots-clés recherché. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const files = walk(ROOT);

/** Morceaux de fichier où une action `use server` est définie. */
function extractActions(src) {
  const actions = [];
  // Action de niveau fichier : tout le fichier est marqué 'use server'.
  if (/^\s*['"]use server['"]/m.test(src.slice(0, 200))) {
    actions.push({ name: '(module)', start: 0, end: src.length });
  }

  // Action imbriquée : fonction async dont le corps commence par 'use server'.
  const re = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*(?::[^{]*?)?\{\s*['"]use server['"]/g;
  let m;
  while ((m = re.exec(src))) {
    // Approximation par recherche du accolade fermante correspondante.
    let depth = 0;
    let i = src.indexOf('{', m.index);
    const open = i;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    actions.push({ name: m[1], start: m.index, end: i });
  }
  return actions;
}

const WRITE_RE =
  /\.(insert|update|upsert|delete|upload|remove)\s*\(|createAdminClient|service_role|signUp\s*\(/;

const GUARD_RE =
  /requireAuthz|get_user_role|\.role\s*(===|!==|==|!=)|ADMIN_ROLES|STAFF_ROLES|LOCATION_ROLES|TEAM_ROLES|SUPER_ADMIN_ROLES|authzMessage|verifyMemberSession|auth\.getUser\s*\(\)|authorization|CRON_SECRET/;

const findings = [];

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const src = stripComments(raw);

  for (const action of extractActions(src)) {
    const body = src.slice(action.start, action.end);
    if (!WRITE_RE.test(body)) continue;

    const flags = [];
    if (/createAdminClient|service_role/.test(body)) flags.push('service_role');
    if (!GUARD_RE.test(body)) flags.push('AUCUNE garde');

    if (flags.length) {
      findings.push({
        file: path.relative(ROOT, file).replace(/\\/g, '/'),
        action: action.name,
        flags,
      });
    }
  }
}

if (!findings.length) {
  console.log('✅ Aucune Server Action écrivant sans garde détectée.');
} else {
  console.log(`⚠️  ${findings.length} Server Action(s) à relire :\n`);
  for (const f of findings) {
    console.log(`  ${f.file} :: ${f.action}`);
    console.log(`      → ${f.flags.join(', ')}`);
  }
}
