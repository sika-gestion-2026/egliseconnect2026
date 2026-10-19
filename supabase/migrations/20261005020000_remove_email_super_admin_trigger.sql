-- ============================================================================
-- Suppression de l'attribution automatique de super_admin fondée sur un email.
--
-- Le trigger précédent accordait le rôle 'super_admin' à toute inscription
-- provenant de l'adresse 'munokolive@gmail.com'. Si l'inscription publique est
-- ouverte et la confirmation email désactivée, un tiers pouvait créer ce compte
-- et obtenir les pleins pouvoirs sur la plateforme.
--
-- Nouveau comportement : tout nouvel utilisateur reçoit le rôle 'member'.
-- L'élévation vers 'church_admin' ou 'super_admin' se fait uniquement via le
-- back-office, depuis un compte existant et authentifié.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (new.id, new.email, 'member')
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;