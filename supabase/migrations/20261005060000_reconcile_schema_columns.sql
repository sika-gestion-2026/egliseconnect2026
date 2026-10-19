-- ============================================================================
-- Réconciliation du schéma : colonnes utilisées par le code mais absentes
-- des migrations.
--
-- CONSTAT
-- -------
-- La base de production a été pietonnée à la main (Éditeur SQL de Supabase)
-- pendant le développement, sans que chaque modification ait été reportée dans
-- un fichier de migration. Conséquence : `supabase/migrations/` ne décrit pas
-- fidèlement la base réelle. Une installation neuve à partir des seules
-- migrations produirait une application cassée, et il est impossible de
-- rejouer l'historique de façon fiable.
--
-- Exemples mesurés par `node scripts/check-schema-drift.cjs` :
--   - members.phone    : 58 occurrences dans le code, 0 dans les migrations
--   - members.quartier : 69 occurrences, 0 dans les migrations
--   - members.commune  : 42 occurrences, 0 dans les migrations
--   - churches.logo_url / custom_verse_text / custom_verse_ref : utilisées par
--     le module « Fil d'edification » et la page publique, non versionnées
--
-- `node scripts/check-schema-drift.cjs` reste dans le dépôt : il permet de
-- rejouer ce diagnostic à chaque évolution.
--
-- POURQUOI `IF NOT EXISTS`
-- ----------------------
-- Ces colonnes existent DÉJÀ en production. Cette migration doit donc être un
-- no-op sur la base actuelle, et une réparation sur une base neuve. C'est
-- exactement la garantie de `ADD COLUMN IF NOT EXISTS` : jamais d'échec, jamais
-- de perte de données, jamais de risque de casser l'application existante.
--
-- AUCUNE CONTRAINTE EST AJOUTÉE ICI
-- ---------------------------------
-- Volontairement. Ajouter un index unique ou un CHECK sur des données déjà
-- présentes en production risquerait d'échouer si des doublons ou des valeurs
-- hors bornes existent. Les index et contraintes sont traités dans une
-- migration séparée, à exécuter après avoir inspecté les données.
-- ============================================================================

-- --- members ----------------------------------------------------------------
-- `phone` : colonne d'authentification du membre (téléphone + code église) et
--           canal de contact du module Communications.
-- `commune` / `quartier` : segmentation géographique, utilisée par la carte
--           (GlobalMapComponent), le tableau de bord membre (« mon réseau »)
--           et le ciblage des campagnes SMS.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.members ADD COLUMN phone TEXT;
    COMMENT ON COLUMN public.members.phone IS
      'Téléphone du membre — utilisé par l''authentification téléphone + code église';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'commune'
  ) THEN
    ALTER TABLE public.members ADD COLUMN commune TEXT;
    COMMENT ON COLUMN public.members.commune IS
      'Commune de résidence — segmentation géographique (carte, réseau, ciblage)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'quartier'
  ) THEN
    ALTER TABLE public.members ADD COLUMN quartier TEXT;
    COMMENT ON COLUMN public.members.quartier IS
      'Quartier de résidence — segmentation géographique (carte, réseau, ciblage)';
  END IF;
END;
$$;

-- --- churches ---------------------------------------------------------------
-- `logo_url` : logo en filigrane sur le tableau de bord membre et favicon
--              dynamique du site public de l'église.
-- `custom_verse_text` / `custom_verse_ref` : verset personnalisé du fil
--              d'edification lorsque le mode « manuel » est sélectionné.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'churches' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.churches ADD COLUMN logo_url TEXT;
    COMMENT ON COLUMN public.churches.logo_url IS
      'Logo de l''église — filigrane du tableau de bord et favicon du site public';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'churches' AND column_name = 'custom_verse_text'
  ) THEN
    ALTER TABLE public.churches ADD COLUMN custom_verse_text TEXT;
    COMMENT ON COLUMN public.churches.custom_verse_text IS
      'Verset personnalisé du fil d''edification (mode manuel)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'churches' AND column_name = 'custom_verse_ref'
  ) THEN
    ALTER TABLE public.churches ADD COLUMN custom_verse_ref TEXT;
    COMMENT ON COLUMN public.churches.custom_verse_ref IS
      'Référence du verset personnalisé (ex. Matthieu 18:20)';
  END IF;
END;
$$;

-- --- Index de performance ---------------------------------------------------
-- Index non uniques, donc sans risque d'échec : en cas de doublons
-- préexistants en production, la création aboutit malgré tout. Ils suppriment
-- les scans séquentiels sur les colonnes les plus filtrées de l'application.
--
-- Volontairement absent : un index sur members(church_id). Il existe déjà sous
-- le nom `members_church_id_idx` (migration 20261005000000). Le recréer sous un
-- autre nom aurait produit un second index identique, payé à chaque INSERT et
-- UPDATE de `members` pour un gain nul.
--
-- La carte et le réseau filtrent par commune / quartier puis comparent le plus
-- souvent avec LOWER(TRIM(...)) côté application : l'index porte sur
-- l'expression, pour coller exactement au prédicat.
CREATE INDEX IF NOT EXISTS idx_members_church_commune_lower
  ON public.members (church_id, lower(btrim(commune)));

CREATE INDEX IF NOT EXISTS idx_members_church_quartier_lower
  ON public.members (church_id, lower(btrim(quartier)));

-- Tableau de bord membre et podium : « mes présences sur l'année en cours ».
CREATE INDEX IF NOT EXISTS idx_service_declarations_member_status
  ON public.service_declarations (member_id, status, created_at DESC);

-- Aucun index n'existait sur church_services, alors que le tableau de bord
-- membre filtre systématiquement par (church_id, service_date).
CREATE INDEX IF NOT EXISTS idx_services_church_date
  ON public.church_services (church_id, service_date);