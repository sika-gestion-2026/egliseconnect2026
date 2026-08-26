-- ============================================================
-- FIX DEFINITIF : Autoriser les church_admins à créer des cultes
-- ============================================================

-- Désactiver temporairement RLS sur church_services pour le débogage
-- et recréer des politiques qui fonctionnent vraiment

ALTER TABLE public.church_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_services ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes politiques conflictuelles
DROP POLICY IF EXISTS "Super admins can do anything on church_services" ON public.church_services;
DROP POLICY IF EXISTS "Church admins can manage their church_services" ON public.church_services;
DROP POLICY IF EXISTS "Members can view their church_services" ON public.church_services;

-- Recréer des politiques claires et correctes

-- 1. Les super admins peuvent tout faire
CREATE POLICY "super_admin_all_services"
ON public.church_services
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'super_admin'
)
WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'super_admin'
);

-- 2. Les church_admins peuvent tout faire sur les cultes de LEUR église
CREATE POLICY "church_admin_manage_services"
ON public.church_services
FOR ALL
TO authenticated
USING (
  church_id = (SELECT church_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  AND (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'church_admin'
)
WITH CHECK (
  church_id = (SELECT church_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  AND (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 'church_admin'
);

-- 3. Tous les membres peuvent voir les cultes de leur église
CREATE POLICY "members_view_services"
ON public.church_services
FOR SELECT
TO authenticated
USING (
  church_id = (SELECT church_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
);

-- Vérifier et corriger les rôles utilisateur si besoin
-- (s'assurer que les admins sont bien taggués 'church_admin')
