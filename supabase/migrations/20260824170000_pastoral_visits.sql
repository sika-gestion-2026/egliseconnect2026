-- Migration: Pastoral Visits

CREATE TABLE public.pastoral_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- Pastor or cell leader
    visit_date DATE,
    motif TEXT NOT NULL, -- "Maladie", "Absences Répétées", etc.
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
    report TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS Policies
ALTER TABLE public.pastoral_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view visits in their church"
ON public.pastoral_visits FOR SELECT
USING (church_id IN (
  SELECT church_id FROM public.user_profiles WHERE user_profiles.id = auth.uid()
));

CREATE POLICY "Users can insert visits in their church"
ON public.pastoral_visits FOR INSERT
WITH CHECK (church_id IN (
  SELECT church_id FROM public.user_profiles WHERE user_profiles.id = auth.uid()
));

CREATE POLICY "Users can update visits in their church"
ON public.pastoral_visits FOR UPDATE
USING (church_id IN (
  SELECT church_id FROM public.user_profiles WHERE user_profiles.id = auth.uid()
));
