'use client'

import { useState, useEffect } from 'react'
import RSVPWidget from './RSVPWidget'
import NotesWidget from './NotesWidget'
import DepartmentLeaderWidget from './DepartmentLeaderWidget'
import PrayerWall from './PrayerWall'
import WorshipReminder from './WorshipReminder'
import MutuelleWidget from './MutuelleWidget'
import { QRCodeSVG } from 'qrcode.react'
import ScannerModal from './ScannerModal'
import OptimizedAvatar from '@/components/OptimizedAvatar'

type MemberDashboardClientProps = {
  church: any
  memberData: any
  nextService: any
  upcomingServices?: any[]
  missedLastService?: any
  currentRsvp: string | null
  initialNotes: any[]
  activeAnnouncement?: any
  ledDepartments?: any[]
  stats?: { month: number; year: number }
  birthdaysToday?: any[]
  locationMembers?: any[]
  departmentMembers?: any[]
  championOfMonth?: any
  championOfYear?: any
  myDepartmentLeaders?: any[]
  mutuelleData?: {
    myContribution: number
    totalFund: number
    totalExpenses: number
    recentExpenses: { label: string; amount: number; date: string; description?: string }[]
    isMember: boolean
  }
}

// Function to compute remaining days and hours
function getRemainingTime(createdAt: string) {
  const expiryDate = new Date(createdAt)
  expiryDate.setDate(expiryDate.getDate() + 7)
  const diff = expiryDate.getTime() - new Date().getTime()
  
  if (diff <= 0) return null
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  
  if (days > 0) return `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`
  return `${hours} heure${hours > 1 ? 's' : ''} restante${hours > 1 ? 's' : ''}`
}

