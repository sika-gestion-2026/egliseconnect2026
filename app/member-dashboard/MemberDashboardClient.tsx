'use client'

import { useState } from 'react'
import RSVPWidget from './RSVPWidget'
import NotesWidget from './NotesWidget'
import DepartmentLeaderWidget from './DepartmentLeaderWidget'
import PrayerWall from './PrayerWall'
import { QRCodeSVG } from 'qrcode.react'

type MemberDashboardClientProps = {
  church: any
  memberData: any
  nextService: any
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

export default function MemberDashboardClient({ church, memberData, nextService, currentRsvp, initialNotes, activeAnnouncement, ledDepartments, stats, birthdaysToday, locationMembers, departmentMembers, championOfMonth, championOfYear }: MemberDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'notes' | 'departement' | 'communaute' | 'qrcode'>('home')

  const today = new Date()
  const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const mois = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']
  
  const defaultNoteTitle = nextService 
    ? `${nextService.name} - ${today.getDate()} ${mois[today.getMonth()]}` 
    : `Notes du ${jours[today.getDay()]} ${today.getDate()} ${mois[today.getMonth()]}`

  return (
    <>
      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar bg-white dark:bg-slate-800 rounded-xl p-1 mb-6 shadow-sm border border-gray-100 dark:border-slate-700">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'home' ? 'bg-primary-50 text-primary-900 dark:bg-slate-700 dark:text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-750'}`}
        >
          <span>🏠</span> Accueil
        </button>
        <button 
          onClick={() => setActiveTab('notes')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'notes' ? 'bg-primary-50 text-primary-900 dark:bg-slate-700 dark:text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-750'}`}
        >
          <span>📖</span> Mes Notes
        </button>
        <button 
          onClick={() => setActiveTab('communaute')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'communaute' ? 'bg-primary-50 text-primary-900 dark:bg-slate-700 dark:text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-750'}`}
        >
          <span>🤝</span> Communauté
        </button>
        <button 
          onClick={() => setActiveTab('qrcode')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'qrcode' ? 'bg-primary-50 text-primary-900 dark:bg-slate-700 dark:text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-750'}`}
        >
          <span>📱</span> QR Code
        </button>
        
        {ledDepartments && ledDepartments.length > 0 && (
          <button 
            onClick={() => setActiveTab('departement')}
            className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'departement' ? 'bg-gold-50 text-gold-900 dark:bg-gold-900/30 dark:text-gold-400 shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-750'}`}
          >
            <span>👑</span> Mon Département
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

            <div className="mb-8">
              <a href="/localisation" className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-md transition-colors">
                <span>📍</span> M'y rendre (Calcul d'itinéraire)
              </a>
            </div>

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
                      {b.photo_url ? (
                        <img src={b.photo_url} alt={b.first_name} className="w-12 h-12 rounded-full object-cover border-2 border-white" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center font-bold text-lg border-2 border-white">{b.first_name?.[0]}</div>
                      )}
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
                          <div className="absolute -top-3 -right-2 text-2xl animate-bounce">👑</div>
                          {championOfMonth.photo_url ? (
                            <img src={championOfMonth.photo_url} className="w-16 h-16 rounded-full object-cover border-2 border-gold-400 shadow-sm" />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gold-100 border-2 border-gold-400 flex items-center justify-center font-bold text-gold-700 text-xl">{championOfMonth.first_name[0]}</div>
                          )}
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
                          <div className="absolute -top-3 -right-2 text-2xl">🌿</div>
                          {championOfYear.photo_url ? (
                            <img src={championOfYear.photo_url} className="w-16 h-16 rounded-full object-cover border-2 border-indigo-400 shadow-sm" />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-indigo-100 border-2 border-indigo-400 flex items-center justify-center font-bold text-indigo-700 text-xl">{championOfYear.first_name[0]}</div>
                          )}
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

              {nextService && (
                <div className="md:col-span-2">
                  <RSVPWidget 
                    serviceId={nextService.id}
                    serviceName={nextService.name}
                    serviceDate={nextService.service_date}
                    serviceTime={nextService.service_time}
                    serviceType={nextService.type || 'regular'}
                    initialStatus={currentRsvp || undefined}
                  />
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

              <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <h2 className="text-xl font-bold text-blue-800 dark:text-blue-400 mb-4">Prochains Événements</h2>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <p className="mb-2">Restez connecté pour connaître les prochains événements de votre église.</p>
                  {nextService ? (
                    <p className="font-medium text-blue-900 dark:text-blue-300 mt-4">
                      Prochain: {nextService.name} le {nextService.service_date}
                    </p>
                  ) : (
                    <p className="text-gray-500">Aucun événement programmé.</p>
                  )}
                </div>
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
            
            {departmentMembers && departmentMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {departmentMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-4 p-4 border border-gray-100 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow">
                    {m.photo_url ? (
                      <img src={m.photo_url} className="w-14 h-14 rounded-full object-cover border-2 border-primary-100" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400 text-lg">{m.first_name[0]}</div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{m.first_name} {m.last_name[0]}.</p>
                      <a href={`tel:${m.phone}`} className="text-xs text-primary-600 hover:underline">{m.phone}</a>
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
                    {m.photo_url ? (
                      <img src={m.photo_url} className="w-14 h-14 rounded-full object-cover border-2 border-green-100" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center font-bold text-green-600 text-lg">{m.first_name[0]}</div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{m.first_name} {m.last_name[0]}.</p>
                      <p className="text-xs text-gray-500">{m.quartier || m.commune}</p>
                      <a href={`tel:${m.phone}`} className="text-xs text-green-600 hover:underline">{m.phone}</a>
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
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col items-center justify-center text-center">
          <h2 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold mb-2">
            Carte de Membre Numérique
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-md">
            Présentez ce QR Code à l'équipe d'accueil à l'entrée de l'église pour valider votre présence instantanément.
          </p>
          
          <div className="bg-white p-6 rounded-3xl shadow-lg border-4 border-primary-100 dark:border-primary-900/30 relative">
            <div className="absolute -top-4 -left-4 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-xl"></div>
            <div className="absolute -top-4 -right-4 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-xl"></div>
            <div className="absolute -bottom-4 -left-4 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-xl"></div>
            <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-xl"></div>
            
            {memberData ? (
              <QRCodeSVG 
                value={memberData.id}
                size={250}
                bgColor={"#ffffff"}
                fgColor={"#0f172a"}
                level={"H"}
                includeMargin={false}
                imageSettings={church?.logo_url ? {
                  src: church.logo_url,
                  x: undefined,
                  y: undefined,
                  height: 50,
                  width: 50,
                  excavate: true,
                } : undefined}
              />
            ) : (
              <div className="w-[250px] h-[250px] bg-gray-100 flex items-center justify-center text-gray-400 font-bold p-4">
                Aucun profil lié
              </div>
            )}
          </div>
          
          <p className="mt-8 text-xl font-bold text-gray-800 dark:text-white">
            {memberData ? `${memberData.first_name} ${memberData.last_name}` : 'Utilisateur Inconnu'}
          </p>
          <p className="text-sm font-mono text-gray-400 mt-2">ID: {memberData?.id ? memberData.id.split('-')[0] : 'N/A'}</p>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {activeTab === 'departement' && ledDepartments && (
            <DepartmentLeaderWidget departments={ledDepartments} />
          )}
        </div>
      )}
    </>
  )
}
