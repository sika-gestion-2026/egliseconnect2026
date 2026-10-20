-- Migration: Backup & Restore System with 2-day recovery window
-- Exclusively accessible to super_admin

CREATE TABLE IF NOT EXISTS public.system_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    backup_type TEXT DEFAULT 'auto' CHECK (backup_type IN ('auto', 'manual')),
    description TEXT,
    snapshot_date DATE DEFAULT CURRENT_DATE NOT NULL,
    data_payload JSONB NOT NULL,
    total_churches INT DEFAULT 0,
    total_members INT DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index pour recherche rapide et purge automatique
CREATE INDEX IF NOT EXISTS idx_system_backups_created_at ON public.system_backups (created_at DESC);

-- Enable RLS
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

-- Super admin only policy
DROP POLICY IF EXISTS "Super admin can manage backups" ON public.system_backups;
CREATE POLICY "Super admin can manage backups"
ON public.system_backups
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
);

-- Function to prune backups older than 7 days (keeping rolling window, with focus on 48h restore)
CREATE OR REPLACE FUNCTION public.cleanup_old_backups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.system_backups
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;
