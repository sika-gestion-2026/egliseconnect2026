'use client'

import { useState } from 'react'
import { assignDepartmentLeaderAction, removeDepartmentLeaderAction } from '@/app/actions/assignDepartmentLeader'
import { assignMutualManagerAction, removeMutualManagerAction } from '@/app/actions/mutualManager'

interface TeamDashboardClientProps {
  departments: { id: string, name: string }[]
  leaders: { id: string, department_id: string, members: any }[]
  members: any[]
  userProfiles?: any[]
}

const churchFunctions = [
  'Groupe musical (Chant/Instrument)',
  'Ancien de l\'église',
  'Service d\'ordre / Accueil',
  'Évangélisation & Mission',
  'Diacre / Diaconesse',
  'Protocole & Logistique',
  'Intercession / Prière',
  'Enseignement / École du dimanche',
  'Média / Sono / Communication',
  'Jeunesse',
  'Mutuelle'
]

export default function TeamDashboardClient({ departments, leaders, members, userProfiles = [] }: TeamDashboardClientProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const handleAssignLeader = async (e: React.FormEvent<HTMLFormElement>, deptName: string) => {
    e.preventDefault()
    setLoading(prev => ({ ...prev, [deptName]: true }))
    
    const formData = new FormData(e.currentTarget)
    formData.append('department_name', deptName)
    
    const result = await assignDepartmentLeaderAction(formData)
    setLoading(prev => ({ ...prev, [deptName]: false }))
    
    if (result.error) alert(result.error)
    else (e.target as HTMLFormElement).reset()
  }

  const handleRemoveLeader = async (leaderId: string, deptName: string) => {
    if (!confirm('Voulez-vous vraiment retirer ce responsable ?')) return
    
    setLoading(prev => ({ ...prev, [`remove_${leaderId}`]: true }))
    const result = await removeDepartmentLeaderAction(leaderId)
    setLoading(prev => ({ ...prev, [`remove_${leaderId}`]: false }))
    
    if (result.error) alert(result.error)
  }

  const handleAssignMutualManager = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(prev => ({ ...prev, 'mutual_manager': true }))
    
    const formData = new FormData(e.currentTarget)
    const userProfileId = formData.get('user_profile_id') as string
    
    const result = await assignMutualManagerAction(userProfileId)
    setLoading(prev => ({ ...prev, 'mutual_manager': false }))
    
    if (result.error) alert(result.error)
    else (e.target as HTMLFormElement).reset()
  }

  const handleRemoveMutualManager = async (userProfileId: string) => {
    if (!confirm('Voulez-vous vraiment retirer les accès à ce gestionnaire de mutuelle ?')) return
    
    setLoading(prev => ({ ...prev, [`remove_mutual_${userProfileId}`]: true }))
    const result = await removeMutualManagerAction(userProfileId)
    setLoading(prev => ({ ...prev, [`remove_mutual_${userProfileId}`]: false }))
    
    if (result.error) alert(result.error)
  }

  const mutualManagers = userProfiles.filter(up => up.role === 'mutual_manager')
  const potentialManagers = userProfiles.filter(up => up.role !== 'mutual_manager' && up.role !== 'super_admin' && up.role !== 'church_admin')

  return (
    <div className="space-y-8">
      {/* Section spéciale pour le Responsable de Mutuelle */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gold-400/30 flex flex-col">
        <h3 className="text-xl font-bold text-primary-900 dark:text-gold-400 mb-4 pb-2 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
          <span className="text-2xl">💰</span> Responsable de la Mutuelle
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Gestionnaires actuels</h4>
            {mutualManagers.length === 0 ? (
              <p className="text-sm text-gray-500 italic bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
                Aucun gestionnaire de mutuelle nommé.
              </p>
            ) : (
              <div className="space-y-2">
                {mutualManagers.map(manager => (
                  <div key={manager.id} className="flex justify-between items-center bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                        {manager.members?.photo_url ? (
                          <img src={manager.members.photo_url} alt={manager.members.first_name} className="w-full h-full object-cover" />
                        ) : (
                          manager.members?.first_name?.charAt(0).toUpperCase() || '?'
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white block">
                          {manager.members?.first_name} {manager.members?.last_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {manager.email}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveMutualManager(manager.id)} 
                      disabled={loading[`remove_mutual_${manager.id}`]}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-2 py-1 rounded transition-colors disabled:opacity-50"
                    >
                      {loading[`remove_mutual_${manager.id}`] ? '...' : 'Retirer'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Nommer un gestionnaire</h4>
            <form onSubmit={handleAssignMutualManager} className="space-y-3 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                Sélectionnez un membre disposant d'un compte sur l'application :
              </label>
              <div className="flex flex-col gap-2">
                <select 
                  name="user_profile_id" 
                  required 
                  className="w-full text-sm px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 bg-white"
                >
                  <option value="">Choisir un membre...</option>
                  {potentialManagers.length === 0 ? (
                    <option value="" disabled>Aucun compte membre éligible trouvé</option>
                  ) : (
                    potentialManagers.map(up => (
                      <option key={up.id} value={up.id}>
                        {up.members?.first_name} {up.members?.last_name} ({up.email})
                      </option>
                    ))
                  )}
                </select>
                <button 
                  type="submit" 
                  disabled={loading['mutual_manager'] || potentialManagers.length === 0} 
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-900/50 text-white text-sm font-bold py-2.5 rounded-md transition-colors shadow-sm"
                >
                  {loading['mutual_manager'] ? 'Assignation...' : 'Valider ce gestionnaire'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {churchFunctions.map(deptName => {
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
          <div key={deptName} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
            <h3 className="text-lg font-bold text-primary-900 dark:text-gold-400 mb-4 pb-2 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
              <span className="text-2xl">🏷️</span> {deptName}
            </h3>
            
            {/* Liste des responsables actuels */}
            <div className="flex-grow">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Responsables (Modérateurs)</h4>
              
              {deptLeaders.length === 0 ? (
                <p className="text-sm text-gray-500 italic bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-dashed border-gray-200 dark:border-slate-700 text-center">
                  Aucun responsable assigné pour le moment.
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {deptLeaders.map(leader => (
                    <div key={leader.id} className="flex justify-between items-center bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                          {leader.members?.photo_url ? (
                            <img src={leader.members.photo_url} alt={leader.members.first_name} className="w-full h-full object-cover" />
                          ) : (
                            leader.members?.first_name?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-gray-900 dark:text-white block">
                            {leader.members?.first_name} {leader.members?.last_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {leader.members?.phone || 'Pas de numéro'}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveLeader(leader.id, deptName)} 
                        disabled={loading[`remove_${leader.id}`]}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-2 py-1 rounded transition-colors disabled:opacity-50"
                      >
                        {loading[`remove_${leader.id}`] ? '...' : 'Retirer'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulaire d'assignation filtré */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
              <form onSubmit={(e) => handleAssignLeader(e, deptName)} className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nommer un nouveau responsable
                </label>
                <div className="flex flex-col gap-2">
                  <select 
                    name="member_id" 
                    required 
                    className="w-full text-sm px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 bg-white"
                  >
                    <option value="">Sélectionner un membre du groupe...</option>
                    {availableMembers.length === 0 ? (
                      <option value="" disabled>Aucun autre membre dans ce groupe</option>
                    ) : (
                      availableMembers.map(m => (
                        <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                      ))
                    )}
                  </select>
                  <button 
                    type="submit" 
                    disabled={loading[deptName] || availableMembers.length === 0} 
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-900/50 text-white text-sm font-bold py-2.5 rounded-md transition-colors shadow-sm"
                  >
                    {loading[deptName] ? 'Assignation...' : 'Valider'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
