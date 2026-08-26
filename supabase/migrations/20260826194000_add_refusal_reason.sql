-- Migration to add refusal_reason to service_assignments
ALTER TABLE public.service_assignments
ADD COLUMN IF NOT EXISTS refusal_reason text;
