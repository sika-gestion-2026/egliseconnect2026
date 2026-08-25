import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MemberDashboardClient from "./MemberDashboardClient";
import RealTimeClock from "../components/RealTimeClock";
import { getTodayLocalDateString } from "@/utils/date";

export default async function MemberDashboard() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let memberData: any = null;
  let nextService = null;
  let currentRsvp = null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let profile = null;

  if (user) {
    const { data } = await supabase
      .from("user_profiles")
      .select("church_id, role, member_id")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  let targetChurchId = profile?.church_id;
  let targetMemberId = profile?.member_id;

  // Custom auth fallback (Phone + Church Code)
  if (!targetMemberId) {
    const memberSession = cookieStore.get("member_session")?.value;
    if (memberSession) {
      try {
        const decoded = JSON.parse(
          Buffer.from(memberSession, "base64").toString("utf-8"),
        );
        targetChurchId = decoded.church_id;
        targetMemberId = decoded.member_id;
      } catch (e) {
        // Invalid session
      }
    }
  }

  if (!targetChurchId || !targetMemberId) {
    redirect("/login?space=member");
  }

  const { data: church } = await supabase
    .from("churches")
    .select("*")
    .eq("id", targetChurchId)
    .single();

  if (targetMemberId) {
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("id", targetMemberId)
      .single();
    memberData = data;

    // Fetch next service
    const { data: services } = await supabase
      .from("church_services")
      .select("*")
      .eq("church_id", targetChurchId)
      .gte("service_date", getTodayLocalDateString())
      .order("service_date", { ascending: true })
      .limit(1);

    if (services && services.length > 0) {
      nextService = services[0];

      // Check if user already RSVP'd
      const { data: rsvp } = await supabase
        .from("service_declarations")
        .select("status")
        .eq("service_id", nextService.id)
        .eq("member_id", targetMemberId)
        .single();

      if (rsvp) currentRsvp = rsvp.status;
    }
  }

  // Fetch Notes
  let initialNotes: any[] = [];
  if (targetMemberId) {
    const { data: notes } = await supabase
      .from("member_notes")
      .select("*")
      .eq("member_id", targetMemberId)
      .order("created_at", { ascending: false });

    if (notes) initialNotes = notes;
  }

  // Fetch Active Announcement
  let activeAnnouncement = null;
  if (targetChurchId) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data } = await supabase
      .from("church_announcements")
      .select("*")
      .eq("church_id", targetChurchId)
      .eq("is_active", true)
      .gte("created_at", sevenDaysAgo.toISOString())
      .single();
    activeAnnouncement = data;
  }

  // Fetch led departments for the member
  let ledDepartments: any[] = [];
  if (targetMemberId) {
    const { data } = await supabase
      .from("department_leaders")
      .select("department_id, church_departments(name, description)")
      .eq("member_id", targetMemberId);

    if (data && data.length > 0) {
      ledDepartments = data.map((d) => {
        const dept = Array.isArray(d.church_departments)
          ? d.church_departments[0]
          : d.church_departments;
        return {
          id: d.department_id,
          name: dept?.name,
          description: dept?.description,
        };
      });
    }
  }

  // Stats de présence
  let thisMonthCount = 0;
  let thisYearCount = 0;

  if (targetMemberId) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const { data: presenceData } = await supabase
      .from("service_declarations")
      .select("created_at")
      .eq("member_id", targetMemberId)
      .eq("status", "present");

    if (presenceData) {
      thisYearCount = presenceData.filter(
        (p) => new Date(p.created_at).getFullYear() === currentYear,
      ).length;
      thisMonthCount = presenceData.filter((p) => {
        const d = new Date(p.created_at);
        return (
          d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth
        );
      }).length;
    }
  }

  // Purge trigger (fire and forget)
  void supabase.rpc("purge_old_notes").then(() => {});

  // --- NOUVEAU: Réseau & Anniversaires ---
  let birthdaysToday: any[] = [];
  let locationMembers: any[] = [];
  let departmentMembers: any[] = [];
  let championOfMonth: any = null;
  let championOfYear: any = null;

  if (targetChurchId && targetMemberId && memberData) {
    const todayStr = getTodayLocalDateString();
    const [, currentMonth, currentDay] = todayStr.split("-");

    const { data: allMembers } = await supabase
      .from("members")
      .select(
        "id, first_name, last_name, photo_url, commune, quartier, functions, birth_date, phone",
      )
      .eq("church_id", targetChurchId)
      .neq("id", targetMemberId); // Exclure soi-même

    if (allMembers) {
      const myCommune = memberData.commune?.toLowerCase().trim();
      const myQuartier = memberData.quartier?.toLowerCase().trim();

      let myFunctions: string[] = [];
      try {
        myFunctions = memberData.functions
          ? JSON.parse(memberData.functions)
          : [];
      } catch (e) {}

      for (const m of allMembers) {
        // Anniversaires
        if (m.birth_date) {
          const parts = m.birth_date.split("-");
          if (parts.length === 3) {
            const mMonth = parts[1];
            const mDay = parts[2];
            if (mMonth === currentMonth && mDay === currentDay) {
              birthdaysToday.push(m);
            }
          }
        }

        // Emplacement
        let isSameLocation = false;
        if (
          myCommune &&
          m.commune &&
          m.commune.toLowerCase().trim() === myCommune
        )
          isSameLocation = true;
        if (
          myQuartier &&
          m.quartier &&
          m.quartier.toLowerCase().trim() === myQuartier
        )
          isSameLocation = true;
        if (isSameLocation) locationMembers.push(m);

        // Département / Fonctions
        if (myFunctions.length > 0 && m.functions) {
          try {
            const mFuncs: string[] = JSON.parse(m.functions);
            if (myFunctions.some((f) => mFuncs.includes(f))) {
              departmentMembers.push(m);
            }
          } catch (e) {}
        }
      }

      // --- NOUVEAU: Le Podium (Gamification) ---
      const currentYearStr = String(new Date().getFullYear());
      const currentMonthStr = String(new Date().getMonth() + 1).padStart(
        2,
        "0",
      );

      const memberIds = allMembers.map((m) => m.id);
      if (targetMemberId) memberIds.push(targetMemberId); // Inclure l'utilisateur actuel dans le classement !

      const { data: allDecls } = await supabase
        .from("service_declarations")
        .select("member_id, created_at")
        .in("member_id", memberIds)
        .eq("status", "present");

      if (allDecls && allDecls.length > 0) {
        const monthCounts: Record<string, number> = {};
        const yearCounts: Record<string, number> = {};

        allDecls.forEach((d) => {
          const dDate = new Date(d.created_at);
          const dYear = String(dDate.getFullYear());
          const dMonth = String(dDate.getMonth() + 1).padStart(2, "0");

          if (dYear === currentYearStr) {
            yearCounts[d.member_id] = (yearCounts[d.member_id] || 0) + 1;
            if (dMonth === currentMonthStr) {
              monthCounts[d.member_id] = (monthCounts[d.member_id] || 0) + 1;
            }
          }
        });

        function getChampion(counts: Record<string, number>) {
          let bestId = null;
          let max = 0;
          for (const [id, count] of Object.entries(counts)) {
            if (count > max) {
              max = count;
              bestId = id;
            }
          }
          if (!bestId) return null;

          if (bestId === targetMemberId) {
            return { ...memberData, isMe: true, score: max };
          } else {
            const m = allMembers?.find((x) => x.id === bestId);
            return m ? { ...m, isMe: false, score: max } : null;
          }
        };

        championOfMonth = getChampion(monthCounts);
        championOfYear = getChampion(yearCounts);
      }
    }
  }
  // ------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-8 relative overflow-hidden">
      {/* White Label Background Logo */}
      {church?.logo_url && (
        <div
          className="absolute inset-0 pointer-events-none opacity-5 dark:opacity-10 z-0 bg-no-repeat bg-center bg-fixed"
          style={{
            backgroundImage: `url(${church.logo_url})`,
            backgroundSize: "70%",
            backgroundPosition: "center",
          }}
        />
      )}

      <div className="max-w-4xl mx-auto relative z-10">
        {/* En-tête de bienvenue avec Photo Membre & Logo */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-t-4 border-primary-900 dark:border-gold-500">
          <div className="flex items-center gap-5">
            {/* Composition Photo & Logo */}
            <div className="relative">
              {memberData?.photo_url ? (
                <img
                  src={memberData.photo_url}
                  alt="Membre"
                  className="w-20 h-20 rounded-full object-cover border-4 border-gray-50 dark:border-slate-700 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full border-4 border-gray-50 dark:border-slate-700 flex items-center justify-center text-primary-900 dark:text-gold-400 text-3xl font-bold shadow-md">
                  {memberData?.first_name?.[0] || "U"}
                </div>
              )}
              {church?.logo_url && (
                <img
                  src={church.logo_url}
                  alt="Eglise"
                  className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 bg-white shadow-sm object-cover"
                />
              )}
            </div>

            {/* Infos Membre */}
            <div>
              <h1 className="text-2xl font-serif text-gray-900 dark:text-white font-bold leading-tight">
                Bonjour, {memberData?.first_name || "Fidèle"} !
              </h1>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                Membre de{" "}
                <strong className="text-primary-900 dark:text-gold-400">
                  {church?.name}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex flex-col md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <a href="/localisation" className="text-xs flex items-center gap-1.5 font-bold text-primary-900 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-100 px-3 py-1.5 rounded-md shadow-sm border border-primary-200 dark:border-primary-800 transition-colors whitespace-nowrap">
                <span>📍</span> M'y rendre
              </a>
              <RealTimeClock />
            </div>

            <form action="/auth/signout" method="post">
              <button className="text-xs font-bold text-red-500 hover:text-white hover:bg-red-500 bg-red-50 dark:bg-red-900/10 px-3 py-1.5 rounded-md shadow-sm border border-red-200 dark:border-red-800 transition-colors">
                Me déconnecter
              </button>
            </form>
          </div>
        </div>

        <MemberDashboardClient
          church={church}
          memberData={memberData}
          nextService={nextService}
          currentRsvp={currentRsvp}
          initialNotes={initialNotes}
          activeAnnouncement={activeAnnouncement}
          ledDepartments={ledDepartments}
          stats={{ month: thisMonthCount, year: thisYearCount }}
          birthdaysToday={birthdaysToday}
          locationMembers={locationMembers}
          departmentMembers={departmentMembers}
          championOfMonth={championOfMonth}
          championOfYear={championOfYear}
        />
      </div>
    </div>
  );
}
