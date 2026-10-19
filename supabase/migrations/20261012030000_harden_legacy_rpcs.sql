-- ============================================================================
-- Durcissement des 4 RPC historiques (jusqu'ici non versionnées)
-- ============================================================================
-- CONTEXTE
-- --------
-- `check_pastor_email_exists`, `auto_confirm_pastor`, `link_pastor_to_church` et
-- `update_member_profile_secure` n'existaient que dans la base : elles avaient
-- été créées à la main dans l'éditeur SQL et n'étaient donc décrites par AUCUN
-- fichier de migration. Trois défauts mesurés sur la base réelle :
--
--   1. Aucune ne figeait `search_path`. Une fonction SECURITY DEFINER dont le
--      `search_path` n'est pas figé est détournable : un schéma placé avant
--      `public` peut faire résoudre un nom non qualifié vers un objet hostile.
--   2. Toutes étaient exécutables par PUBLIC (`=X/postgres` dans la proacl),
--      donc par la clé anon, sans limitation de rôle.
--   3. `auto_confirm_pastor` confirmait l'email de N'IMPORTE QUEL compte, sans
--      la moindre vérification : un appelant anonyme pouvait confirmer un
--      compte arbitraire et contourner la confirmation par email.
--
-- CORRECTIONS
-- -----------
--   · `search_path` figé sur `public, pg_temp` (les accès à `auth.users` sont
--     déjà qualifiés, donc inchangés).
--   · `REVOKE ... FROM PUBLIC` : seuls `anon`, `authenticated` et `service_role`
--     gardent l'exécution — exactement les rôles nécessaires aux parcours
--     applicatifs.
--   · `auto_confirm_pastor` n'agit désormais que si l'email est référencé comme
--     contact de responsable d'église (`churches.leader_contact`), la même
--     condition que celle déjà imposée par l'étape 1 du parcours
--     `registerPastorAction`. Elle reste idempotente (une confirmation déjà
--     posée n'est pas modifiée).
--
-- Le COMPORTEMENT des appels légitimes est inchangé : le parcours
-- d'inscription pasteur et la mise à jour de profil membre continuent de
-- fonctionner à l'identique.
--
-- RLS / SECURITY DEFINER : ces fonctions s'exécutent avec les privilèges de
-- `postgres` et contournent volontairement la RLS. `update_member_profile_secure`
-- reste une fonction « à capacité » : l'appelant doit connaître le couple
-- `(member_id, church_id)`, tous deux des UUID non devinables, et la mise à jour
-- est bornée par `AND church_id = p_church_id`. Pour fermer totalement ce
-- dernier point, il faudrait vérifier la session membre côté serveur et passer
-- par le rôle `service_role` (voir note en fin de fichier).
--
-- Idempotente : `CREATE OR REPLACE`, et `REVOKE`/`GRANT` rejouables.
-- ============================================================================

-- ============================================================================
-- 1. check_pastor_email_exists(p_email) → boolean
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_pastor_email_exists(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
      FROM public.churches
     WHERE leader_contact ILIKE '%' || p_email || '%'
  );
END;
$$;

-- ============================================================================
-- 2. auto_confirm_pastor(p_email) → boolean
-- ============================================================================
-- Garde-fou ajouté : ne confirme QUE les emails de responsables d'église.
-- Sans lui, un appelant anonyme pouvait confirmer un compte arbitraire.
CREATE OR REPLACE FUNCTION public.auto_confirm_pastor(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT public.check_pastor_email_exists(p_email) THEN
    RETURN FALSE;
  END IF;

  -- `coalesce` : on ne réécrit pas une confirmation déjà posée, mais on
  -- renvoie bien TRUE pour un compte existant (comportement d'origine).
  UPDATE auth.users
     SET email_confirmed_at = coalesce(email_confirmed_at, now())
   WHERE email = p_email
  RETURNING id INTO v_user_id;

  RETURN v_user_id IS NOT NULL;
END;
$$;

-- ============================================================================
-- 3. link_pastor_to_church(p_email) → boolean
-- ============================================================================
-- Promu en `church_admin` uniquement si l'email est le contact d'un
-- responsable d'église. Le rôle super_admin n'est jamais attribué ici.
CREATE OR REPLACE FUNCTION public.link_pastor_to_church(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id   UUID;
  v_church_id UUID;
BEGIN
  SELECT id INTO v_user_id
    FROM auth.users
   WHERE email = p_email
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT id INTO v_church_id
    FROM public.churches
   WHERE leader_contact ILIKE '%' || p_email || '%'
   LIMIT 1;

  IF v_church_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_profiles
     SET role = 'church_admin',
         church_id = v_church_id
   WHERE id = v_user_id;

  RETURN TRUE;
END;
$$;

-- ============================================================================
-- 4. update_member_profile_secure(...) → json
-- ============================================================================
-- Mise à jour du profil d'un membre connecté par téléphone + code église, qui
-- n'a AUCUN compte Supabase (donc pas d'`auth.uid()`) : c'est pourquoi la
-- fonction est SECURITY DEFINER. La mise à jour est bornée au couple
-- `(member_id, church_id)` fourni, tous deux des UUID non devinables.
CREATE OR REPLACE FUNCTION public.update_member_profile_secure(
  p_member_id  uuid,
  p_church_id  uuid,
  p_first_name text,
  p_last_name  text,
  p_phone      text,
  p_email      text,
  p_birth_date date,
  p_commune    text,
  p_quartier   text,
  p_profession text,
  p_photo_url  text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated_id UUID;
BEGIN
  UPDATE public.members
     SET first_name = p_first_name,
         last_name  = p_last_name,
         phone      = p_phone,
         email      = p_email,
         birth_date = p_birth_date,
         commune    = p_commune,
         quartier   = p_quartier,
         profession = p_profession,
         photo_url  = p_photo_url
   WHERE id = p_member_id
     AND church_id = p_church_id
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NOT NULL THEN
    RETURN json_build_object('success', true);
  END IF;

  RETURN json_build_object('error', 'Erreur de mise à jour ou membre introuvable.');
END;
$$;

-- ============================================================================
-- 5. Droits : retirer l'accès implicite PUBLIC, garder les rôles applicatifs
-- ============================================================================
-- `REVOKE ... FROM PUBLIC` supprime l'entrée `=X/postgres` (tout le monde) sans
-- toucher aux droits explicites de anon / authenticated / service_role, qui
-- restent ceux dont les parcours ont besoin.
REVOKE ALL ON FUNCTION public.check_pastor_email_exists(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_confirm_pastor(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_pastor_to_church(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_member_profile_secure(
  uuid, uuid, text, text, text, text, date, text, text, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.check_pastor_email_exists(text)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_confirm_pastor(text)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.link_pastor_to_church(text)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_member_profile_secure(
  uuid, uuid, text, text, text, text, date, text, text, text, text
) TO anon, authenticated, service_role;

-- ============================================================================
-- NOTE — risque résiduel (à traiter côté application, pas ici)
-- ============================================================================
-- `update_member_profile_secure` reste appelable par `anon`. Sa seule barrière
-- est le secret des UUID `(member_id, church_id)`. Le durcissement complet
-- consiste à l'appeler depuis le serveur avec le rôle `service_role`
-- (`createAdminClient()` dans `app/actions/updateMemberProfile.ts`, après
-- vérification de la session membre par `verifyMemberSession`) et à révoquer
-- l'exécution de `anon`/`authenticated`. Ce changement touche un parcours
-- d'authentification membre et doit être validé par un test fonctionnel avant
-- mise en production : il n'est pas inclus ici pour ne pas casser l'existant.
-- ============================================================================
