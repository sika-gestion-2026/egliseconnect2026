-- ================================================================
-- DÉDUPLICATION : Supprimer les cultes en double (même jour, même heure)
-- Garde le plus récent (created_at le plus élevé), supprime les autres
-- ================================================================

-- 1. Supprimer les doublons : garder seulement 1 ligne par (church_id, service_date, service_time)
--    On garde celui avec le plus grand 'created_at' (le plus récent)
DELETE FROM public.church_services
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY church_id, service_date, service_time
        ORDER BY created_at DESC
      ) AS rn
    FROM public.church_services
  ) ranked
  WHERE rn > 1
);

-- 2. Ajouter une contrainte UNIQUE pour éviter les futurs doublons
ALTER TABLE public.church_services
  DROP CONSTRAINT IF EXISTS uq_church_service_date_time;

ALTER TABLE public.church_services
  ADD CONSTRAINT uq_church_service_date_time
  UNIQUE (church_id, service_date, service_time);
