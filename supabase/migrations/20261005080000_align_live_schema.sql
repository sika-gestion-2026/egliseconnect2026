-- ============================================================================
-- Alignement du schéma RÉELLEMENT en production avec le code qui l'exploite.
--
-- CONTEXTE
-- ---------
-- Le schéma a été modifié à la main pendant le développement, et deux migrations
-- portant sur la même table se contredisent. Sur `member_notes` comme sur
-- `audit_logs`, la version la plus RÉCENTE a été écrite avec `CREATE TABLE IF
-- NOT EXISTS` : la table existait déjà, donc la nouvelle définition a été
-- silencieusement ignorée. La forme qui a réellement été créée est celle de la
-- migration la plus ancienne, et le code a été écrit contre l'autre.
--
-- Conséquence mesurée sur la base en production :
--   · `saveNoteAction` insère `title`, `verses` et `church_id` → 3 colonnes
--     inexistantes : l'enregistrement d'une note échoue à chaque fois. Le
--     `try`/`catch` masquait l'erreur, l'utilisateur ne voyait que
--     « Erreur lors de la sauvegarde ».
--   · `logAudit` insère `description` et `metadata` → inexistantes également
--     (la colonne réelle est `details`) : le journal d'audit de sécurité ne
--     registran plus RIEN.
--   · `processCheckinScan` fait un `upsert` sur `service_declarations` avec une
--     colonne `church_id` inexistante ET un `onConflict` sur
--     `(service_id, member_id)` sans contrainte unique correspondante : le
--     pointage des présences échoue.
--
-- Ce fichier rétablit ce qui manque. Il est idempotent et n'écrase aucune
-- donnée : les colonnes ajoutées sont nullable ou possessing une valeur par
-- défaut, et les remplissages ne touchent qu'aux lignes concernées.
--
-- ORDRE D'EXÉCUTION
-- -----------------
-- Ce fichier doit être appliqué AVANT `20261005010000`, dont la politique RLS
-- sur `member_notes` référence `member_notes.church_id`. Sans la colonne, la
-- création de la politique échoue et la migration s'interrompt.
-- ============================================================================

-- ============================================================================
-- 1. `member_notes` — le carnet spirituel du membre
-- ============================================================================

-- `title` et `verses` sont exigés par l'interface (app/member-dashboard/
-- NotesWidget.tsx) : le titre est la donnée affichée en tête de carte, et les
-- versets ont leur propre éditeur. Les supprimer côté SQL cassait l'écran ; on
-- restaure donc les colonnes.
ALTER TABLE public.member_notes
  ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE public.member_notes
  ADD COLUMN IF NOT EXISTS verses JSONB DEFAULT '[]'::jsonb;

-- `church_id` est nécessaire pour deux raisons : le code l'écrit, et la
-- politique RLS de `20261005010000` s'en sert pour vérifier que l'utilisateur
-- appartient bien à l'église de la note.
ALTER TABLE public.member_notes
  ADD COLUMN IF NOT EXISTS church_id UUID
  REFERENCES public.churches(id) ON DELETE CASCADE;

-- Remplissage : l'église d'une note se déduit du membre concerné. Sans ce
-- remplissage, les notes déjà enregistrées resteraient à `church_id = NULL` et
-- la politique RLS les rendrait invisibles aux administrateurs — donc
-- invisibles au journal pastoral, ce qui est le pire scénario possible.
UPDATE public.member_notes n
   SET church_id = m.church_id
  FROM public.members m
 WHERE n.member_id = m.id
   AND n.church_id IS NULL;

