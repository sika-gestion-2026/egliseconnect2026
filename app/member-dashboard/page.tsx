import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MemberDashboardClient from "./MemberDashboardClient";
import RealTimeClock from "@/components/RealTimeClock";
import NotificationBell from "./NotificationBell";
import { getTodayLocalDateString } from "@/utils/date";
import { normalizeFunctions } from "@/utils/memberFunctions";
import { memberLogoutAction } from "@/app/actions/memberLogout";
import LogoutConfirmButton from "@/components/LogoutConfirmButton";
import { verifyMemberSession, signMemberSession, shouldRenewSession, SESSION_MAX_AGE_SECONDS } from "@/utils/memberSession";

export default async function MemberDashboard() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let memberData: any = null;
  let nextService = null;
  let upcomingServices: any[] = [];
  let currentRsvp = null;
  let missedLastService = null;

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
      const session = verifyMemberSession(memberSession);
      if (session) {
        targetChurchId = session.church_id;
        targetMemberId = session.member_id;

        // 🔄 Silent session renewal: if token was issued more than 30 days ago, refresh it
        if (shouldRenewSession(session)) {
          const newToken = signMemberSession({ member_id: session.member_id, church_id: session.church_id });
          cookieStore.set('member_session', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: SESSION_MAX_AGE_SECONDS,
            path: '/'
          });
        }
      }
    }
  }

  if (!targetChurchId || !targetMemberId) {
    redirect("/login?space=member");
  }

  // ==========================================================================
  // Chargement des données.
  //
  // Cette page enchaînait une quinzaine d'appels Supabase les uns après les
  // autres, alors que la plupart sont indépendants. Chaque aller-retour réseau
  // s'additionnait : le TTFB atteignait plusieurs secondes. Les appels sont
  // désormais regroupés en trois lots parallèles, du plus général au plus
  // dépendant, sans changer la logique métier ni les données affichées.
  // ==========================================================================

  // --- Calcul des cultes récurrents (configuration worship_days) -----------
  // Déclaré ici car utilisé par le lot 2 : une fonction serait hoistée, mais
  // dayMap est une constante et subirait une erreur TDZ si laissé plus bas.
  const dayMap: Record<string, number> = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };

  function computeNextOccurrences(days: any[], count: number) {
    const result: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const def of days) {
      const dayNum = dayMap[def.day];
      if (dayNum === undefined) continue;
      const next = new Date(today);
      const diff = (dayNum - today.getDay() + 7) % 7;
      next.setDate(today.getDate() + (diff === 0 ? 0 : diff));
      for (let w = 0; w < Math.ceil(count / days.length) + 1; w++) {
        const d = new Date(next);
        d.setDate(next.getDate() + w * 7);
        result.push({
          id: `recurring-${def.day}-w${w}`,
          name: def.name || (def.day === 'Sunday' ? "Culte du Dimanche" : "Culte du Jeudi"),
          service_date: d.toISOString().split('T')[0],
          service_time: def.start_time || def.time || '09:00',
          type: 'regular',
          isRecurring: true,
        });
      }
    }
    return result.sort((a, b) => a.service_date.localeCompare(b.service_date)).slice(0, count);
  }

  const todayStr = getTodayLocalDateString();
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let initialNotes: any[] = [];
  let activeAnnouncement: any = null;
  let ledDepartments: any[] = [];
  let myNotifications: any[] = [];
  let thisMonthCount = 0;
  let thisYearCount = 0;

  // --- Lot 1 : identité (église + profil membre) --------------------------
  const [{ data: church }, { data: memberProfile }] = await Promise.all([
    supabase.from("churches").select("*").eq("id", targetChurchId).single(),
    supabase.rpc("get_member_secure", { p_member_id: targetMemberId }),
  ]);

  if (memberProfile) {
    memberData = memberProfile;
  }

  // La colonne est du JSONB : PostgREST renvoie déjà un tableau. On normalise
  // quand même, car certaines requêtes la renvoient en chaîne.
  const myFunctions: string[] = normalizeFunctions(memberData?.functions);

  // --- Lot 2 : tout ce qui ne dépend que de church_id / member_id ---------
  const [
    { data: services },
    { data: pastServices },
    { data: memberNotes },
    { data: announcementRow },
    { data: ledDeptRows },
    { data: presenceRows },
    { data: notifications },
    { data: allMembers },
    { data: myDepts },
    { data: mutuelMember },
  ] = await Promise.all([
    // Cultes à venir
    supabase
      .from("church_services")
      .select("*")
      .eq("church_id", targetChurchId)
      .gte("service_date", todayStr)
      .order("service_date", { ascending: true })
      .limit(5),
    // Dernier culte passé (pour détecter une absence)
    supabase
      .from("church_services")
      .select("*")
      .eq("church_id", targetChurchId)
      .lt("service_date", todayStr)
      .order("service_date", { ascending: false })
      .limit(1),
    // Notes pastorales
    supabase
      .from("member_notes")
      .select("*")
      .eq("member_id", targetMemberId)
      .order("created_at", { ascending: false }),
    // Annonce courante
    supabase
      .from("church_announcements")
      .select("*")
      .eq("church_id", targetChurchId)
      .eq("is_active", true)
      .gte("created_at", sevenDaysAgo.toISOString())
      .maybeSingle(),
    // Départements dirigés par ce membre
    supabase
      .from("department_leaders")
      .select("department_id, church_departments(name, description)")
      .eq("member_id", targetMemberId),
    // Présences de l'année en cours (borné en base, plus tout l'historique)
    supabase
      .from("service_declarations")
      .select("created_at")
      .eq("member_id", targetMemberId)
      .eq("status", "present")
      .gte("created_at", yearStart.toISOString()),
    // Notifications
    supabase
      .from("notifications")
      .select("*")
      .eq("recipient_member_id", targetMemberId)
      .order("created_at", { ascending: false })
      .limit(20),
    // Autres membres de l'église (réseau, anniversaires, podium)
    supabase
      .from("members")
      .select("id, first_name, last_name, photo_url, commune, quartier, functions, birth_date, phone")
      .eq("church_id", targetChurchId)
      .neq("id", targetMemberId),
    // Départements correspondant aux fonctions du membre
    myFunctions.length > 0
      ? supabase
          .from("church_departments")
          .select("id, name")
          .eq("church_id", targetChurchId)
          .in("name", myFunctions)
      : Promise.resolve({ data: [] as any[] }),
    // Appartenance à la mutuelle
    supabase
      .from("mutual_members")
      .select("id")
      .eq("church_id", targetChurchId)
      .eq("member_id", targetMemberId)
      .maybeSingle(),
  ]);

  if (memberNotes) initialNotes = memberNotes;
  if (announcementRow) activeAnnouncement = announcementRow;
  if (notifications) myNotifications = notifications;

  if (ledDeptRows && ledDeptRows.length > 0) {
    ledDepartments = ledDeptRows.map((d: any) => {
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

  if (presenceRows) {
    thisYearCount = presenceRows.length;
    thisMonthCount = presenceRows.filter(
      (p) => new Date(p.created_at) >= monthStart,
    ).length;
  }

  // Cultes à venir : priorité aux lignes réelles en base, sinon reconstruction
  // depuis la configuration récurrente de l'église.
  if (services && services.length > 0) {
    upcomingServices = services;
    nextService = services[0];
  } else {
    const worshipDays: any[] = church?.worship_days || [];
    if (worshipDays.length > 0) {
      upcomingServices = computeNextOccurrences(worshipDays, 8);
      nextService = upcomingServices[0] || null;
    }
  }

  const lastService = pastServices?.[0] ?? null;
  const upcomingRealIds = upcomingServices
    .filter((s: any) => !s.isRecurring)
    .map((s: any) => s.id);
  const deptIds = (myDepts ?? []).map((d: any) => d.id);

  // Identifiants retenus pour le podium : les autres membres + le membre
  // connecté, pour qu'il puisse lui-même figurer au classement.
  const podiumMemberIds = (allMembers ?? []).map((m: any) => m.id);
  if (targetMemberId) podiumMemberIds.push(targetMemberId);

  // --- Lot 3 : requêtes dépendantes des identifiants calculés ci-dessus ----
  const [
    { data: rsvpRows },
    { data: pastAttendance },
    { data: myAssignments },
    { data: churchAssignments },
    { data: leaderRows },
    { data: transactions },
    { data: allDecls },
  ] = await Promise.all([
    // Déclarations de présence du membre sur les cultes à venir
    upcomingRealIds.length > 0
      ? supabase
          .from("service_declarations")
          .select("service_id, status")
          .eq("member_id", targetMemberId)
          .in("service_id", upcomingRealIds)
      : Promise.resolve({ data: [] as any[] }),
    // Présence au dernier culte passé
    lastService
      ? supabase
          .from("attendances")
          .select("id")
          .eq("service_id", lastService.id)
          .eq("member_id", targetMemberId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Planning personnel
    upcomingRealIds.length > 0
      ? supabase
          .from("service_assignments")
          .select("id")
          .eq("member_id", targetMemberId)
          .in("service_id", upcomingRealIds)
          .limit(1)
      : Promise.resolve({ data: [] as any[] }),
    // Programme ouvriers (assignations de l'église)
    upcomingRealIds.length > 0
      ? supabase
          .from("service_assignments")
          .select("id")
          .in("service_id", upcomingRealIds)
          .limit(1)
      : Promise.resolve({ data: [] as any[] }),
    // Responsables des départements du membre
    deptIds.length > 0
      ? supabase
          .from("department_leaders")
          .select("department_id, members(id, first_name, last_name, photo_url, phone)")
          .in("department_id", deptIds)
      : Promise.resolve({ data: [] as any[] }),
    // Transactions de la mutuelle
    mutuelMember
      ? supabase
          .from("mutual_transactions")
          .select("*")
          .eq("church_id", targetChurchId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    // Présences de l'année courante pour tous les membres (podium)
    podiumMemberIds.length > 0
      ? supabase
          .from("service_declarations")
          .select("member_id, created_at")
          .in("member_id", podiumMemberIds)
          .eq("status", "present")
          .gte("created_at", yearStart.toISOString())
      : Promise.resolve({ data: [] as any[] }),
  ]);

  if (nextService) {
    const mine = (rsvpRows ?? []).find((r: any) => r.service_id === nextService.id);
    if (mine) currentRsvp = mine.status;
  }

  if (lastService && !pastAttendance) {
    missedLastService = lastService;
  }

  const hasMyPlanning = (myAssignments?.length || 0) > 0;
  const hasOuvriersPlanning = (churchAssignments?.length || 0) > 0;

  let myDepartmentLeaders: any[] = [];
  if (leaderRows && leaderRows.length > 0) {
    myDepartmentLeaders = leaderRows
      .map((ld: any) => {
        const dept = (myDepts ?? []).find((d: any) => d.id === ld.department_id);
        return {
          departmentName: dept?.name,
          leader: Array.isArray(ld.members) ? ld.members[0] : ld.members,
        };
      })
      .filter((item: any) => item.leader);
  }

  // Synthèse de la mutuelle, calculée à partir des transactions réelles.
  let mutuelleData: {
    myContribution: number;
    totalFund: number;
    totalExpenses: number;
    recentExpenses: { label: string; amount: number; date: string; description?: string }[];
    isMember: boolean;
  } = {
    myContribution: 0,
    totalFund: 0,
    totalExpenses: 0,
    recentExpenses: [],
    isMember: false,
  };

  if (mutuelMember) {
    let myContribution = 0;
    let totalFund = 0;
    let totalExpenses = 0;
    const recentExpenses: {
      label: string;
      amount: number;
      date: string;
      description?: string;
    }[] = [];

    (transactions ?? []).forEach((t: any) => {
      if (t.type === 'contribution') {
        totalFund += Number(t.amount);
        if (t.member_id === targetMemberId) {
          myContribution += Number(t.amount);
        }
      } else if (t.type === 'expense') {
        totalExpenses += Number(t.amount);
        recentExpenses.push({
          label: t.label || t.description || 'Dépense',
          amount: Number(t.amount),
          date: t.created_at,
          description: t.notes || t.reason || undefined,
        });
      }
    });

    mutuelleData = {
      myContribution,
      totalFund,
      totalExpenses,
      recentExpenses: recentExpenses.slice(0, 10),
      isMember: true,
    };
  }

  // Purge des notes anciennes : erreur volontairement ignorée pour ne pas
  // bloquer le rendu (le second argument évite un rejet non géré).
  void supabase.rpc("purge_old_notes").then(undefined, (err) => {
    console.warn('purge_old_notes ignoré:', err);
  });

  // --- Réseau & Anniversaires (données déjà chargées au lot 2) ------------
  const birthdaysToday: any[] = [];
  const locationMembers: any[] = [];
  const departmentMembers: any[] = [];
  let championOfMonth: any = null;
  let championOfYear: any = null;

  // Rappel automatique si le prochain culte est aujourd'hui : c'est une écriture,
  // volontairement hors des lots de lecture.
  if (nextService && !nextService.isRecurring && nextService.service_date === todayStr) {
    const { data: existingReminder } = await supabase
      .from("notifications")
      .select("id")
      .eq("recipient_member_id", targetMemberId)
      .eq("type", "service_reminder")
      .eq("related_service_id", nextService.id)
      .maybeSingle();

    if (!existingReminder) {
      await supabase.from("notifications").insert({
        recipient_member_id: targetMemberId,
        church_id: targetChurchId,
        type: "service_reminder",
        title: `🔥 C'est Aujourd'hui !`,
        body: `Le culte "${nextService.name}" commence aujourd'hui à ${nextService.service_time?.substring(0,5)}. N'oubliez pas de confirmer votre présence !`,
        related_service_id: nextService.id
      });
    }
  }

  if (targetChurchId && targetMemberId && memberData && allMembers) {
    const [, currentMonth, currentDay] = todayStr.split("-");

    const myCommune = memberData.commune?.toLowerCase().trim();
    const myQuartier = memberData.quartier?.toLowerCase().trim();

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
        const mFuncs = normalizeFunctions(m.functions);
        if (myFunctions.some((f) => mFuncs.includes(f))) {
          departmentMembers.push(m);
        }
      }
    }

    // --- NOUVEAU: Le Podium (Gamification) ---
    const currentYearStr = String(now.getFullYear());
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, "0");

    // Présences déjà chargées au lot 3, et bornées à l'année courante.
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
            <div className="relative w-24 h-24 shrink-0">
              {memberData?.photo_url ? (
                <img
                  src={memberData.photo_url}
                  alt="Membre"
                  className="w-full h-full rounded-full object-cover object-top border-4 border-white dark:border-slate-700 shadow-lg"
                />
              ) : (
                <div className="w-full h-full bg-primary-100 dark:bg-primary-900/30 rounded-full border-4 border-gray-50 dark:border-slate-700 flex items-center justify-center text-primary-900 dark:text-gold-400 text-3xl font-bold shadow-md">
                  {memberData?.first_name?.[0] || "U"}
                </div>
              )}
              {church?.logo_url && (
                <img
                  src={church.logo_url}
                  alt="Eglise"
                  className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 bg-white shadow-sm object-cover"
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
                {myFunctions.length > 0 && (
                  <span className="text-gray-600 dark:text-gray-300">
                    {" "}— Département : <span className="font-semibold text-primary-800 dark:text-gold-300">{myFunctions.join(", ")}</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {hasMyPlanning && (
                <a href="/member-dashboard/planning" className="text-xs flex items-center gap-1.5 font-bold text-white bg-primary-900 hover:bg-primary-800 px-3 py-1.5 rounded-md shadow-sm transition-colors whitespace-nowrap">
                  <span>📅</span> Mon Planning
                </a>
              )}
              {hasOuvriersPlanning && (
                <a href="/member-dashboard/public-planning" className="text-xs flex items-center gap-1.5 font-bold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-md shadow-sm transition-colors whitespace-nowrap">
                  <span>📋</span> Programme Ouvriers
                </a>
              )}
              <a href="/localisation" className="text-xs flex items-center gap-1.5 font-bold text-primary-900 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-100 px-3 py-1.5 rounded-md shadow-sm border border-primary-200 dark:border-primary-800 transition-colors whitespace-nowrap">
                <span>📍</span> M'y rendre
              </a>
              <a href="/member-dashboard/profile" className="text-xs flex items-center gap-1.5 font-bold text-white bg-gold-500 hover:bg-gold-600 px-3 py-1.5 rounded-md shadow-sm transition-colors whitespace-nowrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Modifier mon profil
              </a>
              <NotificationBell notifications={myNotifications} />
              <RealTimeClock />
            </div>

            <LogoutConfirmButton 
              variant="member" 
              action={memberLogoutAction} 
              userName={memberData?.first_name} 
              churchName={church?.name}
            />
          </div>
        </div>

        <MemberDashboardClient
          church={church}
          memberData={memberData}
          nextService={nextService}
          upcomingServices={upcomingServices}
          missedLastService={missedLastService}
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
          myDepartmentLeaders={myDepartmentLeaders}
          mutuelleData={mutuelleData}
        />
      </div>
    </div>
  );
}
