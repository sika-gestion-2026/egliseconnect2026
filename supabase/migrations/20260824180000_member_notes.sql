-- Migration: Member Notes

CREATE TABLE public.member_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.church_services(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT,
    verses JSONB DEFAULT '[]'::jsonb, -- Array of { book: string, chapter: string, verse: string, text: string }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies disabled for custom member sessions
-- Security is handled by the server actions checking the member_session cookie.
ALTER TABLE public.member_notes DISABLE ROW LEVEL SECURITY;

-- Helper trigger for updated_at
CREATE TRIGGER update_member_notes_modtime
BEFORE UPDATE ON public.member_notes
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
