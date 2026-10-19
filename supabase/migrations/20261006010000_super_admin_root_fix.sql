-- ============================================================================
-- CORRECTION RACINE : Super Admin + RLS user_profiles + Accès Universel
--
-- Problèmes corrigés :
--   1. RLS sur user_profiles : UN UTILISATEUR NE PEUT PAS LIRE SON PROPRE
--      PROFIL SANS church_id, car `church_id = get_user_church_id()` donne
--      NULL = NULL (inconnu, pas TRUE). Le Super Admin, n'ayant pas d'église
--      assignée par défaut, était donc invisible à lui-même → redirigé vers
--      /join-church au lieu de /super-admin.
--   2. Si le rôle dans user_profiles n'est pas super_admin, l'utilisateur
--      n'obtient aucun droit. On force ici le rôle de munokolive@gmail.com
--      à 'super_admin' directement en base (ne dépend plus du trigger).
--   3. Plusieurs policies autres que user_profiles vérifient
--      `up.church_id = X`. Pour un super_admin sans church_id, ces clauses
--      excluaient aussi les lignes où church_id est NULL.
--
-- Stratégie :
--   · Toute personne authentifiée a le droit de LIRE sa PROPRE ligne dans
--     user_profiles (règle d'or — sans ça, plus rien ne marche, pas même
--     les policies dépendantes via get_user_role / get_user_church_id).
--   · Le rôle super_admin est attribué explicitement à l'email déclaré
--     propriétaire (idempotent : UPSERT).
--   · Toutes les policies qui référencent user_profiles sont vérifiées ;
--     celles qui utilisent `up.church_id = ...` pour le rôle super_admin
--     sont corrigées pour accepter aussi up.church_id IS NULL.
-- ============================================================================

-- ============================================================================
-- 1. user_profiles — lecture de son propre profil, TOUJOURS autorisée
-- ============================================================================
DROP POLICY IF EXISTS "Users can view profiles in their church" ON public.user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can manage profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Church admins can read profiles of their church" ON public.user_profiles;

-- Règle fondamentale : tout le monde lit SA PROPRE ligne.
-- Sans ça, get_user_role() / get_user_church_id() ne peuvent rien retourner
-- et toutes les autres policies entrent en échec silencieux.
CREATE POLICY "Authenticated users can read their own profile"
ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Un super_admin LIRE tous les profils (vue d'ensemble, église par église).
CREATE POLICY "Super admins can read all profiles"
ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (public.get_user_role() = 'super_admin');

-- Un encadrement (church_admin / moderator / dept_leader / mutual_manager /
-- scanner) peut lire les profils APPARTENANT À SON ÉGLISE (pour son équipe,
-- scanner, gestion, etc.)
CREATE POLICY "Staff can read profiles of their church"
ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_church_id() IS NOT NULL
    AND church_id = public.get_user_church_id()
    AND public.get_user_role() IN (
      'super_admin','church_admin','moderator',
      'mutual_manager','dept_leader','scanner'
    )
  );

-- Écriture : super_admin peut TOUT faire sur user_profiles.
CREATE POLICY "Super admins can manage all profiles"
ON public.user_profiles
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

-- Un utilisateur peut MODIFIER son propre profil (avatar, prénom, nom…),
-- MAIS PAS son rôle, son church_id ni son member_id (RLS ne peut rien y
-- faire au niveau colonne : on contrôle ça via SECURITY DEFINER + trigger
-- protecteur ajouté plus bas).
CREATE POLICY "Users can update their own profile fields"
ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- 2. GARANTIR le rôle super_admin au compte propriétaire
-- ============================================================================
-- Le trigger handle_new_user() ne le fait plus (retiré pour la sécurité).
-- On applique donc ici un SET EXPLICITE, idempotent, pour l'email du
-- propriétaire. Si la ligne n'existe pas (cas rare), on la crée.
DO $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid
    FROM auth.users
   WHERE email = 'munokolive@gmail.com';

  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_profiles (id, email, role)
    VALUES (v_uid, 'munokolive@gmail.com', 'super_admin')
    ON CONFLICT (id) DO UPDATE
      SET role = EXCLUDED.role,
          email = EXCLUDED.email;
  END IF;
END $$;

-- ============================================================================
-- 3. Trigger protecteur : empêcher l'auto-élévation de rôle
-- ============================================================================
-- Un utilisateur non super_admin NE DOIT PAS pouvoir passer son propre
-- rôle à super_admin, church_admin ou moderator via UPDATE sur sa ligne.
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role
    FROM public.user_profiles
   WHERE id = auth.uid();

  IF caller_role <> 'super_admin' THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR
       NEW.church_id IS DISTINCT FROM OLD.church_id OR
       NEW.member_id IS DISTINCT FROM OLD.member_id THEN
      RAISE EXCEPTION 'Modification interdite de role/church_id/member_id (super_admin seulement)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS user_profiles_prevent_role_escalation ON public.user_profiles;
CREATE TRIGGER user_profiles_prevent_role_escalation
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_escalation();

-- ============================================================================
-- 4. member_notes — policies corrigées pour le super_admin SANS church_id
-- ============================================================================
-- La migration 20261005010000 utilisait `up.church_id = member_notes.church_id`
-- pour le super_admin aussi : un super_admin sans church_id ne voyait AUCUNE
-- note. Correction : rôle super_admin → toutes les notes visibles.
DROP POLICY IF EXISTS member_notes_select_own ON public.member_notes;
DROP POLICY IF EXISTS member_notes_admin_all ON public.member_notes;

