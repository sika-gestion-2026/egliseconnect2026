-- ================================================================
-- MIGRATION DE RATTRAPAGE - Applique tout ce qui manque proprement
-- Compatible avec une DB qui a déjà church_services et les tables de base
-- ================================================================

-- ---------------------------------------------------------------
-- 1. TABLE church_services : ajouter colonne 'type' si manquante
-- ---------------------------------------------------------------
ALTER TABLE public.church_services ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE public.church_services ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Contrainte de type étendue
ALTER TABLE public.church_services DROP CONSTRAINT IF EXISTS church_services_type_check;
ALTER TABLE public.church_services ADD CONSTRAINT church_services_type_check 
  CHECK (type IN ('regular', 'special', 'seminar', 'meeting'));

-- ---------------------------------------------------------------
-- 2. TABLE service_declarations (RSVP)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.church_services(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service_id, member_id)
);
ALTER TABLE public.service_declarations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 3. TABLE service_assignments (Planning bénévoles)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.church_services(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'present', 'absent', 'replaced')),
    replacement_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(service_id, member_id, role)
);
ALTER TABLE public.service_assignments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 4. Helper function updated_at
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers updated_at (avec IF NOT EXISTS pour éviter duplicats)
DROP TRIGGER IF EXISTS update_service_declarations_modtime ON public.service_declarations;
CREATE TRIGGER update_service_declarations_modtime
  BEFORE UPDATE ON public.service_declarations
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_assignments_modtime ON public.service_assignments;
CREATE TRIGGER update_service_assignments_modtime
  BEFORE UPDATE ON public.service_assignments
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ---------------------------------------------------------------
-- 5. RLS church_services - Politiques corrigées définitivement
-- ---------------------------------------------------------------
ALTER TABLE public.church_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can do anything on church_services" ON public.church_services;
DROP POLICY IF EXISTS "Church admins can manage their church_services" ON public.church_services;
DROP POLICY IF EXISTS "Members can view their church_services" ON public.church_services;
DROP POLICY IF EXISTS "super_admin_all_services" ON public.church_services;
DROP POLICY IF EXISTS "church_admin_manage_services" ON public.church_services;
DROP POLICY IF EXISTS "members_view_services" ON public.church_services;

-- Super admins
CREATE POLICY "super_admin_all_services"
ON public.church_services FOR ALL TO authenticated
USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'super_admin'
)
WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'super_admin'
);

-- Church admins gèrent leurs cultes
CREATE POLICY "church_admin_manage_services"
ON public.church_services FOR ALL TO authenticated
USING (
  church_id = (SELECT church_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  AND (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'church_admin'
)
WITH CHECK (
  church_id = (SELECT church_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  AND (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'church_admin'
);

-- Tous les membres voient les cultes de leur église
CREATE POLICY "members_view_services"
ON public.church_services FOR SELECT TO authenticated
USING (
  church_id = (SELECT church_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
);

-- ---------------------------------------------------------------
-- 6. RLS service_declarations
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Super admins can do anything on service_declarations" ON public.service_declarations;
DROP POLICY IF EXISTS "Church admins can manage declarations" ON public.service_declarations;
DROP POLICY IF EXISTS "Members can manage their own declarations" ON public.service_declarations;

CREATE POLICY "super_admin_all_declarations"
ON public.service_declarations FOR ALL TO authenticated
USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'super_admin'
);

CREATE POLICY "church_admin_manage_declarations"
ON public.service_declarations FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.church_services cs
    WHERE cs.id = service_declarations.service_id
    AND cs.church_id = (SELECT church_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  )
  AND (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'church_admin'
);

CREATE POLICY "members_own_declarations"
ON public.service_declarations FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND up.member_id = service_declarations.member_id
  )
);

-- ---------------------------------------------------------------
-- 7. RLS service_assignments
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Super admins can do anything on service_assignments" ON public.service_assignments;
DROP POLICY IF EXISTS "Admins and leaders can manage assignments" ON public.service_assignments;
DROP POLICY IF EXISTS "Members can view assignments in their church" ON public.service_assignments;
DROP POLICY IF EXISTS "Members can update their own assignments status" ON public.service_assignments;

CREATE POLICY "super_admin_all_assignments"
ON public.service_assignments FOR ALL TO authenticated
USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'super_admin'
);

CREATE POLICY "admin_leader_manage_assignments"
ON public.service_assignments FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.church_services cs
    WHERE cs.id = service_assignments.service_id
    AND cs.church_id = (SELECT church_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  )
  AND (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) IN ('church_admin', 'dept_leader')
);

CREATE POLICY "members_view_church_assignments"
ON public.service_assignments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.church_services cs
    WHERE cs.id = service_assignments.service_id
    AND cs.church_id = (SELECT church_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  )
);

CREATE POLICY "members_update_own_assignments"
ON public.service_assignments FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND up.member_id = service_assignments.member_id
  )
);

-- ---------------------------------------------------------------
-- 8. TABLE member_notes (si manquante)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'pastoral', 'prayer', 'visit', 'alert')),
    is_private BOOLEAN NOT NULL DEFAULT false,
    service_id UUID REFERENCES public.church_services(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "church_admin_all_notes" ON public.member_notes;
DROP POLICY IF EXISTS "authors_manage_own_notes" ON public.member_notes;

CREATE POLICY "church_admin_all_notes"
ON public.member_notes FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = member_notes.member_id
    AND m.church_id = (SELECT church_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  )
  AND (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) IN ('church_admin', 'super_admin')
);

CREATE POLICY "authors_manage_own_notes"
ON public.member_notes FOR ALL TO authenticated
USING (author_id = auth.uid());

-- ---------------------------------------------------------------
-- 9. Colonne worship_days sur churches (si manquante)
-- ---------------------------------------------------------------
ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS worship_days JSONB DEFAULT '[]'::jsonb;

-- ---------------------------------------------------------------
-- 10. Marquer toutes les migrations précédentes comme appliquées
-- ---------------------------------------------------------------
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES 
  ('20260824150000', 'rsvp_system', ARRAY[]::text[]),
  ('20260824160000', 'special_events', ARRAY[]::text[]),
  ('20260824170000', 'schedule_settings', ARRAY[]::text[]),
  ('20260824180000', 'member_notes', ARRAY[]::text[]),
  ('20260824190000', 'edification', ARRAY[]::text[]),
  ('20260824200000', 'member_profile', ARRAY[]::text[]),
  ('20260824230000', 'fix_rls', ARRAY[]::text[]),
  ('20260824234500', 'fix_rls_2', ARRAY[]::text[]),
  ('20260825121000', 'more_fixes', ARRAY[]::text[]),
  ('20260826150000', 'volunteer_planning', ARRAY[]::text[]),
  ('20260826151500', 'planning_fix', ARRAY[]::text[]),
  ('20260826160000', 'fix_church_services_rls', ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;
