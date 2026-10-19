/**
 * Assemble le script SQL d'application des migrations en attente.
 *
 * POURQUOI CE SCRIPT
 * ------------------
 * La base de production est en retard sur le dépôt : sept tables et quatorze
 * colonnes utilisées par le code n'existent pas encore. Les créer suppose de
 * les exécuter dans le bon ordre, ce qui est fastidieux et facile à mal faire
 * depuis l'éditeur SQL de Supabase.
 *
 * Aucun `psql`, aucune CLI Supabase, aucun Docker sur cette machine : le SQL ne
 * peut donc pas être appliqué ici. On produit à la place un fichier unique,
 * prêt à coller, dont l'ordre et le contenu sont dérivés des migrations elles-
 * mêmes — donc jamais désynchronisés du dépôt.
 *
 * LE PIÈGE QUE CE SCRIPT ÉVITE
 * ----------------------------
 * Trois migrations utilisent `CREATE TABLE` sans `IF NOT EXISTS`. Sur une table
 * déjà créée, l'instruction échoue et interrompt tout le script en cours. Deux
 * d'entre elles (`pastoral_visits`, `church_announcements`) visent des tables
 * absentes : sans risque. La troisième, `20260824180000_member_notes.sql`,
 * vise `member_notes`, qui EXISTE — et dont la forme réelle est celle de la
 * migration `20260826170000_catchup_all_missing.sql`, plus récente, écrite avec
 * `CREATE TABLE IF NOT EXISTS` et donc sans effet. L'ancienne définition est
 * donc réellement périmée : l'appliquer ferait échouer le script, et ses
 * colonnes (`title`, `verses`) sont restaurées proprement par
 * `20261005080000_align_live_schema.sql`.
 *
 * Le fichier est régénéré plutôt que édité à la main : `node
 * scripts/build-apply-script.cjs`.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIGRATIONS = path.join(ROOT, 'supabase', 'migrations');
const OUTPUT = path.join(ROOT, 'supabase', 'APPLY-PENDING.sql');

/**
 * Migrations en attente, dans l'ordre d'application.
 *
 * L'ordre est celui des noms de fichiers : leur préfixe est un horodatage, donc
 * le tri lexicographique EST l'ordre chronologique.
 *
 * Raison d'inclusion, vérifiée contre le schéma réel relevé via l'API :
 *   - la table ou la colonne visée est absente de la base ;
 *   - ou la migration corrige un état dangereux connu (RLS désactivée,
 *     trigger de super_admin, absence de limitation de tentatives).
 */
const PENDING = [
  '20260824170000_pastoral_visits.sql',
  '20260824190000_church_announcements.sql',
  '20260826151500_edification_feed.sql',
  '20260905162400_kids_checkin.sql',
  '20261005000000_fix_missing_columns_and_role_constraint.sql',
  // Doit précéder 0501000 : la politique RLS y référence member_notes.church_id.
  '20261005080000_align_live_schema.sql',
  '20261005010000_reenable_rls_member_notes_and_departments.sql',
  '20261005020000_remove_email_super_admin_trigger.sql',
  '20261005030000_prayer_wall.sql',
  '20261005040000_sms_campaigns.sql',
  '20261005050000_fix_kids_rls_role_names.sql',
  '20261005060000_reconcile_schema_columns.sql',
  '20261005070000_authenticate_member.sql',
  // Contraintes & montée en charge : corrige members.status (l'import Excel
  // écrivait 'active', refusé par le CHECK), élargit churches.code, crée la
  // contrainte unique attendances(church_id,date) exigée par l'upsert du
  // pointage, les vues church_stats / church_finance_balance lues par le code,
  // et les index tenant.
  '20261011200000_scalability_and_constraint_fixes.sql',
  // RLS manquantes : attendances/attendance_members étaient en « deny-all ».
  '20261012000000_attendance_rls_policies.sql',
  // Lecture de son propre profil et des profils de son église.
  '20261012010000_user_profiles_self_read.sql',
  // Le compte propriétaire (munokolive@gmail.com) doit rester super_admin :
  // accès à toutes les églises. Garanti de façon idempotente.
  '20261012020000_owner_super_admin.sql',
  // Versionne et durcit les 4 RPC historiques (search_path figé, retrait du
  // droit implicite PUBLIC, garde-fou sur auto_confirm_pastor).
  '20261012030000_harden_legacy_rpcs.sql',
];

