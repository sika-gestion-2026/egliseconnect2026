-- Migration: Church Announcements

-- IF NOT EXISTS : le fichier est rejouable (re-collage sûr, même partiel).
CREATE TABLE IF NOT EXISTS public.church_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    verses TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS Policies (recréées après suppression : rejouables)
ALTER TABLE public.church_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active announcements for their church" ON public.church_announcements;
CREATE POLICY "Anyone can view active announcements for their church"
ON public.church_announcements FOR SELECT
USING (
    is_active = true
);

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.church_announcements;
CREATE POLICY "Admins can manage announcements"
ON public.church_announcements FOR ALL TO authenticated
USING (
    church_id = public.get_user_church_id() AND public.get_user_role() IN ('church_admin', 'super_admin')
);

-- Helper trigger for updated_at
DROP TRIGGER IF EXISTS update_church_announcements_modtime ON public.church_announcements;
CREATE TRIGGER update_church_announcements_modtime
BEFORE UPDATE ON public.church_announcements
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
