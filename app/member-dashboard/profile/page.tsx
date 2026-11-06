import { createAdminClient } from "@/utils/supabase/admin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";
import Link from "next/link";
import { verifyMemberSession } from "@/utils/memberSession";

export default async function MemberProfilePage() {
  const cookieStore = await cookies();

  const memberSession = cookieStore.get("member_session")?.value;
  let targetChurchId = null;
  let targetMemberId = null;

  if (memberSession) {
    const session = verifyMemberSession(memberSession);
    if (session) {
      targetChurchId = session.church_id;
      targetMemberId = session.member_id;
    }
  }

  if (!targetChurchId || !targetMemberId) {
    redirect("/login?space=member");
  }

  const admin = createAdminClient();
  if (!admin) {
    redirect("/login?space=member");
  }
  const { data: member, error } = await admin
    .from("members")
    .select("*")
    .eq("id", targetMemberId)
    .eq("church_id", targetChurchId)
    .maybeSingle();

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
