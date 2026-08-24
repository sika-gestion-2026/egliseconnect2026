-- Enable RLS
ALTER TABLE public.church_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_declarations ENABLE ROW LEVEL SECURITY;

-- Policies for church_services
DROP POLICY IF EXISTS "Super admins can do anything on church_services" ON public.church_services;
CREATE POLICY "Super admins can do anything on church_services" ON public.church_services FOR ALL TO authenticated USING (public.get_user_role() = 'super_admin') WITH CHECK (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Church admins can manage their church_services" ON public.church_services;
CREATE POLICY "Church admins can manage their church_services" ON public.church_services FOR ALL TO authenticated USING (church_id = public.get_user_church_id() AND public.get_user_role() = 'church_admin') WITH CHECK (church_id = public.get_user_church_id() AND public.get_user_role() = 'church_admin');

DROP POLICY IF EXISTS "Members can view their church_services" ON public.church_services;
CREATE POLICY "Members can view their church_services" ON public.church_services FOR SELECT TO authenticated USING (church_id = public.get_user_church_id());

-- Policies for service_declarations
DROP POLICY IF EXISTS "Super admins can do anything on service_declarations" ON public.service_declarations;
CREATE POLICY "Super admins can do anything on service_declarations" ON public.service_declarations FOR ALL TO authenticated USING (public.get_user_role() = 'super_admin') WITH CHECK (public.get_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Church admins can manage declarations" ON public.service_declarations;
CREATE POLICY "Church admins can manage declarations" ON public.service_declarations FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.church_services cs 
        WHERE cs.id = service_declarations.service_id 
        AND cs.church_id = public.get_user_church_id()
    ) 
    AND public.get_user_role() = 'church_admin'
);

DROP POLICY IF EXISTS "Members can manage their own declarations" ON public.service_declarations;
CREATE POLICY "Members can manage their own declarations" ON public.service_declarations FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() 
        AND up.member_id = service_declarations.member_id
    )
);
