-- Ajout du département principal pour les membres
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS primary_department TEXT DEFAULT NULL;
