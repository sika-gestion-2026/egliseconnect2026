-- Création de la fonction de purge des notes (Limite de 10 notes par membre)
CREATE OR REPLACE FUNCTION public.purge_old_notes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Garde uniquement les 10 notes les plus récentes pour chaque membre
  DELETE FROM public.member_notes
  WHERE id NOT IN (
      SELECT id
      FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY member_id ORDER BY created_at DESC) as rk
          FROM public.member_notes
      ) t
      WHERE t.rk <= 10
  );
END;
$$;
