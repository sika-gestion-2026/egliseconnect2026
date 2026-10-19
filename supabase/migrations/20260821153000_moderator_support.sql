CREATE OR REPLACE FUNCTION public.create_moderator_profile(moderator_id UUID, moderator_email TEXT, target_church_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Vérifier que l'exécuteur est un admin (church_admin) de cette église
  IF EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'church_admin' AND church_id = target_church_id
  ) THEN
    -- Mettre à jour ou insérer le profil du modérateur
    INSERT INTO public.user_profiles (id, email, role, church_id)
    VALUES (moderator_id, moderator_email, 'church_admin', target_church_id)
    ON CONFLICT (id) DO UPDATE
    SET role = 'church_admin', church_id = target_church_id;
  ELSE
    RAISE EXCEPTION 'Non autorisé : vous devez être administrateur de cette église.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- S'assurer qu'un utilisateur peut mettre à jour son propre profil pour s'associer à une église
DROP POLICY IF EXISTS "Users can update their own profile to link to a church" ON public.user_profiles;
CREATE POLICY "Users can update their own profile to link to a church" ON public.user_profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Correction RLS : Permettre à tout utilisateur connecté de rechercher les églises par code pour les rejoindre
DROP POLICY IF EXISTS "Church admins and members can view their own church" ON public.churches;
DROP POLICY IF EXISTS "Any authenticated user can view churches" ON public.churches;
CREATE POLICY "Any authenticated user can view churches" ON public.churches
FOR SELECT TO authenticated
USING (true);
