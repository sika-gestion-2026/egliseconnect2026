CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent voir les logs de leur église
CREATE POLICY "Admins can view audit logs" 
    ON public.audit_logs FOR SELECT 
    USING (
        church_id IN (
            SELECT church_id FROM public.user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND (user_profiles.role = 'church_admin' OR user_profiles.role = 'super_admin')
        )
    );

-- L'insertion est faite par le backend (Service Role) ou par les profils connectés
CREATE POLICY "Users can insert audit logs" 
    ON public.audit_logs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