CREATE POLICY member_notes_select_own ON public.member_notes
  FOR SELECT
  USING (
    -- 1. Un membre lit ses propres notes
    member_id = (
      SELECT up.member_id
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
    )
    -- 2. Un super_admin lit TOUTES les notes (accès universel)
    OR public.get_user_role() = 'super_admin'
    -- 3. Équipe encadrante : église correspondante
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.churches c ON c.id = up.church_id
      WHERE up.id = auth.uid()
        AND up.role IN ('church_admin', 'moderator')
        AND c.id = member_notes.church_id
    )
  );

CREATE POLICY member_notes_admin_all ON public.member_notes
  FOR ALL
  USING (
    public.get_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('church_admin', 'moderator')
        AND up.church_id = member_notes.church_id
    )
  )
  WITH CHECK (
    public.get_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('church_admin', 'moderator')
        AND up.church_id = member_notes.church_id
    )
  );

-- ============================================================================
-- 5. church_departments + department_leaders — idem
-- ============================================================================
DROP POLICY IF EXISTS church_departments_read ON public.church_departments;
DROP POLICY IF EXISTS church_departments_write ON public.church_departments;
DROP POLICY IF EXISTS department_leaders_read ON public.department_leaders;
DROP POLICY IF EXISTS department_leaders_write ON public.department_leaders;

-- Départements : super_admin universel, encadrement → leur église
CREATE POLICY church_departments_read ON public.church_departments
  FOR SELECT
  USING (
    public.get_user_role() = 'super_admin'
    OR church_id = (
      SELECT up.church_id FROM public.user_profiles up WHERE up.id = auth.uid()
    )
  );

CREATE POLICY church_departments_write ON public.church_departments
  FOR ALL
  USING (
    public.get_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('church_admin', 'moderator')
        AND up.church_id = church_departments.church_id
    )
  )
  WITH CHECK (
    public.get_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('church_admin', 'moderator')
        AND up.church_id = church_departments.church_id
    )
  );

-- Responsables de départements : super_admin universel
CREATE POLICY department_leaders_read ON public.department_leaders
  FOR SELECT
  USING (
    public.get_user_role() = 'super_admin'
    OR member_id = (
      SELECT up.member_id FROM public.user_profiles up WHERE up.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.church_departments d ON d.id = department_leaders.department_id
      WHERE up.id = auth.uid()
        AND up.role IN ('church_admin', 'moderator')
        AND d.church_id = up.church_id
    )
  );

CREATE POLICY department_leaders_write ON public.department_leaders
  FOR ALL
  USING (
    public.get_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.church_departments d ON d.id = department_leaders.department_id
      WHERE up.id = auth.uid()
        AND up.role IN ('church_admin', 'moderator')
        AND d.church_id = up.church_id
    )
  )
  WITH CHECK (
    public.get_user_role() = 'super_admin'
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.church_departments d ON d.id = department_leaders.department_id
      WHERE up.id = auth.uid()
        AND up.role IN ('church_admin', 'moderator')
        AND d.church_id = up.church_id
    )
  );

-- ============================================================================
-- 6. Garantir churches RLS : super_admin peut TOUJOURS TOUT faire
--    (la policy existante devrait déjà l'assurer mais on la ré-applique
--    pour être absolument certain).
-- ============================================================================
DROP POLICY IF EXISTS "Super Admins can do everything on churches" ON public.churches;
DROP POLICY IF EXISTS "Church admins and members can view their own church" ON public.churches;

CREATE POLICY "Super admins can do everything on churches"
  ON public.churches
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

CREATE POLICY "Church admins and members can view their own church"
  ON public.churches
  FOR SELECT
  TO authenticated
  USING (id = public.get_user_church_id());

-- ============================================================================
-- 7. members — accès universel du super_admin, encadrement → leur église
-- ============================================================================
DROP POLICY IF EXISTS "Super Admins can do everything on members" ON public.members;
DROP POLICY IF EXISTS "Church admins can do everything in their church" ON public.members;
DROP POLICY IF EXISTS "Members can view other members in their church" ON public.members;

CREATE POLICY "Super Admins can do everything on members"
  ON public.members
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

CREATE POLICY "Church staff can do everything in their church"
  ON public.members
  FOR ALL
  TO authenticated
  USING (
    church_id = public.get_user_church_id()
    AND public.get_user_role() IN ('church_admin','moderator','mutual_manager','dept_leader','scanner')
  )
  WITH CHECK (
    church_id = public.get_user_church_id()
    AND public.get_user_role() IN ('church_admin','moderator','mutual_manager','dept_leader','scanner')
  );

CREATE POLICY "Members can view other members in their church"
  ON public.members
  FOR SELECT
  TO authenticated
  USING (church_id = public.get_user_church_id());

-- ============================================================================
-- 8. FINAL CHECK : vérifier rapidement que le super_admin est bien en place
--    Renvoie (sous forme de NOTICE) le résultat.
-- ============================================================================
DO $$
DECLARE
  v_uid UUID;
  v_profile_role TEXT;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'munokolive@gmail.com';
  IF v_uid IS NULL THEN
    RAISE NOTICE '[SuperAdmin Fix] Aucun compte auth.users pour munokolive@gmail.com — compte à créer avant utilisation.';
  ELSE
    SELECT role INTO v_profile_role FROM public.user_profiles WHERE id = v_uid;
    RAISE NOTICE '[SuperAdmin Fix] Compte trouvé (%), rôle user_profiles = %', v_uid, COALESCE(v_profile_role, '(absent)');
  END IF;
END $$;
