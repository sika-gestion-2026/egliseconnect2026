'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

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
  user_profiles?: { id: string; created_at: string }[] | null
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
      
      {/* Barre d'outils et recherche */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Recherche */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher par nom, prénom ou téléphone..."
              value={searchQuery}
              onChange={handleSearch}
              className={`w-full pl-10 pr-4 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary-500 outline-none ${isPending ? 'opacity-50' : ''}`}
            />
          </div>

          <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
            {/* Sélections de classement */}
            <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Classer par :</span>
            <div className="flex flex-wrap bg-gray-100 dark:bg-slate-900 p-1 rounded-lg border dark:border-slate-700 gap-1">
              <button
                onClick={() => handleGroupChange('function')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  groupBy === 'function'
                    ? 'bg-primary-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                🛠️ Département
              </button>
              <button
                onClick={() => handleGroupChange('quartier')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  groupBy === 'quartier'
                    ? 'bg-primary-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                🏘️ Quartier
              </button>
              <button
                onClick={() => handleGroupChange('status')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  groupBy === 'status'
                    ? 'bg-primary-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                🏷️ Statut
              </button>
              <button
                onClick={() => handleGroupChange('birthday')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  groupBy === 'birthday'
                    ? 'bg-primary-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                🎂 Anniversaire
              </button>
              <button
                onClick={() => handleGroupChange('gender')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  groupBy === 'gender'
                    ? 'bg-primary-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                🚻 Genre
              </button>
              <button
                onClick={() => handleGroupChange('marital')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  groupBy === 'marital'
                    ? 'bg-primary-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                💍 Matrimonial
              </button>
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
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-serif font-bold text-primary-900 dark:text-gold-400 uppercase tracking-wide">
                  {groupKey}
                </h3>
                <span className="px-2.5 py-0.5 bg-primary-50 text-primary-900 dark:bg-slate-700 dark:text-gold-400 rounded-full text-xs font-bold border border-primary-100 dark:border-slate-650">
                  {grouped[groupKey].length} {grouped[groupKey].length > 1 ? 'membres' : 'membre'}
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-slate-750"></div>
              </div>

              {/* Liste des cartes du groupe */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {grouped[groupKey].map((member) => (
                  <div 
                    onClick={() => router.push(`/dashboard/members/${member.id}`)}
                    key={member.id} 
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-primary-300 transition-all cursor-pointer group p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start gap-4">
                      {/* Photo ou initiales */}
                      {member.photo_url ? (
                        <img 
                          src={member.photo_url} 
                          alt="" 
                          className="w-12 h-12 rounded-full object-cover shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gold-500 flex items-center justify-center text-white text-lg font-serif font-bold shadow-sm flex-shrink-0">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight truncate">
                            {member.first_name} {member.last_name}
                          </h4>
                          {member.needs_support && (
                            <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider text-red-600 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded-full border border-red-100 dark:border-red-900/30">
                              Suivi
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mt-0.5 truncate">
                          {getStatusLabel(member.status)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      {member.profession && (
                        <p className="flex items-center gap-2 truncate">
                          💼 <span className="truncate">{member.profession}</span>
                        </p>
                      )}
                      {member.commune && (
                        <p className="flex items-center gap-2 truncate">
                          📍 <span className="truncate">{member.commune} {member.quartier ? `(${member.quartier})` : ''}</span>
                        </p>
                      )}
                    </div>
                    
                    <div className="pt-2 mt-auto border-t dark:border-slate-750 flex gap-2">
                      {member.phone && (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.location.href = `tel:${member.phone}`
                          }} 
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:text-green-400 rounded-md transition-colors text-xs font-bold border border-green-200 dark:border-green-800"
                        >
                          📞 Appeler
                        </button>
                      )}
                      <Link 
                        href={`/dashboard/visits`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 dark:text-amber-400 rounded-md transition-colors text-xs font-bold border border-amber-200 dark:border-amber-800"
                      >
                        ✝️ {member.phone ? 'Visite' : 'Demander visite'}
                      </Link>
                    </div>
                  </div>
                ))}
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
