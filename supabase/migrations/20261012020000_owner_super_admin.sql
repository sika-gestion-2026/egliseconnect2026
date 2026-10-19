-- ============================================================================
-- Compte propriétaire = super administrateur (passe-partout)
-- ============================================================================
-- Le compte munokolive@gmail.com est le compte PROPRIÉTAIRE de la plateforme.
-- Il doit avoir le rôle `super_admin`, qui lui donne accès à TOUTES les églises
-- (c'est le rôle reconnu par l'ensemble des politiques RLS et par les pages
-- /super-admin).
--
-- Cette migration GARANTIT ce rôle, de façon idempotente. Elle ne crée AUCUN
-- compte : elle ne promeut que si l'utilisateur existe déjà dans auth.users
-- (créé au préalable par l'inscription). Si le compte est absent, elle se
-- contente d'un message et ne fait rien.
--
-- SÉCURITÉ — À LIRE
-- -----------------
-- Le seul risque associé à ce fonctionnement est qu'un TIERS réussisse à
-- s'inscrire avec cette adresse email. C'est impossible tant que le compte
-- existe (Supabase refuse un email déjà enregistré). Pour verrouiller
-- définitivement :
--   · activer la confirmation par email dans Supabase → Authentication ;
--   · définir un mot de passe fort sur ce compte ;
--   · ne jamais le supprimer (sinon l'adresse redeviendrait réclamable).
-- ============================================================================

DO $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid
    FROM auth.users
   WHERE lower(email) = 'munokolive@gmail.com';

  IF v_uid IS NULL THEN
    RAISE NOTICE '[owner] Aucun compte auth.users pour munokolive@gmail.com — créer le compte, puis rejouer cette migration.';
  ELSE
    INSERT INTO public.user_profiles (id, email, role)
    VALUES (v_uid, 'munokolive@gmail.com', 'super_admin')
    ON CONFLICT (id) DO UPDATE
      SET role = 'super_admin';

    RAISE NOTICE '[owner] Rôle super_admin garanti pour munokolive@gmail.com (%)', v_uid;
  END IF;
END $$;
