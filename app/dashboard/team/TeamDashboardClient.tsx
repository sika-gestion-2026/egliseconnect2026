'use client'

import { useState, useMemo } from 'react'
import { assignDepartmentLeaderAction, removeDepartmentLeaderAction } from '@/app/actions/assignDepartmentLeader'
import { assignMutualManagerAction, removeMutualManagerAction } from '@/app/actions/mutualManager'
import OptimizedAvatar from '@/components/OptimizedAvatar'

interface TeamDashboardClientProps {
  departments: { id: string, name: string }[]
  leaders: { id: string, department_id: string, members: any }[]
  members: any[]
  userProfiles?: any[]
}

const churchFunctions = [
  { name: 'Groupe musical (Chant/Instrument)', icon: '🎵' },
  { name: 'Ancien de l\'église', icon: '👴' },
  { name: 'Service d\'ordre / Accueil', icon: '🛡️' },
  { name: 'Évangélisation & Mission', icon: '🌍' },
  { name: 'Diacre / Diaconesse', icon: '🕊️' },
  { name: 'Protocole & Logistique', icon: '📋' },
  { name: 'Intercession / Prière', icon: '🙏' },
  { name: 'Enseignement / École du dimanche', icon: '📖' },
  { name: 'Média / Sono / Communication', icon: '🎥' },
  { name: 'Jeunesse', icon: '🔥' },
  { name: 'Mutuelle', icon: '🤝' }
]

