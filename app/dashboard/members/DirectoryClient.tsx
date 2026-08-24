'use client'

import { useState } from 'react'
import Link from 'next/link'

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
  user_profiles?: { id: string; created_at: string }[] | null
  created_at?: string
}

export default function DirectoryClient({ initialMembers }: { initialMembers: Member[] }) {
  const [members] = useState<Member[]>(initialMembers)
  const [groupBy, setGroupBy] = useState<'quartier' | 'status' | 'function'>('quartier')
  const [searchQuery, setSearchQuery] = useState('')

  // Filtrer les membres par la barre de recherche (recherche par nom, prénom ou téléphone)
  const filteredMembers = members.filter(m => {
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase()
    const query = searchQuery.toLowerCase()
    return fullName.includes(query) || (m.phone && m.phone.includes(query))
  })

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

        if (!fns || fns.length === 0) {
          const noGroup = 'Sans Département / Groupe de service'
          if (!groups[noGroup]) groups[noGroup] = []
          groups[noGroup].push(m)
        } else {
          fns.forEach(fn => {
            if (!groups[fn]) groups[fn] = []
            groups[fn].push(m)
          })
        }
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          {/* Sélections de classement */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Classer par :</span>
            <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-lg border dark:border-slate-700">
              <button
                onClick={() => setGroupBy('quartier')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  groupBy === 'quartier'
                    ? 'bg-primary-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                🏘️ Quartier
              </button>
              <button
                onClick={() => setGroupBy('status')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  groupBy === 'status'
                    ? 'bg-primary-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                🏷️ Statut
              </button>
              <button
                onClick={() => setGroupBy('function')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  groupBy === 'function'
                    ? 'bg-primary-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                🛠️ Département
              </button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {grouped[groupKey].map((member) => (
                  <Link 
                    href={`/dashboard/members/${member.id}`} 
                    key={member.id} 
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-primary-300 transition-all cursor-pointer block group"
                  >
                    <div className="h-16 bg-primary-900 relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-900 to-primary-750"></div>
                    </div>
                    <div className="relative px-6 pb-6">
                      
                      {/* Photo ou initiales */}
                      {member.photo_url ? (
                        <img 
                          src={member.photo_url} 
                          alt="" 
                          className="w-16 h-16 rounded-full object-cover absolute -top-8 border-4 border-white dark:border-slate-800 shadow-md group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gold-500 flex items-center justify-center text-white text-xl font-serif font-bold absolute -top-8 border-4 border-white dark:border-slate-800 shadow-sm">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </div>
                      )}
                      
                      {/* Badge Suivi si besoin d'accompagnement */}
                      {member.needs_support && (
                        <div className="absolute top-2 right-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-900/30">
                          Suivi
                        </div>
                      )}
                      
                      <div className="mt-10 space-y-2">
                        <div>
                          <h4 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                            {member.first_name} {member.last_name}
                          </h4>
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mt-1">
                            {getStatusLabel(member.status)}
                          </span>
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
                        
                        {member.phone && (
                          <div className="pt-3 mt-2 border-t dark:border-slate-750">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                window.location.href = `tel:${member.phone}`
                              }} 
                              className="flex items-center justify-center gap-2 w-full py-1.5 bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:text-green-400 rounded-md transition-colors text-xs font-bold border border-green-200 dark:border-green-800"
                            >
                              📞 Appeler
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  )
}
