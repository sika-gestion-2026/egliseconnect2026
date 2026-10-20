-- Ajout de la couleur du thème personnalisée et des paramètres d'église persistants
ALTER TABLE public.churches 
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT NULL;