export default function TeamDashboardClient({ departments, leaders, members, userProfiles = [] }: TeamDashboardClientProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')

  const handleAssignLeader = async (e: React.FormEvent<HTMLFormElement>, deptName: string) => {
    e.preventDefault()
    setLoading(prev => ({ ...prev, [deptName]: true }))
    
    const formData = new FormData(e.currentTarget)
    formData.append('department_name', deptName)
    
    const result = await assignDepartmentLeaderAction(formData)
    setLoading(prev => ({ ...prev, [deptName]: false }))
    
    if (result?.error) alert(result.error)
    else (e.target as HTMLFormElement).reset()
  }

  const handleRemoveLeader = async (leaderId: string) => {
    if (!confirm('Voulez-vous vraiment retirer ce responsable ?')) return
    
    setLoading(prev => ({ ...prev, [`remove_${leaderId}`]: true }))
    const result = await removeDepartmentLeaderAction(leaderId)
    setLoading(prev => ({ ...prev, [`remove_${leaderId}`]: false }))
    
    if (result?.error) alert(result.error)
  }

  const handleAssignMutualManager = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(prev => ({ ...prev, 'mutual_manager': true }))
    
    const formData = new FormData(e.currentTarget)
    const userProfileId = formData.get('user_profile_id') as string
    
    const result = await assignMutualManagerAction(userProfileId)
    setLoading(prev => ({ ...prev, 'mutual_manager': false }))
    
    if (result?.error) alert(result.error)
    else (e.target as HTMLFormElement).reset()
  }

  const handleRemoveMutualManager = async (userProfileId: string) => {
    if (!confirm('Voulez-vous vraiment retirer les accès à ce gestionnaire de mutuelle ?')) return
    
    setLoading(prev => ({ ...prev, [`remove_mutual_${userProfileId}`]: true }))
    const result = await removeMutualManagerAction(userProfileId)
    setLoading(prev => ({ ...prev, [`remove_mutual_${userProfileId}`]: false }))
    
    if (result?.error) alert(result.error)
  }

  const mutualManagers = userProfiles.filter(up => up.role === 'mutual_manager')
  const potentialManagers = userProfiles.filter(up => up.role !== 'mutual_manager' && up.role !== 'super_admin' && up.role !== 'church_admin')

  // Filtrer les départements selon la recherche
  const filteredFunctions = useMemo(() => {
    if (!searchQuery) return churchFunctions
    return churchFunctions.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [searchQuery])

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header Statistique */}
      <div className="bg-gradient-to-r from-primary-900 to-primary-700 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold mb-2">Équipes & Modérateurs</h2>
          <p className="text-primary-100 max-w-lg text-sm leading-relaxed">
            Gérez les responsables de chaque département. Un modérateur a le pouvoir de gérer les membres de son groupe et d'organiser les activités.
          </p>
        </div>
        <div className="flex gap-4 relative z-10">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center min-w-[120px]">
            <span className="block text-4xl font-black text-gold-400">{churchFunctions.length}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-100">Départements</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center min-w-[120px]">
            <span className="block text-4xl font-black text-white">{leaders.length}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-100">Modérateurs</span>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative max-w-xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Rechercher une équipe..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border-none rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500 transition-shadow text-gray-900 dark:text-white"
        />
      </div>

      {/* Section spéciale pour le Responsable de Mutuelle */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800 p-8 rounded-3xl shadow-sm border border-gold-400/40 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 group-hover:bg-gold-400/20 transition-all"></div>
        <h3 className="text-2xl font-bold text-amber-900 dark:text-gold-400 mb-6 flex items-center gap-3">
          <span className="text-3xl bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm">💰</span> 
          Gestion Privilégiée Mutuelle
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
          {/* Liste Mutuelle */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wide">Gestionnaires actuels</h4>
            {mutualManagers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 bg-white/60 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-dashed border-amber-200 dark:border-slate-700">
                <span className="text-3xl mb-2 opacity-50">🛡️</span>
                <p className="text-sm text-amber-700/70 dark:text-amber-200/50 font-medium">Aucun gestionnaire assigné</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mutualManagers.map(manager => (
                  <div key={manager.id} className="group/card flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-2xl border border-amber-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <OptimizedAvatar 
                        src={manager.members?.photo_url} 
                        alt={manager.members?.first_name || 'Avatar'}
                        fallbackInitials={manager.members?.first_name || '?'}
                        size={48} 
                      />
                      <div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white block">
                          {manager.members?.first_name} {manager.members?.last_name}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {manager.email}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveMutualManager(manager.id)} 
                      disabled={loading[`remove_mutual_${manager.id}`]}
                      className="text-red-500 hover:text-white hover:bg-red-500 bg-red-50 dark:bg-red-500/10 dark:hover:bg-red-500 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {loading[`remove_mutual_${manager.id}`] ? 'Patientez...' : 'Révoquer'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Formulaire Mutuelle */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wide">Nommer un gestionnaire</h4>
            <form onSubmit={handleAssignMutualManager} className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-sm p-5 rounded-2xl border border-amber-100 dark:border-slate-700">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">
                Sélectionnez un membre disposant d'un compte sur l'application :
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <select 
                  name="user_profile_id" 
                  required 
                  className="flex-grow text-sm px-4 py-3 border-none rounded-xl dark:bg-slate-800 bg-white shadow-sm ring-1 ring-amber-200 dark:ring-slate-700 focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="">Choisir un membre...</option>
                  {potentialManagers.length === 0 ? (
                    <option value="" disabled>Aucun compte membre éligible trouvé</option>
                  ) : (
                    potentialManagers.map(up => (
                      <option key={up.id} value={up.id}>
                        {up.members?.first_name} {up.members?.last_name}
                      </option>
                    ))
                  )}
                </select>
                <button 
                  type="submit" 
                  disabled={loading['mutual_manager'] || potentialManagers.length === 0} 
                  className="sm:w-auto w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-orange-500/30 hover:shadow-lg hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading['mutual_manager'] ? 'En cours...' : 'Autoriser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Grille des Départements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredFunctions.map(dept => {
        const deptName = dept.name
        // Trouver le département en base s'il existe
        const dbDept = departments.find(d => d.name === deptName)
        // Récupérer les leaders actuels
        const deptLeaders = dbDept ? leaders.filter(l => l.department_id === dbDept.id) : []
        
        // Filtrer les membres éligibles (ceux qui ont coché cette fonction)
        const eligibleMembers = members.filter(m => {
          try {
            const fns = JSON.parse(m.functions || '[]')
            return fns.includes(deptName)
          } catch (e) {
            return false
          }
        })
        
        // Filtrer les membres éligibles pour ne pas afficher ceux déjà assignés
        const availableMembers = eligibleMembers.filter(m => !deptLeaders.some(l => l.members?.id === m.id))

        return (
          <div key={deptName} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-slate-700 flex flex-col group">
            {/* Titre Département */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {dept.icon}
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                  {deptName}
                </h3>
              </div>
              {deptLeaders.length > 0 && (
                <span className="bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300 text-xs font-black px-2.5 py-1 rounded-full">
                  {deptLeaders.length}
                </span>
              )}
            </div>
            
            {/* Liste des responsables actuels */}
            <div className="flex-grow space-y-3 mb-6">
              {deptLeaders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-4 bg-gray-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 text-center">
                  <span className="text-gray-400 text-xs font-medium">Aucun modérateur</span>
                </div>
              ) : (
                deptLeaders.map(leader => (
                  <div key={leader.id} className="flex justify-between items-center bg-gray-50 dark:bg-slate-900/80 p-2.5 rounded-2xl border border-gray-100 dark:border-slate-700/50 group/item">
                    <div className="flex items-center gap-3">
                      <OptimizedAvatar 
                        src={leader.members?.photo_url} 
                        alt={leader.members?.first_name || 'Avatar'}
                        fallbackInitials={leader.members?.first_name || '?'}
                        size={32} 
                      />
                      <div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white block line-clamp-1">
                          {leader.members?.first_name} {leader.members?.last_name}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                          Modérateur
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveLeader(leader.id)} 
                      disabled={loading[`remove_${leader.id}`]}
                      title="Retirer"
                      className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-all disabled:opacity-50 opacity-0 group-hover/item:opacity-100 focus:opacity-100"
                    >
                      {loading[`remove_${leader.id}`] ? (
                        <span className="text-xs">...</span>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Formulaire d'assignation */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-700/50 mt-auto">
              <form onSubmit={(e) => handleAssignLeader(e, deptName)} className="flex flex-col gap-2">
                <select 
                  name="member_id" 
                  required 
                  className="w-full text-xs font-medium px-3 py-2.5 border-none rounded-xl dark:bg-slate-900 bg-gray-50 ring-1 ring-gray-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500 text-gray-700 dark:text-gray-300"
                >
                  <option value="">+ Ajouter un modérateur</option>
                  {availableMembers.length === 0 ? (
                    <option value="" disabled>Aucun membre disponible</option>
                  ) : (
                    availableMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                    ))
                  )}
                </select>
                <button 
                  type="submit" 
                  disabled={loading[deptName] || availableMembers.length === 0} 
                  className="w-full bg-primary-900 hover:bg-primary-800 disabled:bg-gray-200 dark:disabled:bg-slate-700 disabled:text-gray-400 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
                >
                  {loading[deptName] ? 'En cours...' : 'Assigner'}
                </button>
              </form>
            </div>
          </div>
        )
      })}
      
      {filteredFunctions.length === 0 && (
        <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500">
          <span className="text-4xl mb-3">🔍</span>
          <p className="font-medium">Aucun département ne correspond à votre recherche.</p>
        </div>
      )}
      </div>
    </div>
  )
}
