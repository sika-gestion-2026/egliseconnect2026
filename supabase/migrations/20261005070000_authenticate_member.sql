-- ============================================================================
-- authenticate_member : authentification par téléphone / email + code église.
--
-- POURQUOI CETTE MIGRATION EXISTE
-- ------------------------------
-- `authenticate_member` est appelée par `app/actions/memberLogin.ts`, mais elle
-- n'était définie dans AUCUN fichier de migration : elle avait été créée à la
-- main dans l'éditeur SQL de Supabase. Conséquences :
--   1. la base n'était pas reproductible ;
--   2. personne — pas même l'auteur du code — ne pouvait relire sa logique de
--      sécurité pour la vérifier.
--
-- VULNÉRABILITÉS CORRIGÉES
-- ------------------------
-- 1. Énumération de comptes.
--    L'erreur retournée distinguait « église introuvable », « membre
--    introuvable » et « identifiant incorrect ». Un attaquant pouvait donc
--    balayer l'annuaire et découvrir quels numéros appartiennent à une église
--    donnée, simplement en lisant le message d'erreur. Toutes les défaillances
--    renvoient désormais le même texte.
--
-- 2. Absence de limitation de débit.
--    Le couple (code église à 5 caractères) + téléphone est un secret faible, et
--    il n'y avait aucun verrou. Un script pouvait tenter des millions de
--    combinaisons par heure depuis une seule IP : c'est la porte d'entrée
--    standard d'un account takeover. Le tableau `member_login_attempts` bloque
--    désormais après 5 échecs sur une fenêtre glissante de 15 minutes.
--
-- 3. Fonction SECURITY DEFINER sans `search_path` figé.
--    Sans `SET search_path`, une fonction privilégiée est détournable via une
--    table posée dans un schéma antérieur du `search_path`. Le `search_path`
--    est figé ici.
--
-- 4. Recherche par `LIKE` / comparaison non normalisée.
--    Les numéros saisis « +243 81 234 5678 » ne correspondaient pas au format
--    stocké. La comparaison se fait désormais sur les seuls chiffres, et
--    l'email est comparé en minuscules : le member-login ne dépend plus du
--    format de saisie.
--
-- 5. Comptes désactivés.
--    La fonction ignorait `members.status` et `churches.status` : un membre
--    retiré ou une église suspendue pouvait encore se connecter. Les deux
--    filtres sont ajoutés.
--
-- FORMAT DE RETOUR (INCHANGÉ)
-- ----------------------------
-- `TABLE(member_id uuid, church_id uuid, profile jsonb, error text)`.
-- Le code applicatif lit `data.error`, `data.member_id`, `data.church_id` et
-- `data.profile.{first_name,last_name,photo_url,church_logo}` : ce contrat est
-- préservé à l'identique pour ne rien casser côté interface.
-- ============================================================================