export default function MemberDashboardClient({ church, memberData, nextService, upcomingServices, missedLastService, currentRsvp, initialNotes, activeAnnouncement, ledDepartments, stats, birthdaysToday, locationMembers, departmentMembers, championOfMonth, championOfYear, myDepartmentLeaders, mutuelleData }: MemberDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'notes' | 'departement' | 'communaute' | 'qrcode'>('home')
  const [isScanning, setIsScanning] = useState(false)

  const today = new Date()
  const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const mois = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']

  // Surprise! If they are the champion, trigger confetti on load.
  useEffect(() => {
    if (championOfMonth?.isMe || championOfYear?.isMe) {
      import('canvas-confetti').then((confetti) => {
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) return clearInterval(interval);
          const particleCount = 50 * (timeLeft / duration);
          confetti.default({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti.default({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
      });
    }
  }, [championOfMonth?.isMe, championOfYear?.isMe]);
  
  
  const defaultNoteTitle = nextService 
    ? `${nextService.name} - ${today.getDate()} ${mois[today.getMonth()]}` 
    : `Notes du ${jours[today.getDay()]} ${today.getDate()} ${mois[today.getMonth()]}`

  const downloadBadge = async () => {
    const element = document.getElementById('member-badge-card');
    if (!element) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      // Temporarily add a class to ensure it renders well (white background for transparent areas if needed)
      const canvas = await html2canvas(element, { 
        scale: 3, 
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Badge_${memberData?.first_name || 'Membre'}_${memberData?.last_name || ''}.png`;
      link.click();
    } catch (err) {
      console.error('Erreur lors du téléchargement du badge', err);
      alert("Impossible de télécharger le badge pour le moment.");
    }
  };

  return (
    <>
      {/* Tabs */}
      <div className="flex w-full bg-white dark:bg-slate-800 rounded-2xl p-1.5 mb-6 shadow-sm border border-gray-100 dark:border-slate-700">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 rounded-xl font-medium transition-all duration-200 ${activeTab === 'home' ? 'bg-primary-50 text-primary-900 dark:bg-slate-700 dark:text-white shadow-sm scale-100' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-750 scale-95'}`}
        >
          <span className="text-xl sm:text-base">🏠</span> 
          <span className="text-[10px] sm:text-sm whitespace-nowrap">Accueil</span>
        </button>
        <button 
          onClick={() => setActiveTab('notes')}
          className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 rounded-xl font-medium transition-all duration-200 ${activeTab === 'notes' ? 'bg-primary-50 text-primary-900 dark:bg-slate-700 dark:text-white shadow-sm scale-100' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-750 scale-95'}`}
        >
          <span className="text-xl sm:text-base">📖</span> 
          <span className="text-[10px] sm:text-sm whitespace-nowrap">Notes</span>
        </button>
        <button 
          onClick={() => setActiveTab('communaute')}
          className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 rounded-xl font-medium transition-all duration-200 ${activeTab === 'communaute' ? 'bg-primary-50 text-primary-900 dark:bg-slate-700 dark:text-white shadow-sm scale-100' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-750 scale-95'}`}
        >
          <span className="text-xl sm:text-base">🤝</span> 
          <span className="text-[10px] sm:text-sm whitespace-nowrap">Communauté</span>
        </button>
        <button 
          onClick={() => setActiveTab('qrcode')}
          className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 rounded-xl font-medium transition-all duration-200 ${activeTab === 'qrcode' ? 'bg-primary-50 text-primary-900 dark:bg-slate-700 dark:text-white shadow-sm scale-100' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-750 scale-95'}`}
        >
          <span className="text-xl sm:text-base">📱</span> 
          <span className="text-[10px] sm:text-sm whitespace-nowrap">QR Code</span>
        </button>
        
        {ledDepartments && ledDepartments.length > 0 && (
          <button 
            onClick={() => setActiveTab('departement')}
            className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 rounded-xl font-medium transition-all duration-200 ${activeTab === 'departement' ? 'bg-gold-50 text-gold-900 dark:bg-gold-900/30 dark:text-gold-400 shadow-sm scale-100' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-750 scale-95'}`}
          >
            <span className="text-xl sm:text-base">👑</span> 
            <span className="text-[10px] sm:text-sm whitespace-nowrap">Département</span>
          </button>
        )}
      </div>

      {activeTab === 'home' ? (
        <div className="bg-white/95 backdrop-blur-sm dark:bg-slate-800/95 rounded-2xl shadow-xl overflow-hidden border-t-4 border-green-500 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-8">
            <h1 className="text-3xl font-serif text-gray-900 dark:text-white mb-2">
              Espace Membre
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Bienvenue dans votre espace personnel de l'église <strong className="text-green-600 dark:text-green-400">{church?.name}</strong>.
            </p>

            {/* Verset de la semaine */}
            {(() => {
              const autoVerses = [
                { text: "L'Éternel est mon berger: je ne manquerai de rien.", ref: "Psaumes 23:1" },
                { text: "Ne t'ai-je pas donné cet ordre: Fortifie-toi et prends courage ?", ref: "Josué 1:9" },
                { text: "Je puis tout par celui qui me fortifie.", ref: "Philippiens 4:13" },
                { text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique...", ref: "Jean 3:16" },
                { text: "Confie-toi en l'Éternel de tout ton cœur...", ref: "Proverbes 3:5" }
              ];
              // Pick one based on the week of the year
              const weekNumber = Math.ceil(Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (24 * 60 * 60 * 1000)) / 7);
              const currentAutoVerse = autoVerses[weekNumber % autoVerses.length];
              
              const isAuto = church?.edification_mode === 'auto' || !church?.edification_mode;
              const verseText = isAuto ? currentAutoVerse.text : (church?.custom_verse_text || "Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux.");
              const verseRef = isAuto ? currentAutoVerse.ref : (church?.custom_verse_ref || "Matthieu 18:20");

              return (
                <div className="mb-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 p-6 md:p-8 rounded-2xl border border-amber-200/50 dark:border-amber-800/30 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-8xl">✨</div>
                  <div className="absolute -bottom-10 -left-10 opacity-5 text-9xl">🕊️</div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                    <div className="flex-1">
                      <span className="text-amber-600 dark:text-amber-500 text-xs font-bold tracking-widest uppercase mb-3 block flex items-center gap-2 justify-center md:justify-start">
                        <span className="w-8 h-px bg-amber-300"></span>
                        Verset de la semaine
                        <span className="w-8 h-px bg-amber-300 md:hidden"></span>
                      </span>
                      
                      <p className="font-serif text-xl md:text-2xl text-gray-800 dark:text-amber-100/90 leading-relaxed italic mb-4">
                        "{verseText}"
                      </p>
                      
                      <span className="inline-block bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                        — {verseRef}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="mb-8 flex flex-wrap gap-4">
              <a href="/localisation" className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-md transition-colors">
                <span>📍</span> M'y rendre
              </a>
              <button 
                onClick={() => setIsScanning(true)}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-md transition-colors animate-pulse-slow"
              >
                <span>📷</span> Scanner à l'entrée
              </button>
            </div>

            {/* 🔔 Rappel culte + alertes avec vibration */}
            <WorshipReminder
              upcomingServices={upcomingServices || []}
              churchName={church?.name || 'votre église'}
            />

            {birthdaysToday && birthdaysToday.length > 0 && (
              <div className="mb-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden animate-in zoom-in">
                <div className="absolute -right-10 -top-10 text-9xl opacity-20 rotate-12">🎂</div>
                <h3 className="text-2xl font-bold font-serif mb-2 flex items-center gap-2">
                  <span>🎉</span> Joyeux Anniversaire !
                </h3>
                <p className="font-medium text-pink-100">C'est l'anniversaire de :</p>
                <div className="flex flex-wrap gap-4 mt-4 relative z-10">
                  {birthdaysToday.map(b => (
                    <div key={b.id} className="flex items-center gap-3 bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/30">
                      <OptimizedAvatar 
                        src={b.photo_url} 
                        alt={b.first_name} 
                        size={48} 
                        className="border-2 border-white"
                        fallbackInitials={b.first_name} 
                      />
                      <div>
                        <p className="font-bold text-white">{b.first_name} {b.last_name}</p>
                        <a href={`tel:${b.phone}`} className="text-xs text-pink-100 hover:underline">{b.phone}</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              
              {/* Badge de Fidélité (Stats) */}
              <div className="md:col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 p-6 rounded-2xl shadow-sm border border-blue-100 dark:border-slate-600 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-blue-900 dark:text-blue-200 text-lg flex items-center gap-2">
                    <span>🏆</span> Bilan de Fidélité
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">Vos participations aux programmes de l'église.</p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-sm border border-blue-100 dark:border-slate-700">
                    <span className="block text-2xl font-black text-blue-600 dark:text-blue-400">{stats?.month || 0}</span>
                    <span className="text-xs font-bold text-gray-500 uppercase">Ce Mois</span>
                  </div>
                  <div className="text-center bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-sm border border-blue-100 dark:border-slate-700">
                    <span className="block text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats?.year || 0}</span>
                    <span className="text-xs font-bold text-gray-500 uppercase">Cette Année</span>
                  </div>
                </div>
              </div>

              {/* Le Podium de Fidélité (Gamification) */}
              {(championOfMonth || championOfYear) && (
                <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gold-200 dark:border-gold-900/50 mt-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 text-8xl">🏆</div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-xl flex items-center gap-2 mb-6 relative z-10">
                    <span>👑</span> Le Mur des Champions
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                    {/* Champion du Mois */}
                    {championOfMonth && (
                      <div className={`p-4 rounded-xl flex items-center gap-4 border-2 transition-all ${championOfMonth.isMe ? 'bg-gold-50 border-gold-400 dark:bg-gold-900/20 dark:border-gold-500 shadow-md transform scale-[1.02]' : 'bg-gray-50 border-gray-100 dark:bg-slate-750 dark:border-slate-700'}`}>
                        <div className="relative">
                          <div className="absolute -top-3 -right-2 text-2xl animate-bounce z-10">👑</div>
                          <OptimizedAvatar 
                            src={championOfMonth.photo_url} 
                            alt={championOfMonth.first_name} 
                            size={64} 
                            className="border-2 border-gold-400 shadow-sm"
                            fallbackInitials={championOfMonth.first_name} 
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gold-600 uppercase tracking-widest mb-1">Héros du Mois</p>
                          <p className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
                            {championOfMonth.isMe ? 'Vous !' : `${championOfMonth.first_name} ${championOfMonth.last_name}`}
                          </p>
                          <p className="text-sm font-medium text-gray-500 mt-1">{championOfMonth.score} présences</p>
                        </div>
                      </div>
                    )}

                    {/* Champion de l'Année */}
                    {championOfYear && (
                      <div className={`p-4 rounded-xl flex items-center gap-4 border-2 transition-all ${championOfYear.isMe ? 'bg-indigo-50 border-indigo-400 dark:bg-indigo-900/20 dark:border-indigo-500 shadow-md transform scale-[1.02]' : 'bg-gray-50 border-gray-100 dark:bg-slate-750 dark:border-slate-700'}`}>
                        <div className="relative">
                          <div className="absolute -top-3 -right-2 text-2xl z-10">🌿</div>
                          <OptimizedAvatar 
                            src={championOfYear.photo_url} 
                            alt={championOfYear.first_name} 
                            size={64} 
                            className="border-2 border-indigo-400 shadow-sm"
                            fallbackInitials={championOfYear.first_name} 
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Légende de l'Année</p>
                          <p className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
                            {championOfYear.isMe ? 'Vous !' : `${championOfYear.first_name} ${championOfYear.last_name}`}
                          </p>
                          <p className="text-sm font-medium text-gray-500 mt-1">{championOfYear.score} présences</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 🏦 Widget Mutuelle */}
              {mutuelleData && (
                <div className="md:col-span-2">
                  <MutuelleWidget
                    myContribution={mutuelleData.myContribution}
                    totalFund={mutuelleData.totalFund}
                    totalExpenses={mutuelleData.totalExpenses}
                    recentExpenses={mutuelleData.recentExpenses}
                    isMember={mutuelleData.isMember}
                  />
                </div>
              )}

              {missedLastService && (
                <div className="md:col-span-2 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/10 border-l-4 border-red-500 rounded-xl p-6 shadow-sm flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">🥺</div>
                    <div>
                      <h3 className="text-red-800 dark:text-red-400 font-bold text-lg">Vous nous avez manqué !</h3>
                      <p className="text-red-700/80 dark:text-red-300/80 text-sm mt-1">
                        Nous n'avons pas noté votre présence au dernier événement <strong>"{missedLastService.name}"</strong> du <span suppressHydrationWarning>{new Date(missedLastService.service_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>.
                      </p>
                      <p className="text-sm font-medium mt-2 text-red-900 dark:text-red-200">
                        Si vous avez suivi en ligne ou étiez absent, n'hésitez pas à nous le faire savoir !
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {nextService ? (
                <div className="md:col-span-2 space-y-6">
                  {/* Prochain Événement Principal (RSVP) */}
                  <RSVPWidget 
                    serviceId={nextService.id}
                    serviceName={nextService.name}
                    serviceDate={nextService.service_date}
                    serviceTime={nextService.service_time}
                    serviceType={nextService.type || 'regular'}
                    initialStatus={currentRsvp || undefined}
                    isToday={new Date(nextService.service_date).toDateString() === new Date().toDateString()}
                  />
                  
                  {/* Calendrier / Programme de la semaine */}
                  {upcomingServices && upcomingServices.length > 1 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                      <h3 className="font-serif font-bold text-lg mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                        <span>🗓️</span> Programme à venir
                      </h3>
                      <div className="space-y-3">
                        {upcomingServices.map((svc, index) => {
                          const isNext = index === 0; // Le programme en cours / le plus proche
                          return (
                            <div 
                              key={svc.id} 
                              className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border ${
                                isNext 
                                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 shadow-sm relative overflow-hidden' 
                                : 'bg-gray-50 dark:bg-slate-750/50 border-transparent hover:border-gray-200 dark:hover:border-slate-600'
                              } transition-colors`}
                            >
                              {isNext && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-500 animate-pulse"></div>}
                              
                              <div className={`flex items-start gap-4 ${isNext ? 'pl-2' : ''}`}>
                                <div className={`flex flex-col items-center justify-center min-w-[60px] p-2 rounded-md ${isNext ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400'}`}>
                                  <span className="text-xs font-bold uppercase" suppressHydrationWarning>{new Date(svc.service_date).toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                                  <span className="text-xl font-black" suppressHydrationWarning>{new Date(svc.service_date).getDate()}</span>
                                </div>
                                <div>
                                  <h4 className={`font-bold ${isNext ? 'text-primary-900 dark:text-gold-400' : 'text-gray-800 dark:text-gray-200'} text-lg`}>
                                    {svc.name}
                                  </h4>
                                  <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                    <span className="flex items-center gap-1">⏰ {svc.service_time?.substring(0, 5)}</span>
                                    {isNext && <span className="bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 text-xs px-2 py-0.5 rounded-full font-bold ml-2 animate-pulse">Bientôt</span>}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="md:col-span-2 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-2xl p-10 text-center flex flex-col items-center justify-center shadow-sm">
                  <span className="text-5xl opacity-50 mb-4">📅</span>
                  <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400 mb-2">Aucun événement programmé</h3>
                  <p className="text-gray-400 dark:text-gray-500 max-w-md mx-auto">
                    Votre église n'a pas encore planifié son prochain culte ou événement. Revenez plus tard pour confirmer votre présence !
                  </p>
                </div>
              )}
              
              
              {activeAnnouncement ? (
                <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-xl border-t-4 border-amber-400 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">📢</div>
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <h2 className="text-xl font-bold text-amber-900 dark:text-amber-400">{activeAnnouncement.title}</h2>
                    <span className="bg-white/80 dark:bg-slate-800/80 text-xs px-2 py-1 rounded text-amber-600 dark:text-amber-400 font-mono shadow-sm border border-amber-200 dark:border-amber-800">
                      ⏱ {getRemainingTime(activeAnnouncement.created_at)}
                    </span>
                  </div>
                  
                  {activeAnnouncement.verses && (
                    <div className="mb-4 bg-white/50 dark:bg-slate-800/50 p-3 rounded-lg border-l-4 border-amber-500 font-serif italic text-sm text-gray-700 dark:text-gray-300 relative z-10">
                      {activeAnnouncement.verses}
                    </div>
                  )}
                  
                  <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap relative z-10">
                    {activeAnnouncement.content}
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-700 p-6 rounded-xl border border-gray-100 dark:border-slate-600 shadow-sm flex items-center justify-center">
                  <p className="text-center text-gray-500 dark:text-gray-400 italic">
                    Les annonces et versets de la semaine apparaîtront ici.
                  </p>
                </div>
              )}

              <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-xl border border-green-100 dark:border-green-900/30">
                <h2 className="text-xl font-bold text-green-800 dark:text-green-400 mb-4">Mes Informations</h2>
                {memberData ? (
                  <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <p><span className="font-semibold">Nom:</span> {memberData.first_name} {memberData.last_name}</p>
                    <p><span className="font-semibold">Quartier:</span> {memberData.quartier || 'Non renseigné'}</p>
                    <p><span className="font-semibold">Téléphone:</span> {memberData.phone || 'Non renseigné'}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Profil non trouvé.</p>
                )}
              </div>

              {/* Mur de prière */}
              <div className="md:col-span-2">
                <PrayerWall />
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'notes' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <NotesWidget initialNotes={initialNotes} defaultTitle={defaultNoteTitle} />
        </div>
      ) : activeTab === 'communaute' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-8">
          {/* Departements */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <h2 className="text-2xl font-serif text-primary-900 dark:text-gold-400 font-bold flex items-center gap-2 mb-2">
              <span>👥</span> Mon Département
            </h2>
            <p className="text-gray-500 mb-6">Membres servant dans les mêmes départements que vous.</p>
            
            {myDepartmentLeaders && myDepartmentLeaders.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase text-xs tracking-widest border-b pb-2">Vos Responsables</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myDepartmentLeaders.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 border-2 border-gold-200 dark:border-gold-900/50 bg-gold-50/50 dark:bg-gold-900/10 rounded-xl hover:shadow-md transition-shadow relative overflow-hidden">
                      <div className="absolute -right-2 -top-2 text-4xl opacity-10 rotate-12">👑</div>
                      <div className="relative">
                        <OptimizedAvatar 
                          src={item.leader.photo_url} 
                          alt={item.leader.first_name} 
                          size={56} 
                          className="border-2 border-gold-400 shadow-sm shadow-gold-200"
                          fallbackInitials={item.leader.first_name} 
                        />
                        <span className="absolute -bottom-1 -right-1 bg-white rounded-full text-xs shadow-sm z-10">👑</span>
                      </div>
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold text-gold-600 uppercase tracking-wider">{item.departmentName}</p>
                        <p className="font-bold text-gray-900 dark:text-white leading-tight">{item.leader.first_name} {item.leader.last_name}</p>
                        <a href={`tel:${item.leader.phone}`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-full shadow-sm transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                          Appeler
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase text-xs tracking-widest border-b pb-2">L'équipe</h3>
            {departmentMembers && departmentMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {departmentMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-4 p-4 border border-gray-100 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow">
                    <OptimizedAvatar 
                      src={m.photo_url} 
                      alt={m.first_name} 
                      size={56} 
                      className="border-2 border-primary-100"
                      fallbackInitials={m.first_name} 
                    />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{m.first_name} {m.last_name[0]}.</p>
                      <a href={`tel:${m.phone}`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary-900 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-1.5 rounded-full shadow-sm transition-colors dark:bg-primary-900/30 dark:border-primary-800 dark:text-primary-100">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        Appeler
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg">Aucun autre membre n'est enregistré dans vos départements.</p>
            )}
          </div>
          
          {/* Proches */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <h2 className="text-2xl font-serif text-primary-900 dark:text-gold-400 font-bold flex items-center gap-2 mb-2">
              <span>📍</span> Proches de chez moi
            </h2>
            <p className="text-gray-500 mb-6">Membres habitant dans votre zone ({memberData?.commune || memberData?.quartier || 'Non défini'}).</p>
            
            {locationMembers && locationMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {locationMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-4 p-4 border border-gray-100 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow">
                    <OptimizedAvatar 
                      src={m.photo_url} 
                      alt={m.first_name} 
                      size={56} 
                      className="border-2 border-green-100"
                      fallbackInitials={m.first_name} 
                    />
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{m.first_name} {m.last_name[0]}.</p>
                      <p className="text-xs text-gray-500">{m.quartier || m.commune}</p>
                      <a href={`tel:${m.phone}`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-green-900 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-full shadow-sm transition-colors dark:bg-green-900/30 dark:border-green-800 dark:text-green-100">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        Appeler
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg">Aucun membre enregistré dans votre zone pour le moment.</p>
            )}
          </div>
        </div>
      ) : activeTab === 'qrcode' ? (
        <div className="bg-gray-50 dark:bg-slate-900/50 p-4 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col items-center justify-center">
          
          <div className="flex flex-col sm:flex-row justify-between items-center w-full max-w-md mb-6">
            <h2 className="text-2xl font-serif text-primary-900 dark:text-gold-400 font-bold mb-4 sm:mb-0">
              Badge Officiel
            </h2>
            <button 
              onClick={downloadBadge}
              className="flex items-center gap-2 bg-primary-900 hover:bg-primary-800 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Télécharger
            </button>
          </div>
          
          {/* CARTE DE MEMBRE (ID CARD) */}
          <div 
            id="member-badge-card"
            className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden relative border border-gray-100"
            style={{ aspectRatio: '6/10' }} // Vertical ID card proportion
          >
            {/* Header / Top color block */}
            <div className="h-1/3 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 relative">
              {/* Decorative patterns */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              
              {/* Church Info */}
              <div className="absolute top-6 left-0 w-full px-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  {church?.logo_url && (
                    <div className="w-10 h-10 bg-white rounded-full p-1 shadow-md shrink-0">
                      <img src={church.logo_url} className="w-full h-full object-cover rounded-full" alt="Logo" crossOrigin="anonymous" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-serif font-bold leading-tight drop-shadow-md line-clamp-2">{church?.name || 'Église Connect'}</p>
                    <p className="text-primary-200 text-[10px] uppercase tracking-widest font-bold">Membre Officiel</p>
                  </div>
                </div>
              </div>

              {/* Photo overlaps header and body */}
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-20">
                <div className="p-1.5 bg-white rounded-full shadow-xl">
                  {memberData?.photo_url ? (
                    <img 
                      src={memberData.photo_url} 
                      alt="Photo" 
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-50"
                      crossOrigin="anonymous" 
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-gray-50 flex items-center justify-center font-bold text-gray-400 text-3xl">
                      {memberData?.first_name?.[0]}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="h-2/3 bg-white pt-16 px-6 pb-6 flex flex-col items-center text-center relative z-10">
              
              <h3 className="text-2xl font-bold text-gray-900 mb-1 leading-tight">
                {memberData ? `${memberData.first_name} ${memberData.last_name}` : 'Utilisateur'}
              </h3>
              
              {/* Member role/function */}
              <div className="inline-block bg-primary-50 text-primary-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                {ledDepartments && ledDepartments.length > 0 ? 'Responsable' : 'Fidèle'}
              </div>

              {/* QR Code Container */}
              <div className="flex-1 w-full flex items-center justify-center">
                <div className="p-3 bg-white rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.05)] border border-gray-100">
                  {memberData ? (
                    <QRCodeSVG 
                      value={memberData.id}
                      size={140}
                      bgColor={"#ffffff"}
                      fgColor={"#0f172a"}
                      level={"Q"}
                      includeMargin={false}
                    />
                  ) : (
                    <div className="w-[140px] h-[140px] bg-gray-50 flex items-center justify-center text-gray-300 text-xs">N/A</div>
                  )}
                </div>
              </div>

              {/* Footer ID */}
              <div className="w-full mt-4 pt-4 border-t border-dashed border-gray-200">
                <p className="text-[10px] text-gray-400 font-mono tracking-widest">
                  ID: {memberData?.id ? memberData.id.split('-')[0].toUpperCase() : '000000'}
                </p>
              </div>
              
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mt-6 text-center max-w-xs">
            Cette carte est strictement personnelle. Présentez-la au scanner de l'église.
          </p>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {activeTab === 'departement' && ledDepartments && (
            <DepartmentLeaderWidget departments={ledDepartments} />
          )}
        </div>
      )}
      {isScanning && <ScannerModal onClose={() => setIsScanning(false)} />}
    </>
  )
}
