'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Mail, Phone, MessageCircle, MapPin, MoreVertical, Heart, Crown, Briefcase } from 'lucide-react'

interface Member {
  id: string
  first_name: string
  last_name: string
  photo_url: string | null
  phone: string | null
  status: string
  quartier: string | null
  commune: string | null
  profession: string | null
  needs_support: boolean
  functions: any
  birth_date?: string | null
  gender?: string | null
  marital_status?: string | null
  user_profiles?: { id: string; created_at: string; role?: string }[] | null
  created_at?: string
}

export default function DirectoryClient({ 
  initialMembers, 
  currentPage = 1,
  totalPages = 1,
  initialQuery = '',
  initialGroup = 'quartier'
}: { 
  initialMembers: Member[],
  currentPage?: number,
  totalPages?: number,
  initialQuery?: string,
  initialGroup?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [groupBy, setGroupBy] = useState<'quartier' | 'status' | 'function' | 'birthday' | 'gender' | 'marital'>(initialGroup as any)

  const [searchQuery, setSearchQuery] = useState(initialQuery)

  // Trigger search on the server
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchQuery(term)
    
    startTransition(() => {
      const params = new URLSearchParams()
      if (term) params.set('query', term)
      params.set('group', groupBy)
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const handleGroupChange = (group: 'quartier' | 'status' | 'function' | 'birthday' | 'gender' | 'marital') => {
    setGroupBy(group)
    startTransition(() => {
      const params = new URLSearchParams()
      if (searchQuery) params.set('query', searchQuery)
      params.set('group', group)
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const goToPage = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams()
      if (searchQuery) params.set('query', searchQuery)
      params.set('group', groupBy)
      params.set('page', page.toString())
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  // We filter the local 'initialMembers' into grouped categories
  const filteredMembers = initialMembers

  // Traduction des statuts pour un affichage lisible
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'membre_actif':
        return 'Membres Actifs'
      case 'visiteur_simple':
        return 'Visiteurs Simples'
      case 'visiteur_occasionnel':
        return 'Visiteurs par Moments'
      case 'member': // compatibilité ancienne
        return 'Membres Actifs'
      case 'visitor': // compatibilité ancienne
        return 'Visiteurs'
      default:
        return 'Statut Non Défini'
    }
  }

  // Grouper les membres dynamiquement selon le critère choisi
  const getGroupedMembers = () => {
    const groups: { [key: string]: Member[] } = {}

    if (groupBy === 'quartier') {
      filteredMembers.forEach(m => {
        const q = m.quartier || 'Non renseigné (Localisation globale)'
        if (!groups[q]) groups[q] = []
        groups[q].push(m)
      })
    } else if (groupBy === 'status') {
      filteredMembers.forEach(m => {
        const s = getStatusLabel(m.status)
        if (!groups[s]) groups[s] = []
        groups[s].push(m)
      })
    } else if (groupBy === 'function') {
      // Les fonctions sont stockées sous forme de JSON array ou string array
      filteredMembers.forEach(m => {
        let fns: string[] = []
        if (m.functions) {
          try {
            fns = typeof m.functions === 'string' ? JSON.parse(m.functions) : m.functions
          } catch {
            fns = Array.isArray(m.functions) ? m.functions : []
          }
        }

        // Pour éviter les titres trop longs et les doublons, on utilise uniquement le premier département (département principal)
        const groupName = (!fns || fns.length === 0) ? 'Sans Département / Groupe de service' : fns[0]
        if (!groups[groupName]) groups[groupName] = []
        groups[groupName].push(m)
      })
    } else if (groupBy === 'birthday') {
      const monthNames = ['01 - Janvier', '02 - Février', '03 - Mars', '04 - Avril', '05 - Mai', '06 - Juin', '07 - Juillet', '08 - Août', '09 - Septembre', '10 - Octobre', '11 - Novembre', '12 - Décembre']
      filteredMembers.forEach(m => {
        let groupName = 'Date de naissance inconnue'
        if (m.birth_date) {
           const date = new Date(m.birth_date)
           const month = date.getMonth()
           if (!isNaN(month)) groupName = monthNames[month]
        }
        if (!groups[groupName]) groups[groupName] = []
        groups[groupName].push(m)
      })
    } else if (groupBy === 'gender') {
      filteredMembers.forEach(m => {
        const groupName = m.gender === 'M' ? 'Hommes' : (m.gender === 'F' ? 'Femmes' : 'Non précisé')
        if (!groups[groupName]) groups[groupName] = []
        groups[groupName].push(m)
      })
    } else if (groupBy === 'marital') {
      filteredMembers.forEach(m => {
        const groupName = m.marital_status || 'Non précisé'
        if (!groups[groupName]) groups[groupName] = []
        groups[groupName].push(m)
      })
    }

    return groups
  }

  const grouped = getGroupedMembers()
  const sortedGroupKeys = Object.keys(grouped).sort()



  return (
    <div className="space-y-6">
      
      {/* Barre d'outils et recherche Glassmorphism */}
      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-5 md:p-6 rounded-3xl border border-white/80 dark:border-slate-700/50 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          
          {/* Recherche */}
          <div className="relative flex-1 max-w-xl">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher par nom, prénom ou téléphone..."
              value={searchQuery}
              onChange={handleSearch}
              className={`w-full pl-11 pr-4 py-3 bg-white/80 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-600 rounded-2xl text-gray-900 dark:text-white text-sm font-medium focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all shadow-inner ${isPending ? 'opacity-50' : ''}`}
            />
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Sélections de classement */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 whitespace-nowrap">Classer par :</span>
              <div className="flex flex-wrap bg-gray-100/50 dark:bg-slate-900/50 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 gap-1.5">
                {[
                  { id: 'function', icon: '🛠️', label: 'Département' },
                  { id: 'quartier', icon: '🏘️', label: 'Quartier' },
                  { id: 'status', icon: '🏷️', label: 'Statut' },
                  { id: 'birthday', icon: '🎂', label: 'Anniversaire' },
                  { id: 'gender', icon: '🚻', label: 'Genre' },
                  { id: 'marital', icon: '💍', label: 'Matrimonial' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleGroupChange(tab.id as any)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                      groupBy === tab.id
                        ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-300 shadow-md shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-slate-600'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:hover:text-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="mr-1.5">{tab.icon}</span>{tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Affichage des groupes de membres */}
      <div className="space-y-10">
        {sortedGroupKeys.length === 0 ? (
          <div className="py-12 text-center bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-dashed">
            <p className="text-gray-500 dark:text-gray-400">Aucun membre ne correspond à votre recherche.</p>
          </div>
        ) : (
          sortedGroupKeys.map((groupKey) => (
            <div key={groupKey} className="space-y-4">
              
              {/* Titre du groupe */}
              <div className="flex items-center gap-4 py-2">
                <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  {groupKey}
                </h3>
                <span className="px-3 py-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm text-gray-600 dark:text-gray-300 rounded-full text-xs font-bold border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
                  {grouped[groupKey].length} {grouped[groupKey].length > 1 ? 'membres' : 'membre'}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent dark:from-slate-700 dark:to-transparent"></div>
              </div>

              {/* Liste des cartes du groupe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {grouped[groupKey].map((member, index) => {
                  const isLeader = member.user_profiles?.[0]?.role === 'dept_leader' || member.user_profiles?.[0]?.role === 'admin';
                  
                  return (
                  <div 
                    onClick={() => router.push(`/dashboard/members/${member.id}`)}
                    key={member.id} 
                    className={`bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.3)] overflow-hidden border ${
                      isLeader
                        ? 'border-gold-300 dark:border-gold-500/50 hover:border-gold-400 dark:hover:border-gold-400'
                        : 'border-white/80 dark:border-slate-700/50 hover:border-primary-300 dark:hover:border-primary-500/50'
                    } transition-all duration-500 cursor-pointer group flex flex-col relative animate-in fade-in slide-in-from-bottom-8`}
                    style={{ animationFillMode: 'both', animationDelay: `${index * 50}ms`, transform: 'perspective(1000px)' }}
                  >
                    {/* Glowing effect background for leaders */}
                    {isLeader && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/20 dark:bg-gold-500/10 blur-2xl rounded-full pointer-events-none transition-all group-hover:bg-gold-400/30"></div>
                    )}
                    
                    <div className="p-5 flex-1 flex flex-col gap-4">
                      <div className="flex items-start gap-4">
                        {/* Photo ou initiales avec auréole pour les responsables */}
                        {member.photo_url ? (
                          <img 
                            src={member.photo_url} 
                            alt="" 
                            className={`w-14 h-14 rounded-2xl object-cover shadow-md flex-shrink-0 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300 ${
                              isLeader
                                ? 'ring-2 ring-gold-400 ring-offset-2 dark:ring-offset-slate-800'
                                : ''
                            }`}
                          />
                        ) : (
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-serif font-bold shadow-md flex-shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${
                            isLeader
                              ? 'bg-gradient-to-br from-gold-400 to-amber-600 ring-2 ring-gold-400 ring-offset-2 dark:ring-offset-slate-800'
                              : 'bg-gradient-to-br from-primary-500 to-primary-700'
                          }`}>
                            {member.first_name?.[0]}{member.last_name?.[0]}
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0 pt-1">
                          <h4 className={`font-bold text-lg leading-tight truncate transition-colors duration-300 ${
                            isLeader
                              ? 'text-gold-700 dark:text-gold-400 group-hover:text-gold-600 dark:group-hover:text-gold-300'
                              : 'text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400'
                          }`}>
                            {member.first_name} {member.last_name}
                          </h4>
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mt-1 truncate bg-gray-100 dark:bg-slate-800/50 inline-block px-2 py-0.5 rounded-full border border-gray-200/50 dark:border-slate-700/50">
                            {getStatusLabel(member.status)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {member.needs_support && (
                          <span className="inline-flex text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30 px-2 py-1 rounded-lg border border-red-100 dark:border-red-900/30 items-center gap-1">
                            <span>❤️</span> En Suivi
                          </span>
                        )}
                        {isLeader && (
                          <span className="inline-flex text-[10px] font-bold uppercase tracking-wider text-gold-700 bg-gold-50 dark:text-gold-300 dark:bg-gold-900/30 px-2 py-1 rounded-lg border border-gold-200 dark:border-gold-700/50 items-center gap-1 shadow-sm">
                            <span>👑</span> Responsable
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300 mt-auto bg-gray-50/80 dark:bg-slate-950/40 p-4 rounded-2xl border border-gray-100 dark:border-slate-800/50 shadow-inner">
                        {member.profession && (
                          <p className="flex items-center gap-2.5 truncate font-medium">
                            <Briefcase size={14} className="text-gray-400 dark:text-gray-500" /> <span className="truncate">{member.profession}</span>
                          </p>
                        )}
                        {member.commune && (
                          <p className="flex items-center gap-2.5 truncate font-medium">
                            <MapPin size={14} className="text-gray-400 dark:text-gray-500" /> <span className="truncate">{member.commune} {member.quartier ? `(${member.quartier})` : ''}</span>
                          </p>
                        )}
                        {!member.profession && !member.commune && (
                          <p className="text-gray-400 dark:text-gray-500 italic text-center text-xs my-2">Profil incomplet</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="px-4 pb-4 pt-0 flex gap-2" onClick={e => e.stopPropagation()}>
                      {member.phone && (
                        <>
                          <button 
                            type="button"
                            title="WhatsApp"
                            onClick={(e) => {
                              e.preventDefault()
                              let phone = member.phone?.replace(/[^0-9]/g, '') || ''
                              window.open(`https://wa.me/${phone}`, '_blank')
                            }} 
                            className="flex-1 flex items-center justify-center bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-900/30 dark:hover:bg-green-900/60 dark:text-green-400 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-1 border border-green-200 dark:border-green-800/50"
                          >
                            <MessageCircle size={18} />
                          </button>
                          <button 
                            type="button"
                            title="SMS"
                            onClick={(e) => {
                              e.preventDefault()
                              window.location.href = `sms:${member.phone}`
                            }} 
                            className="flex-1 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/60 dark:text-blue-400 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-1 border border-blue-200 dark:border-blue-800/50"
                          >
                            <Mail size={18} />
                          </button>
                          <button 
                            type="button"
                            title="Appeler"
                            onClick={(e) => {
                              e.preventDefault()
                              window.location.href = `tel:${member.phone}`
                            }} 
                            className="flex-1 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/60 dark:text-indigo-400 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-1 border border-indigo-200 dark:border-indigo-800/50"
                          >
                            <Phone size={18} />
                          </button>
                        </>
                      )}
                      <Link 
                        href={`/dashboard/visits`}
                        className="flex-[2] flex items-center justify-center gap-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 dark:from-slate-700 dark:to-slate-600 dark:hover:from-slate-600 dark:hover:to-slate-500 dark:text-white rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-1 text-xs font-bold border border-gray-200 dark:border-slate-600/50"
                      >
                        <Heart size={14} className="text-red-500" />
                        <span>Visite</span>
                      </Link>
                    </div>
                  </div>
                  )
                })}
              </div>

            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button 
            disabled={currentPage <= 1 || isPending}
            onClick={() => goToPage(currentPage - 1)}
            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Page {currentPage} sur {totalPages}
          </span>
          <button 
            disabled={currentPage >= totalPages || isPending}
            onClick={() => goToPage(currentPage + 1)}
            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Suivant
          </button>
        </div>
      )}

    </div>
  )
}
