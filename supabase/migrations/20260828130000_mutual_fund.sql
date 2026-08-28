-- 1. Autoriser le nouveau rôle "mutual_manager"
-- PostgreSQL ne permet pas de faire simplement un "ALTER TYPE" sur un CHECK constraint
-- On supprime donc l'ancienne contrainte.
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- 2. Création de la table des membres de la mutuelle
CREATE TABLE IF NOT EXISTS public.mutual_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(church_id, member_id)
);

-- 3. Création de la table des transactions (cotisations et dépenses)
CREATE TABLE IF NOT EXISTS public.mutual_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL, -- Null pour les dépenses globales
    type TEXT NOT NULL CHECK (type IN ('contribution', 'expense')),
    amount NUMERIC(12, 2) NOT NULL,
    motive TEXT NOT NULL,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activation RLS
ALTER TABLE public.mutual_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutual_transactions ENABLE ROW LEVEL SECURITY;

-- 4. RLS pour les membres de la mutuelle
CREATE POLICY "Les membres de la mutuelle sont visibles par l'église" 
ON public.mutual_members FOR SELECT TO authenticated 
USING (church_id = public.get_user_church_id() OR public.get_user_role() = 'super_admin');

CREATE POLICY "Les gestionnaires et admins gèrent les membres de la mutuelle" 
ON public.mutual_members FOR ALL TO authenticated 
USING (
    public.get_user_role() = 'super_admin' OR 
    (church_id = public.get_user_church_id() AND public.get_user_role() IN ('church_admin', 'mutual_manager'))
);

-- 5. RLS pour les transactions
CREATE POLICY "Les transactions sont visibles par l'église" 
ON public.mutual_transactions FOR SELECT TO authenticated 
USING (church_id = public.get_user_church_id() OR public.get_user_role() = 'super_admin');

CREATE POLICY "Les gestionnaires et admins gèrent les transactions" 
ON public.mutual_transactions FOR ALL TO authenticated 
USING (
    public.get_user_role() = 'super_admin' OR 
    (church_id = public.get_user_church_id() AND public.get_user_role() IN ('church_admin', 'mutual_manager'))
);
