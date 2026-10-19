-- ============================================================================
-- Lecture de son propre profil (user_profiles)
-- ============================================================================
-- POURQUOI CETTE MIGRATION
-- -----------------------
-- Les politiques d'origine ne permettent de lire une ligne de `user_profiles`
-- que si `church_id = get_user_church_id()` (ou pour un super_admin).
-- Or `get_user_church_id()` renvoie NULL tant que l'utilisateur n'a pas
-- rejoint une église. Dans ce cas `church_id = NULL` vaut NULL (et non TRUE) :
-- un nouvel inscrit ne peut PAS lire SA PROPRE ligne. Le parcours d'inscription
-- / rejoindre une église, qui a besoin de lire le profil pour savoir où en est
-- l'utilisateur, se met alors à échouer silencieusement.
--
-- Ces deux politiques sont STRICTEMENT EN LECTURE (FOR SELECT) : elles
-- n'autorisent aucune écriture et n'ouvrent donc aucune voie d'ascension de
-- privilèges. La modification de `role` / `church_id` / `member_id` reste
-- réservée au super_admin (et, côté serveur, aux RPC SECURITY DEFINER).
--
-- Idempotente : les politiques sont recréées après suppression.
-- ============================================================================

-- Règle d'or : tout utilisateur authentifié lit sa PROPRE ligne, toujours.
DROP POLICY IF EXISTS "Authenticated users can read their own profile" ON public.user_profiles;
CREATE POLICY "Authenticated users can read their own profile"
ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- L'encadrement lit les profils de SON église (page Équipe, scanner, etc.).
DROP POLICY IF EXISTS "Staff can read profiles of their church" ON public.user_profiles;
CREATE POLICY "Staff can read profiles of their church"
ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_church_id() IS NOT NULL
    AND church_id = public.get_user_church_id()
    AND public.get_user_role() IN (
      'church_admin','moderator','mutual_manager','dept_leader','scanner'
    )
  );
