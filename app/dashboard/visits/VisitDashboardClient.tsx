'use client'

import { useState, useMemo } from 'react'
import { VisitSuggestion } from '@/app/actions/getVisitSuggestions'
import { scheduleVisitAction } from '@/app/actions/scheduleVisit'
import { updateVisitStatusAction } from '@/app/actions/updateVisitStatus'

interface VisitDashboardClientProps {
  plannedVisits: any[]
  suggestions: VisitSuggestion[]
  team: any[]
}

export default function VisitDashboardClient({ plannedVisits, suggestions, team }: VisitDashboardClientProps) {
  const [selectedMember, setSelectedMember] = useState<VisitSuggestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  const handleScheduleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    // Add member id implicitly if not in form
    formData.append('member_id', selectedMember?.member_id || '')
    
    const res = await scheduleVisitAction(formData)
    setLoading(false)
    if (res.success) {
      setSelectedMember(null)
    } else {
      alert(res.error)
    }
  }

  const handleCompleteVisit = async (visitId: string) => {
    setActionLoadingId(visitId)
    const res = await updateVisitStatusAction(visitId, 'completed')
    setActionLoadingId(null)
    if (!res.success) {
      alert(res.error)
    }
  }

  const urgentVisitsCount = plannedVisits.filter(v => v.priority === 'high' && v.status !== 'completed').length;
  const teamActive = team.filter(t => t.role !== 'super_admin').length;
  const pendingVisits = plannedVisits.filter(v => v.status !== 'completed');

  // Filter logic
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(sug => {
      const matchesSearch = `${sug.first_name} ${sug.last_name} ${sug.quartier}`.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPriority = filterPriority === 'all' || sug.priority === filterPriority
      return matchesSearch && matchesPriority
    })
  }, [suggestions, searchQuery, filterPriority])

  return (
    <div className="w-full animate-fade-in space-y-8 pb-10">
      
      {/* Top Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 p-6 rounded-3xl shadow-xl flex items-center justify-between transform hover:-translate-y-1 transition-all duration-300">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Visites Planifiées</p>
            <h3 className="text-4xl font-black text-slate-900 dark:text-white">{pendingVisits.length}</h3>
          </div>
          <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-400 text-2xl shadow-inner">
            📅
          </div>
        </div>
        
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 p-6 rounded-3xl shadow-xl flex items-center justify-between transform hover:-translate-y-1 transition-all duration-300">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Urgences à Gérer</p>
            <h3 className="text-4xl font-black text-red-600 dark:text-red-400">{urgentVisitsCount}</h3>
          </div>
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 text-2xl shadow-inner">
            🚨
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 p-6 rounded-3xl shadow-xl flex items-center justify-between transform hover:-translate-y-1 transition-all duration-300">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Équipe Active</p>
            <h3 className="text-4xl font-black text-green-600 dark:text-green-400">{teamActive}</h3>
          </div>
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 dark:text-green-400 text-2xl shadow-inner">
            👥
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Suggestions */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* AI Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 shadow-2xl shadow-blue-900/20 text-white flex flex-col sm:flex-row items-center gap-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            
            <div className="relative flex-shrink-0">
              <span className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-40"></span>
              <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 text-4xl shadow-inner relative z-10">
                🤖
              </div>
            </div>
            
            <div className="text-center sm:text-left z-10 relative flex-1">
              <h2 className="text-2xl font-black mb-2 tracking-tight">Assistant Pastoral Intelligent</h2>
              <p className="text-blue-100 font-medium leading-relaxed max-w-xl">
                J'ai analysé les absences des 30 derniers jours et croisé les données des membres. Voici {suggestions.length} recommandations de visites pour garder le troupeau uni.
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="relative w-full sm:w-64">
              <input 
                type="text" 
                placeholder="Rechercher un membre..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium dark:text-white transition-all"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {['all', 'high', 'medium'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterPriority(type)}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${filterPriority === type ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                >
                  {type === 'all' ? 'Tous' : type === 'high' ? 'Urgents' : 'Suivis'}
                </button>
              ))}
            </div>
          </div>

          {/* Suggestions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSuggestions.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-3xl border border-white/20 border-dashed dark:border-slate-700 shadow-sm">
                <span className="text-5xl mb-4 grayscale opacity-50">✨</span>
                <p className="text-slate-500 font-bold text-lg">Aucun résultat trouvé.</p>
              </div>
            ) : (
              filteredSuggestions.map(sug => (
                <div key={sug.member_id} className="group bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700/50 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden flex flex-col h-full">
                  
                  {/* Glowing Priority Accent */}
                  <div className={`absolute top-0 inset-x-0 h-1.5 w-full ${sug.priority === 'high' ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-orange-400 to-amber-500'}`}></div>
                  
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        {sug.photo_url ? (
                          <img src={sug.photo_url} alt="" className="w-14 h-14 rounded-2xl object-cover shadow-md border-2 border-white dark:border-slate-700" />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 font-black text-lg shadow-inner">
                            {sug.first_name[0]}{sug.last_name[0]}
                          </div>
                        )}
                        {sug.priority === 'high' && (
                          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white dark:border-slate-800"></span>
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight group-hover:text-primary-600 transition-colors">{sug.first_name} {sug.last_name}</h3>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                          {sug.quartier || 'Inconnu'}
                        </p>
                      </div>
                    </div>
                    
                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${sug.priority === 'high' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                      {sug.priority === 'high' ? 'Urgent' : 'Suivi'}
                    </span>
                  </div>
                  
                  <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 mb-5 border border-slate-100 dark:border-slate-700/50 group-hover:bg-blue-50/50 dark:group-hover:bg-slate-900 transition-colors">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Motif suggéré</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic mb-3">"{sug.motif}"</p>
                    {sug.absencesCount > 0 && (
                       <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-100/50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-xs font-bold">
                         <span>⚠️</span> {sug.absencesCount} absences récentes
                       </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setSelectedMember(sug)}
                    className="w-full py-3.5 bg-slate-900 hover:bg-primary-600 text-white dark:bg-slate-700 dark:hover:bg-primary-600 rounded-xl text-sm font-black transition-all shadow-md hover:shadow-primary-500/25 flex items-center justify-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    Planifier
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Timeline of Planned Visits */}
        <div className="xl:col-span-1">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/50 p-6 sm:p-8 sticky top-24">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <span className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl text-primary-600 shadow-inner">📍</span> 
                Agenda
              </h2>
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">
                {pendingVisits.length} en cours
              </span>
            </div>

            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
              {pendingVisits.length === 0 ? (
                <p className="text-center text-slate-400 font-medium py-10 italic relative z-10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl">L'agenda est vide.</p>
              ) : (
                pendingVisits.map((visit, index) => (
                  <div key={visit.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    {/* Timeline Dot */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-800 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-md relative z-10 ${
                      visit.priority === 'high' ? 'bg-red-500' : visit.priority === 'low' ? 'bg-green-500' : 'bg-orange-500'
                    }`}>
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    
                    {/* Card */}
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm group-hover:shadow-md group-hover:-translate-y-1 transition-all relative overflow-hidden">
                      {actionLoadingId === visit.id && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
                           <svg className="animate-spin h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm line-clamp-1">
                          {visit.members?.first_name} {visit.members?.last_name}
                        </h4>
                        <button 
                          onClick={() => handleCompleteVisit(visit.id)}
                          title="Marquer comme terminée"
                          className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-green-500 hover:border-green-500 transition-colors shadow-sm"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </button>
                      </div>
                      <p className="text-xs font-bold text-primary-600 dark:text-gold-400 mb-2">
                        {new Date(visit.visit_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mb-3 leading-relaxed">"{visit.motif}"</p>
                      
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                        <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-700 dark:text-primary-300 text-[10px] font-bold shadow-inner">
                          {visit.user_profiles?.first_name ? visit.user_profiles.first_name[0] : '?'}
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{visit.user_profiles?.first_name || 'Non assigné'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ultra Premium Modal / Side-Sheet */}
      {selectedMember && (
        <div className="fixed inset-0 z-[9999] flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in"
            onClick={() => setSelectedMember(null)}
          ></div>
          
          {/* Sheet */}
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-right flex flex-col border-l border-slate-200 dark:border-slate-800">
            <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Planifier une Visite</h3>
              <button onClick={() => setSelectedMember(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              
              {/* Member Card Target */}
              <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 mb-8">
                {selectedMember.photo_url ? (
                  <img src={selectedMember.photo_url} alt="" className="w-14 h-14 rounded-full object-cover shadow-sm border-2 border-white dark:border-slate-700" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300 font-black text-xl border-2 border-white dark:border-slate-700 shadow-inner">
                    {selectedMember.first_name[0]}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-0.5">Destinataire</p>
                  <h4 className="font-black text-slate-900 dark:text-white text-lg">{selectedMember.first_name} {selectedMember.last_name}</h4>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400 mt-1 font-medium">{selectedMember.quartier || 'Lieu inconnu'} • {selectedMember.phone}</p>
                </div>
              </div>

              <form id="schedule-form" onSubmit={handleScheduleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Motif de la visite</label>
                  <textarea 
                    name="motif" 
                    required 
                    defaultValue={selectedMember.motif} 
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all dark:text-white text-sm resize-none"
                  ></textarea>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Date prévue</label>
                    <input 
                      type="date" 
                      name="visit_date" 
                      required 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all dark:text-white text-sm" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Niveau</label>
                    <div className="relative">
                      <select 
                        name="priority" 
                        defaultValue={selectedMember.priority} 
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all dark:text-white text-sm appearance-none font-bold"
                      >
                        <option value="high">🔴 Urgent</option>
                        <option value="medium">🟠 Suivi</option>
                        <option value="low">🟢 Courtoisie</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Responsable (Équipe)</label>
                  <div className="relative">
                    <select 
                      name="assigned_to" 
                      required 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all dark:text-white text-sm appearance-none"
                    >
                      <option value="">Sélectionner une personne...</option>
                      {team.filter(t => t.role !== 'super_admin').map(t => (
                        <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.role})</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <button 
                type="submit" 
                form="schedule-form"
                disabled={loading} 
                className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-xl font-black text-sm transition-all shadow-lg shadow-yellow-400/30 flex justify-center items-center gap-2 disabled:opacity-70 transform hover:-translate-y-1 active:translate-y-0"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    VALIDER LA VISITE
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

