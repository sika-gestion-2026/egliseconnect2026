'use client'

import { useState } from 'react'
import { VisitSuggestion } from '@/app/actions/getVisitSuggestions'
import { scheduleVisitAction } from '@/app/actions/scheduleVisit'

interface VisitDashboardClientProps {
  plannedVisits: any[]
  suggestions: VisitSuggestion[]
  team: any[]
}

export default function VisitDashboardClient({ plannedVisits, suggestions, team }: VisitDashboardClientProps) {
  const [selectedMember, setSelectedMember] = useState<VisitSuggestion | null>(null)
  const [loading, setLoading] = useState(false)
  
  const handleScheduleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    // Add member id and suggested motif/priority implicitly if not in form
    formData.append('member_id', selectedMember?.member_id || '')
    
    const res = await scheduleVisitAction(formData)
    setLoading(false)
    if (res.success) {
      setSelectedMember(null)
    } else {
      alert(res.error)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Suggestions de l'Assistant Pastoral */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
          <span className="text-3xl animate-bounce">🤖</span>
          <div>
            <h2 className="text-lg font-bold text-blue-900 dark:text-blue-300">Assistant Pastoral Intelligent</h2>
            <p className="text-sm text-blue-700 dark:text-blue-400">J'ai analysé les absences des 30 derniers jours. Voici mes recommandations de visites prioritaires.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-gray-50 dark:bg-slate-800 rounded-xl text-gray-500">
              Aucune suggestion de visite pour le moment. Tout va bien !
            </div>
          ) : (
            suggestions.map(sug => (
              <div key={sug.member_id} className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md border-l-4 ${sug.priority === 'high' ? 'border-red-500' : 'border-orange-400'} flex flex-col h-full`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {sug.photo_url ? (
                      <img src={sug.photo_url} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-400 font-bold">
                        {sug.first_name[0]}{sug.last_name[0]}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-primary-900 dark:text-gold-400">{sug.first_name} {sug.last_name}</h3>
                      <p className="text-xs text-gray-500">{sug.phone || 'Pas de numéro'} • {sug.quartier || 'Quartier inconnu'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${sug.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                    {sug.priority === 'high' ? 'Urgent' : 'À Suivre'}
                  </span>
                </div>
                
                <div className="mt-2 mb-4 flex-1">
                  <div className="text-sm bg-gray-50 dark:bg-slate-750 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                    <p className="font-medium text-gray-700 dark:text-gray-300">Motif suggéré :</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 italic">"{sug.motif}"</p>
                    {sug.absencesCount > 0 && <p className="text-xs text-red-500 mt-2 font-bold">{sug.absencesCount} absences consécutives récentes</p>}
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedMember(sug)}
                  className="w-full py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gold-400 rounded-lg text-sm font-bold transition-colors"
                >
                  Planifier une visite
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Visites Planifiées */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 p-6 h-fit">
        <h2 className="text-xl font-serif font-bold text-primary-900 dark:text-gold-400 mb-6 flex items-center gap-2">
          <span>📅</span> Visites Planifiées
        </h2>

        <div className="space-y-4">
          {plannedVisits.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">Aucune visite programmée.</p>
          ) : (
            plannedVisits.map(visit => (
              <div key={visit.id} className="p-4 bg-gray-50 dark:bg-slate-750 rounded-lg border border-gray-200 dark:border-slate-600 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${visit.priority === 'high' ? 'bg-red-500' : visit.priority === 'low' ? 'bg-green-500' : 'bg-orange-400'}`}></div>
                
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-800 dark:text-white">
                    {visit.members?.first_name} {visit.members?.last_name}
                  </h4>
                  <span className="text-xs font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm">
                    {new Date(visit.visit_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{visit.motif}</p>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Resp: <span className="font-medium text-gray-600 dark:text-gray-300">{visit.user_profiles?.first_name || 'Non assigné'}</span></span>
                  <span className="text-gray-400">{visit.members?.quartier || 'Lieu inconnu'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL Planification */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-serif text-primary-900 dark:text-gold-400">Planifier une Visite</h3>
              <button onClick={() => setSelectedMember(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-750 rounded-lg">
              <p className="text-sm font-bold">Pour : {selectedMember.first_name} {selectedMember.last_name}</p>
              <p className="text-xs text-gray-500 mt-1">Recommandation de l'assistant : {selectedMember.motif}</p>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motif de la visite</label>
                <input type="text" name="motif" required defaultValue={selectedMember.motif} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white text-sm" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date prévue</label>
                  <input type="date" name="visit_date" required className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorité</label>
                  <select name="priority" defaultValue={selectedMember.priority} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white text-sm">
                    <option value="high">Haute (Urgent)</option>
                    <option value="medium">Moyenne (Suivi)</option>
                    <option value="low">Basse (Courtoisie)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigner à</label>
                <select name="assigned_to" required className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-white text-sm">
                  <option value="">Sélectionner un responsable...</option>
                  {team.filter(t => t.role !== 'super_admin').map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
                <button type="button" onClick={() => setSelectedMember(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Annuler</button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-primary-900 text-white hover:bg-primary-800 rounded-md shadow-sm disabled:opacity-50">
                  {loading ? 'Enregistrement...' : 'Planifier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
