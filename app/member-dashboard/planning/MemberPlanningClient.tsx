'use client'

import { useState } from 'react'
import { updateAssignmentStatus } from '@/app/actions/planning'
import toast from 'react-hot-toast'

export default function MemberPlanningClient({ assignments, allMembers }: { assignments: any[], allMembers: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [replacingId, setReplacingId] = useState<string | null>(null)

  const handleStatusChange = async (assignmentId: string, status: 'pending' | 'present' | 'absent' | 'replaced', replacementMemberId?: string) => {
    setLoadingId(assignmentId)
    const res = await updateAssignmentStatus(assignmentId, status, replacementMemberId)
    setLoadingId(null)
    setReplacingId(null)
    
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Statut mis à jour')
    }
  }

  if (assignments.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center shadow-sm border border-gray-100 dark:border-slate-700">
        <p className="text-gray-500">Vous n'avez aucune assignation pour le moment.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {assignments.map(assignment => {
        const event = assignment.church_services
        const isReplacing = replacingId === assignment.id
        
        return (
          <div key={assignment.id} className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-primary-900 dark:text-white">{event.name}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(event.service_date).toLocaleDateString('fr-FR')} à {event.service_time}
                </p>
              </div>
              <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-wider">
                {assignment.role}
              </span>
            </div>
            
            <div className="mt-auto space-y-3 pt-4 border-t dark:border-slate-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirmez votre présence :</p>
              
              {!isReplacing ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleStatusChange(assignment.id, 'present')}
                    disabled={loadingId === assignment.id}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${
                      assignment.status === 'present' 
                      ? 'bg-green-500 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-800 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-green-900/50'
                    }`}
                  >
                    ✅ Présent
                  </button>
                  <button
                    onClick={() => handleStatusChange(assignment.id, 'absent')}
                    disabled={loadingId === assignment.id}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${
                      assignment.status === 'absent' 
                      ? 'bg-red-500 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-800 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-red-900/50'
                    }`}
                  >
                    ❌ Absent
                  </button>
                  <button
                    onClick={() => setReplacingId(assignment.id)}
                    disabled={loadingId === assignment.id}
                    className={`col-span-2 py-2 rounded-lg text-sm font-bold transition-all ${
                      assignment.status === 'replaced' 
                      ? 'bg-purple-500 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-800 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-purple-900/50'
                    }`}
                  >
                    🔄 Remplacé
                  </button>
                </div>
              ) : (
                <div className="space-y-3 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-100 dark:border-purple-800/30">
                  <label className="text-xs font-bold text-purple-900 dark:text-purple-300">Qui vous remplace ?</label>
                  <select 
                    className="w-full text-sm border rounded-lg p-2 dark:bg-slate-800 dark:border-slate-600 outline-none focus:ring-2 focus:ring-purple-500"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleStatusChange(assignment.id, 'replaced', e.target.value)
                      } else {
                        setReplacingId(null)
                      }
                    }}
                  >
                    <option value="">Sélectionnez un membre...</option>
                    {allMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => setReplacingId(null)}
                    className="w-full text-xs font-bold text-gray-500 hover:text-gray-700"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
