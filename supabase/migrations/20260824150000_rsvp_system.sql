-- Create Church Services table
CREATE TABLE public.church_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    service_date DATE NOT NULL,
    service_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create Service Declarations (RSVP) table
CREATE TABLE public.service_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.church_services(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service_id, member_id)
);

-- Enable RLS
ALTER TABLE public.church_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_declarations ENABLE ROW LEVEL SECURITY;

-- Policies for church_services
CREATE POLICY "Super admins can do anything on church_services" ON public.church_services FOR ALL TO authenticated USING (public.get_user_role() = 'super_admin');
CREATE POLICY "Church admins can manage their church_services" ON public.church_services FOR ALL TO authenticated USING (church_id = public.get_user_church_id() AND public.get_user_role() = 'church_admin');
CREATE POLICY "Members can view their church_services" ON public.church_services FOR SELECT TO authenticated USING (church_id = public.get_user_church_id());

-- Policies for service_declarations
CREATE POLICY "Super admins can do anything on service_declarations" ON public.service_declarations FOR ALL TO authenticated USING (public.get_user_role() = 'super_admin');

-- Admins can view and manage declarations for their church's services
CREATE POLICY "Church admins can manage declarations" ON public.service_declarations FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.church_services cs 
        WHERE cs.id = service_declarations.service_id 
        AND cs.church_id = public.get_user_church_id()
    ) 
    AND public.get_user_role() = 'church_admin'
);

-- Members can manage their own declarations
CREATE POLICY "Members can manage their own declarations" ON public.service_declarations FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() 
        AND up.member_id = service_declarations.member_id
    )
);

-- Helper function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_service_declarations_modtime
BEFORE UPDATE ON public.service_declarations
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
