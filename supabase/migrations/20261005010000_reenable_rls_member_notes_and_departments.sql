-- ============================================================================
-- Réactivation de la RLS sur les tables qui l'avaient perdue.
--
-- Problème : member_notes, church_departments et department_leaders avaient
-- `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`. Avec la clé publique (anon),
-- n'importe quel utilisateur authentifié pouvait lire, modifier ou supprimer
-- les notes pastorales de tous les membres, créer des départements et
-- s'attribuer le rôle de responsable — via l'API REST directement.
--
-- Ce script :
--   1. réactive la RLS
--   2. supprime les policies trop larges (USING (true))
--   3. crée des policies scopées sur l'église du membre connecté
--
-- IMPORTANT : exécuter ce fichier UNE SEULE FOIS. Les policies sont recréées
-- de façon idempotente (DROP ... IF EXISTS puis CREATE).
-- ============================================================================

-- ============================================================================
-- 1. Notes pastorales
-- ============================================================================
ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_notes_select_own ON public.member_notes;
DROP POLICY IF EXISTS member_notes_admin_all ON public.member_notes;

-- Un membre peut lire ses propres notes ; un responsable de sa église, toutes
-- les notes de cette église.
CREATE POLICY member_notes_select_own ON public.member_notes
  FOR SELECT
  USING (
    member_id = (
      SELECT up.member_id
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.churches c ON c.id = up.church_id
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'church_admin', 'moderator')
        AND c.id = member_notes.church_id
    )
  );

-- Écriture réservée aux rôles d'encadrement, dans la limite de leur église.
CREATE POLICY member_notes_admin_all ON public.member_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'church_admin', 'moderator')
        AND up.church_id = member_notes.church_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'church_admin', 'moderator')
        AND up.church_id = member_notes.church_id
    )
  );

-- ============================================================================
-- 2. Départements
-- ============================================================================
ALTER TABLE public.church_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS church_departments_read ON public.church_departments;
DROP POLICY IF EXISTS church_departments_write ON public.church_departments;

CREATE POLICY church_departments_read ON public.church_departments
  FOR SELECT
  USING (
    church_id = (
      SELECT up.church_id FROM public.user_profiles up WHERE up.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

CREATE POLICY church_departments_write ON public.church_departments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'church_admin', 'moderator')
        AND up.church_id = church_departments.church_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'church_admin', 'moderator')
        AND up.church_id = church_departments.church_id
    )
  );

-- ============================================================================
-- 3. Responsables de département
-- ============================================================================
ALTER TABLE public.department_leaders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS department_leaders_read ON public.department_leaders;
DROP POLICY IF EXISTS department_leaders_write ON public.department_leaders;

CREATE POLICY department_leaders_read ON public.department_leaders
  FOR SELECT
  USING (
    -- Un responsable voit les départements qu'il dirige.
    member_id = (
      SELECT up.member_id FROM public.user_profiles up WHERE up.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.church_departments d ON d.id = department_leaders.department_id
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'church_admin', 'moderator')
        AND d.church_id = up.church_id
    )
  );

CREATE POLICY department_leaders_write ON public.department_leaders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.church_departments d ON d.id = department_leaders.department_id
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'church_admin', 'moderator')
        AND d.church_id = up.church_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.church_departments d ON d.id = department_leaders.department_id
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'church_admin', 'moderator')
        AND d.church_id = up.church_id
    )
  );