-- Kids table
CREATE TABLE IF NOT EXISTS kids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES members(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    allergies TEXT,
    medical_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Check-ins table
CREATE TABLE IF NOT EXISTS kids_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kid_id UUID REFERENCES kids(id) ON DELETE CASCADE,
    service_id UUID REFERENCES church_services(id) ON DELETE CASCADE,
    security_code TEXT NOT NULL,
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    checked_out_at TIMESTAMP WITH TIME ZONE,
    checked_in_by UUID REFERENCES members(id), -- the person who did the checkin (e.g., monitor)
    checked_out_by UUID REFERENCES members(id)
);

-- Enable RLS
ALTER TABLE kids ENABLE ROW LEVEL SECURITY;
ALTER TABLE kids_checkins ENABLE ROW LEVEL SECURITY;

-- RLS for Kids
CREATE POLICY "Super admins can do anything on kids" ON public.kids FOR ALL TO authenticated USING (public.get_user_role() = 'super_admin');
CREATE POLICY "Admins can manage kids in their church" ON public.kids FOR ALL TO authenticated USING (
    parent_id IN (SELECT id FROM public.members WHERE church_id = public.get_user_church_id()) AND public.get_user_role() = 'church_admin'
);
CREATE POLICY "Members can manage their own kids" ON public.kids FOR ALL TO authenticated USING (
    parent_id IN (SELECT id FROM public.members WHERE auth_id = auth.uid())
);
CREATE POLICY "Members can view kids in their church" ON public.kids FOR SELECT TO authenticated USING (
    parent_id IN (SELECT id FROM public.members WHERE church_id = public.get_user_church_id())
);

-- RLS for Kids Check-ins
CREATE POLICY "Super admins can do anything on kids_checkins" ON public.kids_checkins FOR ALL TO authenticated USING (public.get_user_role() = 'super_admin');
CREATE POLICY "Admins and leaders can manage checkins" ON public.kids_checkins FOR ALL TO authenticated USING (
    service_id IN (SELECT id FROM public.church_services WHERE church_id = public.get_user_church_id()) 
    AND (public.get_user_role() = 'church_admin' OR public.get_user_role() = 'department_leader')
);
CREATE POLICY "Members can view their kids checkins" ON public.kids_checkins FOR SELECT TO authenticated USING (
    kid_id IN (SELECT id FROM public.kids WHERE parent_id IN (SELECT id FROM public.members WHERE auth_id = auth.uid()))
);