/** Volontairement exclues : voir l'en-tête du fichier. */
const EXCLUDED = {
  '20260824180000_member_notes.sql':
    'la table member_notes existe déjà, sous la forme de la migration ' +
    '20260826170000_catchup_all_missing.sql (plus récente, écrite avec IF ' +
    'NOT EXISTS donc sans effet sur la précédente). Appliquer ce fichier ' +
    'échouerait sur un CREATE TABLE déjà existant ; ses colonnes title et ' +
    'verses sont restaurées par 20261005080000_align_live_schema.sql.',
  '20261006010000_super_admin_root_fix.sql':
    "attribue le rôle super_admin à une adresse email codée en dur au milieu " +
    "d'autres changements. Ses correctifs légitimes sont repris séparément : " +
    "20261012010000_user_profiles_self_read.sql (lecture de son propre profil) " +
    "et 20261012020000_owner_super_admin.sql (rôle super_admin du compte " +
    "propriétaire). Son trigger prevent_role_self_escalation n'est PAS repris : " +
    "il bloquerait removeTeamMember (un church_admin y modifie le profil d'un " +
    "collaborateur) et n'est pas nécessaire, faute d'aucune politique UPDATE " +
    "accordée aux utilisateurs ordinaires.",
  '20261011000000_attendance_rls_super_admin.sql':
    'contient lui aussi le backdoor email → super_admin. Ses politiques RLS ' +
    'légitimes sont reprises sans le backdoor par ' +
    '20261012000000_attendance_rls_policies.sql.',
};

function main() {
  const header = `-- ============================================================================
-- MIGRATIONS EN ATTENTE — À APPLIQUER SUR LA BASE DE PRODUCTION
-- ============================================================================
-- Généré par scripts/build-apply-script.cjs. Ne pas éditer à la main :
-- modifier la source et régénérer.
--
-- POURQUOI CE FICHIER EXISTE
-- La base de production est en retard sur le code : plusieurs objets
-- (colonnes, index uniques, vues, politiques RLS, fonctions) utilisés par
-- l'application n'existent pas encore, ce qui casse silencieusement des
-- fonctionnalités entières (voir scripts/verify-code-vs-db.cjs, qui produit
-- ce constat contre la base réelle).
--
-- COMMENT L'APPLIQUER
-- 1. Ouvrir le SQL Editor de Supabase.
-- 2. Coller ce fichier EN ENTIER et exécuter.
-- 3. Relancer : node scripts/verify-code-vs-db.cjs
--    Il doit alors n'afficher plus aucun écart.
--
-- ORDRE
-- L'ordre ci-dessous est l'ordre chronologique des migrations, à une exception
-- documentée : 20261005080000 est placée AVANT 20261005010000, parce que la
-- politique RLS de 0501000 référence member_notes.church_id. Sans la colonne,
-- la création de la politique échoue et la migration s'interrompt.
--
-- Ce que ce script ne peut pas faire
-- Il ne CRÉE pas de compte. Le rôle super_admin du compte propriétaire est bel
-- et bien (re)garanti par 20261012020000_owner_super_admin.sql, mais uniquement
-- si ce compte existe déjà dans auth.users (inscription préalable).
-- ============================================================================`;

  const excludedBlock = Object.entries(EXCLUDED)
    .map(([name, why]) => `-- EXCLUE : ${name}\n--   ${why}`)
    .join('\n');

  const parts = [header, '\n' + excludedBlock];

  PENDING.forEach((name, i) => {
    const file = path.join(MIGRATIONS, name);
    if (!fs.existsSync(file)) {
      console.error(`Migration introuvable : ${name}`);
      process.exit(1);
    }
    const sql = fs.readFileSync(file, 'utf8').trimEnd();

    parts.push(
      `\n-- ${'='.repeat(75)}\n` +
        `-- ${i + 1}/${PENDING.length} : ${name}\n` +
        `-- ${'='.repeat(75)}\n\n` +
        sql +
        '\n'
    );
  });

  parts.push(`
-- ============================================================================
-- FIN DES MIGRATIONS EN ATTENTE
--
-- Contrôle final : ces trois requêtes doivent renvoyer 0.
--   SELECT count(*) FROM member_notes WHERE church_id IS NULL;
--   SELECT count(*) FROM audit_logs   WHERE description IS NULL;
--   SELECT count(*) FROM (SELECT service_id, member_id
--                           FROM service_declarations
--                          GROUP BY service_id, member_id
--                         HAVING count(*) > 1) d;
-- ============================================================================
`);

  fs.writeFileSync(OUTPUT, parts.join('\n'), 'utf8');

  const bytes = fs.statSync(OUTPUT).size;
  console.log(`→ supabase/APPLY-PENDING.sql`);
  console.log(`${PENDING.length} migrations, ${bytes} octets.`);
  console.log('\nOrdre d\'application :');
  PENDING.forEach((n, i) => console.log(`  ${String(i + 1).padStart(2)}. ${n}`));
}

main();