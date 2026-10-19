-- ============================================================================
-- Mur de prière persistant.
--
-- Le composant PrayerWall utilisait un tableau local codé en dur : les demandes
-- n'étaient ni partagées entre membres, ni persistées, et disparaissaient au
-- rechargement. Les membres pensaient voir un vrai mur communautaire.
--
-- Cette migration crée la table réelle, avec RLS activée d'emblée.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  author_name TEXT,                          -- NULL = anonyme
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 2 AND 1000),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  prayer_count INTEGER NOT NULL DEFAULT 0 CHECK (prayer_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un membre ne peut pas specifier deux fois la même demande.
  CONSTRAINT prayer_requests_member_unique UNIQUE (member_id, content)
);

CREATE INDEX IF NOT EXISTS prayer_requests_church_created_idx
  ON public.prayer_requests (church_id, created_at DESC);

-- --- RLS ------------------------------------------------------------------
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prayer_requests_read ON public.prayer_requests;
DROP POLICY IF EXISTS prayer_requests_insert ON public.prayer_requests;
DROP POLICY IF EXISTS prayer_requests_update_count ON public.prayer_requests;
DROP POLICY IF EXISTS prayer_requests_delete_own ON public.prayer_requests;

-- Les grants PostgREST par défaut (`authenticated` a tous les droits sur une
-- nouvelle table) seraient Idle in Transaction : les politiques RLS ignorées,
-- la table resterait muette sans aucune erreur visible. On retire donc UPDATE
-- au rôle, et on ne laisse passer l'incrément que par la RPC SECURITY DEFINER.
REVOKE UPDATE ON public.prayer_requests FROM authenticated;

-- Lecture : tous les membres de l'église voient le mur.
CREATE POLICY prayer_requests_read ON public.prayer_requests
  FOR SELECT
  USING (
    church_id = (
      SELECT up.church_id FROM public.user_profiles up WHERE up.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- Écriture : membre de l'église uniquement, et uniquement pour son église.
CREATE POLICY prayer_requests_insert ON public.prayer_requests
  FOR INSERT
  WITH CHECK (
    church_id = (
      SELECT up.church_id FROM public.user_profiles up WHERE up.id = auth.uid()
    )
  );

-- Réservé : cette policy ne sert qu'à titre de filet si le GRANT UPDATE était
-- réaccordé plus tard. Elle autorise un UPDATE dans le périmètre de l'église,
-- mais ne restreint PAS les colonnes — un rôle write pourrait alors réécrire
-- le texte d'autrui. C'est pourquoi le REVOKE UPDATE ci-dessus est la vraie
-- protection, et non cette policy. L'unique voie d'écriture reste la RPC.
CREATE POLICY prayer_requests_update_count ON public.prayer_requests
  FOR UPDATE
  USING (
    church_id = (
      SELECT up.church_id FROM public.user_profiles up WHERE up.id = auth.uid()
    )
  )
  WITH CHECK (
    church_id = (
      SELECT up.church_id FROM public.user_profiles up WHERE up.id = auth.uid()
    )
  );

-- Identité de l'auteur, résolue côté serveur.
--
-- Le client envoyait member_id et author_name dans le corps de la requête :
-- n'importe quel membre pouvait donc publier sous le nom d'un autre, ou se
-- faire passer pour un compte dont il n'est pas l'auteur (puis supprimer la
-- demande, la policy delete_own comparant sur member_id).
--
-- Ce trigger écrase ces deux colonnes avec la valeur issue de user_profiles
-- et de la table members. Le client n'a plus rien à fournir.
CREATE OR REPLACE FUNCTION public.prayer_requests_stamp_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_church UUID;
  v_member_id      UUID;
  v_first_name     TEXT;
  v_last_name      TEXT;
BEGIN
  SELECT up.church_id, up.member_id
    INTO v_profile_church, v_member_id
    FROM public.user_profiles up
   WHERE up.id = auth.uid();

  -- Aucun profil reconnu : on refuse la ligne plutôt que d'attribuer
  -- la demande à un auteur arbitraire.
  IF v_profile_church IS NULL THEN
    RAISE EXCEPTION 'profil introuvable pour l''utilisateur courant'
      USING ERRCODE = '42501';
  END IF;

  -- L'église est également imposée : un client ne peut pas publier dans le
  -- mur d'une autre église en fournissant un autre church_id.
  NEW.church_id := v_profile_church;
  NEW.member_id  := v_member_id;

  IF v_member_id IS NOT NULL THEN
    SELECT m.first_name, m.last_name
      INTO v_first_name, v_last_name
      FROM public.members m
     WHERE m.id = v_member_id;
  END IF;

  IF NEW.is_anonymous THEN
    NEW.author_name := NULL;
  ELSE
    NEW.author_name := NULLIF(
      trim(coalesce(v_first_name, '') || ' ' || coalesce(v_last_name, '')),
      ''
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prayer_requests_stamp_author ON public.prayer_requests;
CREATE TRIGGER prayer_requests_stamp_author
  BEFORE INSERT ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.prayer_requests_stamp_author();

-- Incrément atomique du compteur de prières.
-- Passé par une RPC SECURITY DEFINER pour éviter un client qui écrit
-- directement prayer_count (read-modify-write sur l'ancien compteur).
CREATE OR REPLACE FUNCTION public.increment_prayer_count(p_request_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.prayer_requests
     SET prayer_count = prayer_count + 1
   WHERE id = p_request_id
     AND (
       church_id = (
         SELECT up.church_id FROM public.user_profiles up WHERE up.id = auth.uid()
       )
       OR EXISTS (
         SELECT 1 FROM public.user_profiles up
         WHERE up.id = auth.uid() AND up.role = 'super_admin'
       )
     )
  RETURNING prayer_count INTO v_count;

  RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_prayer_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_prayer_count(UUID) TO authenticated;

-- Suppression : son propre message, ou un responsable de l'église.
CREATE POLICY prayer_requests_delete_own ON public.prayer_requests
  FOR DELETE
  USING (
    member_id = (
      SELECT up.member_id FROM public.user_profiles up WHERE up.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'church_admin', 'moderator')
        AND up.church_id = prayer_requests.church_id
    )
  );