-- Drop the existing check constraint on type
ALTER TABLE public.church_services DROP CONSTRAINT IF EXISTS church_services_type_check;

-- Add the new check constraint with seminar and meeting
ALTER TABLE public.church_services ADD CONSTRAINT church_services_type_check CHECK (type IN ('regular', 'special', 'seminar', 'meeting'));

-- Create the service_assignments table for Volunteer Planning
CREATE TABLE public.service_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.church_services(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'present', 'absent', 'replaced')),
    replacement_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(service_id, member_id, role)
);

-- Enable RLS
ALTER TABLE public.service_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for service_assignments
-- Super admins can do anything
CREATE POLICY "Super admins can do anything on service_assignments" ON public.service_assignments FOR ALL TO authenticated USING (public.get_user_role() = 'super_admin');

-- Church admins and dept leaders can manage assignments for their church's services
CREATE POLICY "Admins and leaders can manage assignments" ON public.service_assignments FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.church_services cs 
        WHERE cs.id = service_assignments.service_id 
        AND cs.church_id = public.get_user_church_id()
    ) 
    AND public.get_user_role() IN ('church_admin', 'dept_leader')
);

-- Members can view their own assignments and others in their church
CREATE POLICY "Members can view assignments in their church" ON public.service_assignments FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.church_services cs 
        WHERE cs.id = service_assignments.service_id 
        AND cs.church_id = public.get_user_church_id()
    ) 
);

-- Members can update their own assignments status
CREATE POLICY "Members can update their own assignments status" ON public.service_assignments FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() 
        AND (up.member_id = service_assignments.member_id)
    )
);

-- Trigger to automatically update updated_at
CREATE TRIGGER update_service_assignments_modtime
BEFORE UPDATE ON public.service_assignments
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
