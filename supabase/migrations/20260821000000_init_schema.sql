-- Create churches table
CREATE TABLE public.churches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(5) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    city TEXT,
    worship_days JSONB DEFAULT '[]'::jsonb,
    leader_title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended'))
);

-- Extended users profile (linked to auth.users)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'church_admin', 'member')),
    church_id UUID REFERENCES public.churches(id) ON DELETE SET NULL,
    member_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members table
CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date DATE,
    photo_url TEXT,
    profession TEXT,
    address TEXT,
    status TEXT DEFAULT 'visitor' CHECK (status IN ('member', 'visitor')),
    functions JSONB DEFAULT '[]'::jsonb,
    arrival_date DATE,
    invited_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
    pastoral_notes TEXT,
    needs_support BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add member_id constraint
ALTER TABLE public.user_profiles
ADD CONSTRAINT fk_user_member FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;

-- Attendances
CREATE TABLE public.attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance members (join table)
CREATE TABLE public.attendance_members (
    attendance_id UUID NOT NULL REFERENCES public.attendances(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    PRIMARY KEY (attendance_id, member_id)
);

-- Contents
CREATE TABLE public.contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('verse', 'video', 'announcement')),
    title TEXT NOT NULL,
    body TEXT,
    url TEXT,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Functions
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_church_id() RETURNS UUID AS $$
  SELECT church_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies: Churches
CREATE POLICY "Super Admins can do everything on churches" ON public.churches FOR ALL TO authenticated USING (public.get_user_role() = 'super_admin') WITH CHECK (public.get_user_role() = 'super_admin');
CREATE POLICY "Church admins and members can view their own church" ON public.churches FOR SELECT TO authenticated USING (id = public.get_user_church_id());

-- Policies: Members
CREATE POLICY "Super Admins can do everything on members" ON public.members FOR ALL TO authenticated USING (public.get_user_role() = 'super_admin') WITH CHECK (public.get_user_role() = 'super_admin');
CREATE POLICY "Church admins can do everything in their church" ON public.members FOR ALL TO authenticated USING (church_id = public.get_user_church_id() AND public.get_user_role() = 'church_admin') WITH CHECK (church_id = public.get_user_church_id() AND public.get_user_role() = 'church_admin');
CREATE POLICY "Members can view other members in their church" ON public.members FOR SELECT TO authenticated USING (church_id = public.get_user_church_id());

-- Policies: Profiles
CREATE POLICY "Users can view profiles in their church" ON public.user_profiles FOR SELECT TO authenticated USING (church_id = public.get_user_church_id() OR public.get_user_role() = 'super_admin');
CREATE POLICY "Super admins can manage profiles" ON public.user_profiles FOR ALL TO authenticated USING (public.get_user_role() = 'super_admin') WITH CHECK (public.get_user_role() = 'super_admin');

-- Policies: Contents
CREATE POLICY "View contents" ON public.contents FOR SELECT TO authenticated USING (church_id = public.get_user_church_id() OR church_id IS NULL OR public.get_user_role() = 'super_admin');
CREATE POLICY "Manage contents" ON public.contents FOR ALL TO authenticated USING (public.get_user_role() = 'super_admin' OR (church_id = public.get_user_church_id() AND public.get_user_role() = 'church_admin'));

-- Trigger for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (new.id, new.email, 'member');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
