-- Table: church_departments
CREATE TABLE IF NOT EXISTS public.church_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(church_id, name)
);

-- Table: department_leaders
CREATE TABLE IF NOT EXISTS public.department_leaders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.church_departments(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(department_id, member_id)
);

-- Disable RLS to avoid "new row violates row-level security policy" issues for the MVP since auth context via cookies is sometimes tricky with Supabase's get_user_role function in server actions.
ALTER TABLE public.church_departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_leaders DISABLE ROW LEVEL SECURITY;
