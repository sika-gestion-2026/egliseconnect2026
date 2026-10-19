-- ============================================================================
-- RLS pour attendances et attendance_members
-- ============================================================================
-- POURQUOI CETTE MIGRATION
-- -----------------------
-- `attendances` et `attendance_members` ont RLS ACTIVÉ (schema initial), mais
-- AUCUNE politique n'a jamais été créée. Or RLS est « deny-all » par défaut :
-- avec le client standard (session authentifiée), personne ne pouvait lire ni
-- écrire ces tables. Le tableau de bord de pointage et le « radar des absents »
-- étaient donc silencieusement vides, sans le moindre message d'erreur.
--
-- Elle reprend à l'identique les politiques de
-- `20261011000000_attendance_rls_super_admin.sql`, en retirant l'attribution
-- automatique du rôle super_admin à une adresse email codée en dur — ce
-- backdoor a été volontairement supprimé par la migration
-- `20261005020000_remove_email_super_admin_trigger.sql`.
--
-- Idempotente : les politiques sont recréées après suppression.
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
-- 2. attendance_members (table de jointure : pas de church_id propre, la portée
--    passe par attendances.church_id)
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
