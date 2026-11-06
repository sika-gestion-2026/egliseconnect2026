-- Bouclier base, applicable sans changer le comportement des écrans déjà en ligne.
-- Les fonctions encore appelées par l'application publique ne sont pas retirées ici.

ALTER FUNCTION public.check_church_finance_balance() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_old_backups() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_moderator_profile(uuid, text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_member_secure(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_church_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_audit_action(text, jsonb, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.normalize_phone(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;

ALTER VIEW public.church_stats SET (security_invoker = true);
ALTER VIEW public.church_finance_balance SET (security_invoker = true);

REVOKE ALL ON FUNCTION public.cleanup_old_backups() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_backups() TO service_role;

REVOKE ALL ON FUNCTION public.create_moderator_profile(uuid, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_church_finance_balance() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit_action(text, jsonb, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;

-- Un collaborateur ajouté par le pasteur devenait administrateur de l'église,
-- donc aussi de la caisse. Il reste modérateur : l'encadrement oui, la caisse non.
CREATE OR REPLACE FUNCTION public.create_moderator_profile(moderator_id uuid, moderator_email text, target_church_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'church_admin' AND church_id = target_church_id
  ) THEN
    INSERT INTO public.user_profiles (id, email, role, church_id)
    VALUES (moderator_id, moderator_email, 'moderator', target_church_id)
    ON CONFLICT (id) DO UPDATE
    SET role = 'moderator', church_id = target_church_id, email = EXCLUDED.email;
  ELSE
    RAISE EXCEPTION 'Non autorisé : vous devez être administrateur de cette église.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_moderator_profile(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_moderator_profile(uuid, text, uuid) TO authenticated, service_role;
