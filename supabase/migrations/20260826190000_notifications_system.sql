-- ================================================================
-- NOTIFICATIONS SYSTÈME + TABLE PROGRAMME OUVRIERS PUBLIC
-- ================================================================

-- 1. Table notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'assignment' CHECK (type IN ('assignment', 'removal', 'service_reminder', 'general')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_service_id UUID REFERENCES public.church_services(id) ON DELETE SET NULL,
  related_assignment_id UUID REFERENCES public.service_assignments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Membres voient leurs propres notifications
DROP POLICY IF EXISTS "members_see_own_notifications" ON public.notifications;
CREATE POLICY "members_see_own_notifications"
ON public.notifications FOR SELECT TO authenticated
USING (
  recipient_member_id = (SELECT member_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  OR (SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) IN ('church_admin', 'super_admin')
);

-- Admins peuvent créer des notifications
DROP POLICY IF EXISTS "admins_insert_notifications" ON public.notifications;
CREATE POLICY "admins_insert_notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  church_id = (SELECT church_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
);

-- Membres peuvent marquer leurs notifs comme lues
DROP POLICY IF EXISTS "members_update_own_notifications" ON public.notifications;
CREATE POLICY "members_update_own_notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (
  recipient_member_id = (SELECT member_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_member_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_church ON public.notifications(church_id, created_at DESC);

-- 2. Index sur service_assignments pour les queries de planning public
CREATE INDEX IF NOT EXISTS idx_service_assignments_service ON public.service_assignments(service_id);
CREATE INDEX IF NOT EXISTS idx_service_assignments_member ON public.service_assignments(member_id);