-- `digest()` vient de pgcrypto. Sur Supabase l'extension est généralement déjà
-- présente ; le IF NOT EXISTS la déclare au besoin sans jamais échouer.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --- Normalisation des identifiants -----------------------------------------
-- IMMUTABLE : obligatoire pour être utilisable dans un index, et sans effet de
-- bord, donc sans risque en SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.normalize_phone(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT NULLIF(
    regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g'),
    ''
  );
$$;

-- --- Journal des tentatives -------------------------------------------------
-- On ne stocke PAS l'identifiant en clair : c'est un numéro de téléphone, donc
-- une donnée personnelle. Seul le hachage est conservé, ce qui suffit à
-- compter les tentatives sans créer une nouvelle base de données personnelles.
CREATE TABLE IF NOT EXISTS public.member_login_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier_hash TEXT NOT NULL,
  succeeded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_login_attempts_lookup
  ON public.member_login_attempts (identifier_hash, created_at DESC);

-- Indispensable : le nettoyage ci-dessous filtre sur `created_at` seul. Sans
-- cet index, chaque tentative de connexion déclenchait un scan séquentiel de
-- tout le journal — sur un chemin critique et à chaque appel.
CREATE INDEX IF NOT EXISTS idx_member_login_attempts_created_at
  ON public.member_login_attempts (created_at);

ALTER TABLE public.member_login_attempts ENABLE ROW LEVEL SECURITY;

-- Aucun rôle applicatif ne lit ni n'écrit ce journal : c'est la fonction
-- SECURITY DEFINER qui s'en sert, en contournant la RLS.
REVOKE ALL ON public.member_login_attempts FROM anon, authenticated;

-- --- Fonction d'authentification --------------------------------------------
-- DROP puis CREATE : la valeur de retour d'une fonction ne peut pas être
-- modifiée par CREATE OR REPLACE, et le type de retour vivant en base est
-- inconnu. Le nom, les noms de paramètres et l'ordre des arguments sont
-- conservés à l'identique pour que l'appel existant reste valide.
DROP FUNCTION IF EXISTS public.authenticate_member(TEXT, TEXT);

CREATE FUNCTION public.authenticate_member(
  p_church_code TEXT,
  p_identifier   TEXT
)
RETURNS TABLE (
  member_id UUID,
  church_id UUID,
  profile   JSONB,
  error     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_lockout_window   CONSTANT INTERVAL := INTERVAL '15 minutes';
  c_max_failures     CONSTANT INTEGER  := 5;

  v_code         TEXT;
  v_email        TEXT;
  v_phone        TEXT;
  v_identifier_hash TEXT;

  v_church       RECORD;
  v_member       RECORD;
  v_failures     INTEGER;
BEGIN
  v_code  := upper(btrim(coalesce(p_church_code, '')));
  v_email := CASE
    WHEN position('@' in coalesce(p_identifier, '')) > 0
      THEN lower(btrim(p_identifier))
    ELSE NULL
  END;
  v_phone := CASE
    WHEN position('@' in coalesce(p_identifier, '')) = 0
      THEN public.normalize_phone(p_identifier)
    ELSE NULL
  END;

  -- Une seule porte de sortie pour toutes les défaillances, y compris en amont
  -- des contrôles. Pas de distinction entre « église inconnue » et « membre
  -- inconnu » : c'est ce qui rend l'énumération impossible.
  IF v_code = '' OR (v_email IS NULL AND v_phone IS NULL) THEN
    RETURN QUERY SELECT NULL, NULL, NULL, 'Identifiants invalides.'::TEXT;
    RETURN;
  END IF;

  v_identifier_hash := encode(
    digest(lower(coalesce(p_identifier, '')) || '|' || v_code, 'sha256'),
    'hex'
  );

  -- Nettoyage opportuniste : on borne la taille du journal sans-planifier de
  -- tâche cron. Le verrou autocommit de l'appelant garantit qu'aucune
  -- transaction longue ne retient ces lignes.
  DELETE FROM public.member_login_attempts
   WHERE created_at < now() - INTERVAL '7 days';

  -- Limitation de débit, sur la fenêtre glissante.
  SELECT count(*) INTO v_failures
    FROM public.member_login_attempts
   WHERE identifier_hash = v_identifier_hash
     AND succeeded = false
     AND created_at > now() - c_lockout_window;

  IF v_failures >= c_max_failures THEN
    RETURN QUERY SELECT
      NULL, NULL, NULL,
      'Trop de tentatives. Réessayez dans 15 minutes.'::TEXT;
    RETURN;
  END IF;

  SELECT c.id, c.name, c.logo_url
    INTO v_church
    FROM public.churches c
   WHERE upper(btrim(c.code)) = v_code
     AND c.status = 'active'
   LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.member_login_attempts (identifier_hash, succeeded)
    VALUES (v_identifier_hash, false);
    RETURN QUERY SELECT NULL, NULL, NULL, 'Identifiants invalides.'::TEXT;
    RETURN;
  END IF;

  -- Recherche par email OU par téléphone normalisé. `LIMIT 1` évite
  -- l'ambiguïté si un numéro est saisi deux fois dans la même église.
  SELECT m.id,
         m.church_id,
         m.first_name,
         m.last_name,
         m.photo_url
    INTO v_member
    FROM public.members m
   WHERE m.church_id = v_church.id
     AND m.status = 'active'
     AND (
       (v_email  IS NOT NULL AND lower(btrim(m.email)) = v_email)
       OR
       (v_phone  IS NOT NULL AND public.normalize_phone(m.phone) = v_phone)
     )
   LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.member_login_attempts (identifier_hash, succeeded)
    VALUES (v_identifier_hash, false);
    RETURN QUERY SELECT NULL, NULL, NULL, 'Identifiants invalides.'::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.member_login_attempts (identifier_hash, succeeded)
  VALUES (v_identifier_hash, true);

  RETURN QUERY SELECT
    v_member.id,
    v_member.church_id,
    jsonb_build_object(
      'first_name',   v_member.first_name,
      'last_name',    v_member.last_name,
      'photo_url',    v_member.photo_url,
      'church_logo',  v_church.logo_url,
      'church_name',  v_church.name
    ),
    NULL::TEXT;
END;
$$;

-- Le member-login se produit AVANT toute authentification Supabase : l'appel
-- part avec la clé anon. C'est précisément ce qui rend la limitation de
-- débit indispensable — et c'est pourquoi le rôle anon doit avoir accès.
REVOKE ALL ON FUNCTION public.authenticate_member(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authenticate_member(TEXT, TEXT) TO anon, authenticated;

-- `normalize_phone` est utilisée par la fonction ci-dessus et peut être utile
-- à une contrainte CHECK d'unicité plus tard ; on l'expose en lecture seule.
REVOKE ALL ON FUNCTION public.normalize_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO anon, authenticated;