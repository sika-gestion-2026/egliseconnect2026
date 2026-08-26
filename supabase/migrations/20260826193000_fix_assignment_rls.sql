-- Fix RLS policy for service_assignments to ensure proper outer scoping
DROP POLICY IF EXISTS "Admins can see all assignments" ON public.service_assignments;

CREATE POLICY "Admins can see all assignments" ON public.service_assignments FOR SELECT TO authenticated USING (
    (SELECT church_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 
    (SELECT church_id FROM public.church_services WHERE public.church_services.id = public.service_assignments.service_id)
);

DROP POLICY IF EXISTS "Public planning access for members" ON public.service_assignments;

CREATE POLICY "Public planning access for members" ON public.service_assignments FOR SELECT TO authenticated USING (
    (SELECT church_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1) = 
    (SELECT church_id FROM public.church_services WHERE public.church_services.id = public.service_assignments.service_id)
);
