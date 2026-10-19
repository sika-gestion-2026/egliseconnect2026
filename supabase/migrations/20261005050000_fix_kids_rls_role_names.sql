-- ============================================================================
-- Correction du rôle inexistant dans les policies du module « Enfants ».
--
-- La contrainte user_profiles_role_check n'autorise que :
--   super_admin, church_admin, moderator, mutual_manager, dept_leader,
--   scanner, member
--
-- La policy « Admins and leaders can manage checkins » testait pourtant
-- get_user_role() = 'department_leader' — une valeur qu'aucune ligne ne peut
-- contenir, puisque la contrainte la refuse à l'insertion comme à la mise à
-- jour. Cette branche de la policy était donc du code mort : un responsable de
-- département ('dept_leader') ne pouvait pointer ni récupérer un enfant, et le
-- symptôme observable était une erreur RLS incompréhensible pour l'utilisateur.
--
-- On aligne la policy sur le nom de rôle réellement utilisé partout ailleurs
-- dans l'application, et on élargit aux rôles qui pointent effectivement.
-- ============================================================================

DROP POLICY IF EXISTS "Admins and leaders can manage checkins" ON public.kids_checkins;

CREATE POLICY "Admins and leaders can manage checkins" ON public.kids_checkins
  FOR ALL TO authenticated
  USING (
    service_id IN (
      SELECT id FROM public.church_services
      WHERE church_id = public.get_user_church_id()
    )
    AND public.get_user_role() IN ('church_admin', 'moderator', 'dept_leader', 'scanner')
  )
  WITH CHECK (
    service_id IN (
      SELECT id FROM public.church_services
      WHERE church_id = public.get_user_church_id()
    )
    AND public.get_user_role() IN ('church_admin', 'moderator', 'dept_leader', 'scanner')
  );

-- Même rectification pour `kids` : seul church_admin avait le pilotage, alors
-- que moderator gère déjà le reste du contenu de l'église.
DROP POLICY IF EXISTS "Admins can manage kids in their church" ON public.kids;

CREATE POLICY "Admins can manage kids in their church" ON public.kids
  FOR ALL TO authenticated
  USING (
    parent_id IN (
      SELECT id FROM public.members WHERE church_id = public.get_user_church_id()
    )
    AND public.get_user_role() IN ('church_admin', 'moderator')
  )
  WITH CHECK (
    parent_id IN (
      SELECT id FROM public.members WHERE church_id = public.get_user_church_id()
    )
    AND public.get_user_role() IN ('church_admin', 'moderator')
  );

-- La policy « Members can manage their own kids » authorize un fidèle à écrire
-- SES enfants, ce qui est le comportement attendu, mais elle référence
-- members.auth_id. On vérifie que cette colonne existe : si elle a disparu,
-- la policy lèverait une erreur à chaque évaluation.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'auth_id'
  ) THEN
    RAISE NOTICE 'members.auth_id absent : la policyMembers can manage their own kids doit être réécrite avec user_profiles.member_id';
  END IF;
END;
$$;