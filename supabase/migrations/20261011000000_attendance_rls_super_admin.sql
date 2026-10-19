-- ============================================================================
-- RLS pour attendances et attendance_members
--
-- Ces tables avaient RLS activé mais AUCUNE politique : personne ne pouvait
-- lire/écrire via le client standard (RLS = deny-all par défaut). Le dashboard
-- de pointage et le radar des absents étaient donc silencieusement vides.
--
-- Stratégie :
--   · super_admin : accès universel en lecture ET écriture sur toutes les
--     églises (mode fantôme).
--   · Encadrement d'église (church_admin, moderator, dept_leader, scanner,
--     mutual_manager) : tout faire dans SA propre église.
--   · Membres : lecture des pointages de leur église.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. attendances
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "super_admin_all_attendances" ON public.attendances;
DROP POLICY IF EXISTS "church_staff_manage_attendances" ON public.attendances;
DROP POLICY IF EXISTS "members_view_attendances" ON public.attendances;

CREATE POLICY "super_admin_all_attendances"
ON public.attendances
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

CREATE POLICY "church_staff_manage_attendances"
ON public.attendances
  FOR ALL
  TO authenticated
  USING (
    church_id = public.get_user_church_id()
    AND public.get_user_role() IN (
      'church_admin','moderator','mutual_manager','dept_leader','scanner'
    )
  )
  WITH CHECK (
    church_id = public.get_user_church_id()
    AND public.get_user_role() IN (
      'church_admin','moderator','mutual_manager','dept_leader','scanner'
    )
  );

CREATE POLICY "members_view_attendances"
ON public.attendances
  FOR SELECT
  TO authenticated
  USING (church_id = public.get_user_church_id());

-- ---------------------------------------------------------------------------
-- 2. attendance_members (table de jointure)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "super_admin_all_attendance_members" ON public.attendance_members;
DROP POLICY IF EXISTS "church_staff_manage_attendance_members" ON public.attendance_members;
DROP POLICY IF EXISTS "members_view_attendance_members" ON public.attendance_members;

CREATE POLICY "super_admin_all_attendance_members"
ON public.attendance_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attendances a
      WHERE a.id = attendance_members.attendance_id
    )
    AND public.get_user_role() = 'super_admin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attendances a
      WHERE a.id = attendance_members.attendance_id
    )
    AND public.get_user_role() = 'super_admin'
  );

CREATE POLICY "church_staff_manage_attendance_members"
ON public.attendance_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attendances a
      WHERE a.id = attendance_members.attendance_id
        AND a.church_id = public.get_user_church_id()
    )
    AND public.get_user_role() IN (
      'church_admin','moderator','mutual_manager','dept_leader','scanner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attendances a
      WHERE a.id = attendance_members.attendance_id
        AND a.church_id = public.get_user_church_id()
    )
    AND public.get_user_role() IN (
      'church_admin','moderator','mutual_manager','dept_leader','scanner'
    )
  );

CREATE POLICY "members_view_attendance_members"
ON public.attendance_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.attendances a
      WHERE a.id = attendance_members.attendance_id
        AND a.church_id = public.get_user_church_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Garantir le rôle super_admin pour munokolive@gmail.com (idempotent)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'munokolive@gmail.com';
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_profiles (id, email, role)
    VALUES (v_uid, 'munokolive@gmail.com', 'super_admin')
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
END $$;
