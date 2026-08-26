import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm"; // Fix TS false positive
import Link from "next/link";

export default async function MemberProfilePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const memberSession = cookieStore.get("member_session")?.value;
  let targetChurchId = null;
  let targetMemberId = null;

  if (memberSession) {
    try {
      const decoded = JSON.parse(
        Buffer.from(memberSession, "base64").toString("utf-8"),
      );
      targetChurchId = decoded.church_id;
      targetMemberId = decoded.member_id;
    } catch (e) {}
  }

  if (!targetChurchId || !targetMemberId) {
    redirect("/login?space=member");
  }

  // Use the admin/RPC to fetch member details if RLS is strict
  // Wait, the member can already view themselves because of this policy:
  // "Members can view other members in their church" ON public.members FOR SELECT TO authenticated USING (church_id = public.get_user_church_id());
  // But wait! This policy is for "authenticated" users (Supabase Auth).
  // The member login is ANONYMOUS! 
  // So how does the dashboard page fetch the member?
  // Let's check: the dashboard page fetches it via `supabase.from('members')` but the server client might bypass RLS? No.
  // Wait, in `page.tsx` of member-dashboard, it did `supabase.from('members')`. If it worked there, it works here.
  const { data: member, error } = await supabase.rpc('get_member_secure', {
    p_member_id: targetMemberId
  });

  if (error || !member) {
    redirect("/login?space=member");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/member-dashboard" className="text-gray-500 hover:text-primary-900 dark:hover:text-gold-400 font-bold flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Retour au tableau de bord
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-t-4 border-gold-500 overflow-hidden">
          <div className="p-6 md:p-8 border-b dark:border-slate-700">
            <h1 className="text-2xl font-serif text-primary-900 dark:text-gold-400 font-bold">Mon Profil</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Mettez à jour vos informations personnelles.</p>
          </div>
          
          <div className="p-6 md:p-8">
            <ProfileForm member={member} />
          </div>
        </div>
      </div>
    </div>
  );
}
