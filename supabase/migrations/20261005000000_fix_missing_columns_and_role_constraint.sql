-- ============================================================================
-- Correctifs de schéma : colonnes utilisées par le code mais absentes des
-- migrations précédentes.
--
-- Contexte : plusieurs écrans interrogent des colonnes qui n'ont jamais été
-- créées (members.email, members.latitude/longitude). Résultat : les requêtes
-- échouent silencieusement et les fonctionnalités correspondantes (GPS,
-- authentification membre) ne fonctionnent pas sur une base reconstruite depuis
-- les migrations.
--
-- Ce script est idempotent : il peut être rejoué sans risque.
-- ============================================================================

-- --- Membres : coordonnées GPS (carte / suivi de proximité) ---------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE public.members ADD COLUMN latitude DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE public.members ADD COLUMN longitude DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.members ADD COLUMN email TEXT;
  END IF;
END $$;

COMMENT ON COLUMN public.members.latitude IS 'Latitude WGS84 du membre ( positioning volontaire )';
COMMENT ON COLUMN public.members.longitude IS 'Longitude WGS84 du membre';
COMMENT ON COLUMN public.members.email IS 'Email du membre — utilisé par la RPC authenticate_member';

-- --- Profils : prénom / nom / avatar / nom complet ------------------------
-- Requêtes par user_profiles.first_name / last_name / avatar_url (login)
-- et audit.full_name (journal d'audit).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN first_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN last_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN avatar_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN full_name TEXT;
  END IF;
END $$;

-- --- Contrainte de rôle ---------------------------------------------------
-- La contrainte CHECK sur le rôle avait été supprimée, ce qui permettait à
-- un utilisateur authentifié de s'auto-attribuer 'super_admin' via un simple
-- UPDATE sur son propre profil.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_role_check'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_role_check
      CHECK (role IN (
        'super_admin',
        'church_admin',
        'moderator',
        'mutual_manager',
        'dept_leader',
        'scanner',
        'member'
      ));
  END IF;
END $$;

-- --- Index de performance -------------------------------------------------
-- La carte et le radar interrogent les membres par église puis par position.
CREATE INDEX IF NOT EXISTS members_church_id_idx ON public.members (church_id);
CREATE INDEX IF NOT EXISTS members_birth_date_idx ON public.members (birth_date);
CREATE INDEX IF NOT EXISTS service_declarations_service_id_idx
  ON public.service_declarations (service_id);