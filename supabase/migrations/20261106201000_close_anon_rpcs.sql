-- À appliquer seulement après le déploiement du code qui n'appelle plus ces RPC
-- avec la clé publique.

REVOKE ALL ON FUNCTION public.auto_confirm_pastor(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_pastor_email_exists(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_pastor_to_church(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_member_profile_secure(uuid, uuid, text, text, text, text, date, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_member_secure(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.auto_confirm_pastor(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_pastor_email_exists(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.link_pastor_to_church(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_member_profile_secure(uuid, uuid, text, text, text, text, date, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_member_secure(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_member_secure(p_member_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member public.members%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_member
  FROM public.members
  WHERE id = p_member_id
  LIMIT 1;

  IF v_member.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF public.get_user_role() = 'super_admin'
     OR v_member.church_id = public.get_user_church_id() THEN
    RETURN row_to_json(v_member);
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_member_secure(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_secure(uuid) TO service_role;
