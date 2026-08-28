-- ================================================================
-- OPTIMISATION DES TABLES NEUTRES / SYSTÈME
-- ================================================================

-- 1. Verrouillage strict de audit_logs et fonction d'insertion
-- S'assurer qu'aucune politique ne permet la modification directe depuis l'API
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_update" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete" ON public.audit_logs;

-- Fonction sécurisée pour insérer un log d'audit
-- S'exécute avec les privilèges de l'admin (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_audit_action(
    p_action_type TEXT,
    p_details JSONB,
    p_church_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, church_id, action_type, details)
    VALUES (auth.uid(), p_church_id, p_action_type, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Nettoyage automatique des données (Rétention)
-- On utilise pg_cron s'il est disponible pour supprimer les vieilles données.
-- Note: L'extension pg_cron doit être activée dans Supabase (Database > Extensions)

DO $$
BEGIN
    -- On vérifie si pg_cron est installé sur la base de données
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        
        -- Nettoyage des logs d'audit (plus vieux que 90 jours) tous les jours à 02h00
        -- On supprime l'ancien job s'il existe déjà pour éviter les doublons
        PERFORM cron.unschedule('cleanup_old_audit_logs');
        PERFORM cron.schedule(
            'cleanup_old_audit_logs', 
            '0 2 * * *', 
            'DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL ''90 days'';'
        );
        
        -- Nettoyage des notifications (plus vieilles que 90 jours) tous les jours à 02h30
        PERFORM cron.unschedule('cleanup_old_notifications');
        PERFORM cron.schedule(
            'cleanup_old_notifications', 
            '30 2 * * *', 
            'DELETE FROM public.notifications WHERE created_at < NOW() - INTERVAL ''90 days'';'
        );
        
    END IF;
END $$;
