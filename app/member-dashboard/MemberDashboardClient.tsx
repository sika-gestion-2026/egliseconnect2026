'use client'

import { useState } from 'react'
import RSVPWidget from './RSVPWidget'
import NotesWidget from './NotesWidget'
import DepartmentLeaderWidget from './DepartmentLeaderWidget'

type MemberDashboardClientProps = {
  church: any
  memberData: any
  nextService: any
  currentRsvp: string | null
  initialNotes: any[]
  activeAnnouncement?: any
  ledDepartments?: any[]
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

export default function MemberDashboardClient({ church, memberData, nextService, currentRsvp, initialNotes, activeAnnouncement, ledDepartments }: MemberDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'notes' | 'departement'>('home')

  return (
    <>
      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 mb-6 shadow-sm border border-gray-100 dark:border-slate-700">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-colors ${activeTab === 'home' ? 'bg-primary-50 text-primary-900 dark:bg-slate-700 dark:text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-750'}`}
        >
          <span>🏠</span> Accueil
        </button>
        <button 
          onClick={() => setActiveTab('notes')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-colors ${activeTab === 'notes' ? 'bg-primary-50 text-primary-900 dark:bg-slate-700 dark:text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-750'}`}
        >
          <span>📖</span> Mes Notes
        </button>
        
        {ledDepartments && ledDepartments.length > 0 && (
          <button 
            onClick={() => setActiveTab('departement')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-colors ${activeTab === 'departement' ? 'bg-gold-50 text-gold-900 dark:bg-gold-900/30 dark:text-gold-400 shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-750'}`}
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
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Bienvenue dans votre espace personnel de l'église <strong className="text-green-600 dark:text-green-400">{church?.name}</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
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
          <NotesWidget initialNotes={initialNotes} />
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
