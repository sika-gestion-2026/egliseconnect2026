-- Add 'type' column to church_services
ALTER TABLE public.church_services 
ADD COLUMN type TEXT DEFAULT 'regular' CHECK (type IN ('regular', 'special'));