-- `author_id` référence `auth.users` et était NOT NULL. Or un membre connecté
-- par téléphone + code église n'a AUCUN compte Supabase : il n'a pas d'`auth
-- .uid()`. La contrainte rendait l'insertion impossible pour ce mode de
-- connexion. L'auteur est dans ce cas le membre lui-même, déjà porté par
-- `member_id` : on rend donc la colonne nullable au lieu d'inventer un compte.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'member_notes'
       AND column_name = 'author_id'
       AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.member_notes ALTER COLUMN author_id DROP NOT NULL;
  END IF;
END $$;

-- `content` est également NOT NULL alors que le formulaire peut être soumis
-- avec un corps vide (un carnet ne contient parfois qu'un titre et des versets).
ALTER TABLE public.member_notes
  ALTER COLUMN content DROP NOT NULL;

-- Index de lecture : le carnet est toujours filtré par membre, et le RLS
-- filtre par église.
CREATE INDEX IF NOT EXISTS member_notes_member_id_idx
  ON public.member_notes (member_id);

CREATE INDEX IF NOT EXISTS member_notes_church_id_idx
  ON public.member_notes (church_id);

-- ============================================================================
-- 2. `audit_logs` — le journal d'audit de sécurité
-- ============================================================================

-- La table réellement créée provient de `20260821000000_init_schema.sql`, qui
-- définit `details JSONB`. La migration `20260828140000_audit_logs.sql` a été
-- écrite ensuite avec `description TEXT` + `metadata JSONB`, mais son
-- `CREATE TABLE IF NOT EXISTS` n'a rien fait puisque la table existait déjà.
-- Le code et l'écran d'audit ont été écrits contre cette seconde forme.
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Les lignes historiques portent leur information dans `details`. On la remonte
-- vers `description` pour que le journal n'affiche pas une colonne vide sur tout
-- l'historique.
UPDATE public.audit_logs
   SET description = COALESCE(description, details::text)
 WHERE description IS NULL
   AND details IS NOT NULL;

CREATE INDEX IF NOT EXISTS audit_logs_church_id_created_at_idx
  ON public.audit_logs (church_id, created_at DESC);

-- ============================================================================
-- 3. `service_declarations` — le pointage des présences
-- ============================================================================

-- L'upsert du pointage déclare `onConflict: 'service_id,member_id'`. Sans
-- contrainte unique sur ce couple, PostgREST échoue avec « there is no unique
-- or exclusion constraint matching the ON CONFLICT specification » : le
-- pointage était cassé même avant le problème de colonne.
--
-- Index non unique d'abord : la création d'un index unique échoue s'il existe
-- des doublons, et l'appliquer brutalement supprimerait des présences réelles.
CREATE INDEX IF NOT EXISTS service_declarations_service_member_idx
  ON public.service_declarations (service_id, member_id);

-- On ne conserve que la ligne la plus récente par couple. `ctid` est le
-- identifiant de ligne physique : c'est le seul moyen de trancher sans colonne
-- de date potentiellement absente ou identique.
DELETE FROM public.service_declarations d
 WHERE d.ctid NOT IN (
   SELECT DISTINCT ON (service_id, member_id) ctid
     FROM public.service_declarations
    ORDER BY service_id, member_id, updated_at DESC NULLS LAST, ctid
 );

CREATE UNIQUE INDEX IF NOT EXISTS service_declarations_service_member_uniq
  ON public.service_declarations (service_id, member_id);

CREATE INDEX IF NOT EXISTS service_declarations_member_id_idx
  ON public.service_declarations (member_id);

-- ============================================================================
-- 4. Vérification finale
-- ============================================================================
-- Les trois requêtes ci-dessous doivent renvoyer 0 ligne. Si l'une en renvoie
-- une, le pointage ou l'enregistrement de note reste cassé.
--
--   SELECT count(*) FROM service_declarations sd
--    WHERE (sd.service_id, sd.member_id) IN (
--      SELECT service_id, member_id FROM service_declarations
--       GROUP BY service_id, member_id HAVING count(*) > 1);
--
--   SELECT count(*) FROM member_notes WHERE church_id IS NULL;
--
--   SELECT count(*) FROM audit_logs WHERE description IS NULL;
-- ============================================================================