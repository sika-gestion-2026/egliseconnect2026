-- Ajout des colonnes pour la gestion du Flux d'Édification (Verset de la Semaine)

ALTER TABLE public.churches
ADD COLUMN IF NOT EXISTS edification_mode TEXT DEFAULT 'auto' CHECK (edification_mode IN ('auto', 'manual')),
ADD COLUMN IF NOT EXISTS custom_verse_text TEXT,
ADD COLUMN IF NOT EXISTS custom_verse_ref TEXT;
