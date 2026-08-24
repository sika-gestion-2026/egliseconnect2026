'use client'

import { useState } from 'react'
import { createDepartmentAction } from '@/app/actions/createDepartment'
import { assignDepartmentLeaderAction, removeDepartmentLeaderAction } from '@/app/actions/assignDepartmentLeader'

interface TeamDashboardClientProps {
  departments: any[]
  leaders: any[]
  members: any[]
}

export default function TeamDashboardClient({ departments, leaders, members }: TeamDashboardClientProps) {
  const [loading, setLoading] = useState(false)

  const handleCreateDepartment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await createDepartmentAction(formData)
    setLoading(false)
    if (result.error) alert(result.error)
    else (e.target as HTMLFormElement).reset()
  }

  const handleAssignLeader = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await assignDepartmentLeaderAction(formData)
    setLoading(false)
    if (result.error) alert(result.error)
    else (e.target as HTMLFormElement).reset()
  }

  const handleRemoveLeader = async (leaderId: string) => {
    if (!confirm('Voulez-vous vraiment retirer ce responsable ?')) return
    const result = await removeDepartmentLeaderAction(leaderId)
    if (result.error) alert(result.error)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Colonne de gauche : Création et assignation */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <h2 className="text-xl font-bold text-primary-900 dark:text-gold-400 mb-4">Créer un Département</h2>
          <form onSubmit={handleCreateDepartment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du département</label>
              <input type="text" name="name" required placeholder="ex: Chorale, Intercession" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optionnelle)</label>
              <textarea name="description" rows={2} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700"></textarea>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-md transition-colors">
              {loading ? 'Création...' : 'Créer le département'}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <h2 className="text-xl font-bold text-primary-900 dark:text-gold-400 mb-4">Assigner un Responsable</h2>
          <form onSubmit={handleAssignLeader} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Département</label>
              <select name="department_id" required className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700">
                <option value="">Sélectionner un département...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Membre (Responsable)</label>
              <select name="member_id" required className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700">
                <option value="">Sélectionner un membre...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-gold-500 hover:bg-gold-600 text-white py-2 rounded-md transition-colors font-medium">
              {loading ? 'Assignation...' : 'Nommer Responsable'}
            </button>
          </form>
        </div>
      </div>

      {/* Colonne de droite : Liste des départements et responsables */}
      <div className="space-y-4">
        {departments.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl text-center shadow-sm border border-gray-100 dark:border-slate-700 text-gray-500">
            Aucun département créé pour le moment.
          </div>
        ) : (
          departments.map(dept => {
            const deptLeaders = leaders.filter(l => l.department_id === dept.id)
            
            return (
              <div key={dept.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-xl">🏢</span> {dept.name}
                </h3>
                {dept.description && <p className="text-sm text-gray-500 mt-1">{dept.description}</p>}
                
                <div className="mt-4 border-t dark:border-slate-700 pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Responsables (Modérateurs)</h4>
                  {deptLeaders.length === 0 ? (
                    <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/10 p-2 rounded italic">Aucun responsable assigné.</p>
                  ) : (
                    <div className="space-y-2">
                      {deptLeaders.map(leader => (
                        <div key={leader.id} className="flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 p-2 rounded-md border border-gray-100 dark:border-slate-700">
                          <div>
                            <span className="text-sm font-medium">{leader.members?.first_name} {leader.members?.last_name}</span>
                            <span className="text-xs text-gray-500 block">{leader.members?.phone}</span>
                          </div>
                          <button onClick={() => handleRemoveLeader(leader.id)} className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded bg-red-50 dark:bg-red-900/20">
                            Retirer
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
