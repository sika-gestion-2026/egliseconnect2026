-- Create finances table
CREATE TABLE public.church_finances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    motif TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.church_finances ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Super admins can do anything on finances" ON public.church_finances 
FOR ALL TO authenticated USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Church admins can manage finances in their church" ON public.church_finances 
FOR ALL TO authenticated USING (
    church_id = public.get_user_church_id() AND 
    public.get_user_role() = 'church_admin'
);
