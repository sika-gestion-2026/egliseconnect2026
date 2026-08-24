-- Migration: Church Announcements

CREATE TABLE public.church_announcements (
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

-- RLS Policies
ALTER TABLE public.church_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active announcements for their church"
ON public.church_announcements FOR SELECT
USING (
    is_active = true
);

CREATE POLICY "Admins can manage announcements"
ON public.church_announcements FOR ALL TO authenticated
USING (
    church_id = public.get_user_church_id() AND public.get_user_role() IN ('church_admin', 'super_admin')
);

-- Helper trigger for updated_at
CREATE TRIGGER update_church_announcements_modtime
BEFORE UPDATE ON public.church_announcements
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
