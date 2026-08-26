'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function PublicPlanningClient({ events, assignments }: { events: any[], assignments: any[] }) {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '')

  const activeEvent = events.find(e => e.id === selectedEventId)
  const activeAssignments = assignments.filter(a => a.service_id === selectedEventId)

  // Group assignments by role
  const roles = Array.from(new Set(activeAssignments.map(a => a.role)))

  const handlePrint = () => {
    window.print()
  }

  if (events.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center shadow-sm border border-gray-100 dark:border-slate-700">
        <p className="text-gray-500">Aucun programme disponible pour le moment.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar - Event list */}
      <div className="w-full md:w-1/3 space-y-3 print:hidden">
        {events.map((event, index) => {
          const isSelected = selectedEventId === event.id
          const dateObj = new Date(event.service_date)
          const isClosest = index === 0
          
          const monthColors = [
            'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
            'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
            'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
          ];
          const monthColorBg = monthColors[dateObj.getMonth()];
          
          return (
            <div 
              key={event.id}
              onClick={() => setSelectedEventId(event.id)}
              className={`relative flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border ${
                isSelected 
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-md ring-1 ring-purple-500' 
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-purple-300'
              } ${isClosest ? 'ring-2 ring-gold-500 shadow-sm' : ''}`}
            >
              {isClosest && (
                <div className="absolute top-0 right-0 bg-gold-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-bl-lg rounded-tr-xl z-10 flex items-center gap-1">
                  🔥 Prochain
                </div>
              )}
              
              <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg flex-shrink-0 text-white shadow-sm ${monthColorBg}`}>
                <span className="text-[10px] font-bold leading-none uppercase opacity-90">{format(dateObj, 'MMM', { locale: fr })}</span>
                <span className="text-lg font-black leading-none mt-1">{format(dateObj, 'dd')}</span>
              </div>
              
              <div className="flex-1 min-w-0 pt-1">
                <div className="font-bold text-sm text-gray-900 dark:text-white truncate">{event.name}</div>
                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <span>🕒</span> {event.service_time?.substring(0, 5)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content - Print Area */}
      <div className="w-full md:w-2/3">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden relative print:shadow-none print:border-none print:w-full">
          
          {/* Header Action */}
          <div className="absolute top-4 right-4 z-10 print:hidden">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
            >
              🖨️ Imprimer la fiche
            </button>
          </div>

          {activeEvent ? (
            <div className="p-8 md:p-12 print:p-0">
              <div className="text-center mb-10 border-b-2 border-purple-100 dark:border-slate-700 pb-8">
                <div className="inline-block px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs font-bold tracking-widest uppercase mb-4">
                  Fiche de Service
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white font-serif mb-3">
                  {activeEvent.name}
                </h2>
                <div className="flex items-center justify-center gap-4 text-gray-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    📅 {format(new Date(activeEvent.service_date), 'EEEE d MMMM yyyy', { locale: fr })}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    🕒 {activeEvent.service_time?.substring(0, 5)}
                  </span>
                </div>
              </div>

              {roles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-4">🤔</p>
                  <p className="text-gray-500 font-medium">Aucun ouvrier n'a encore été assigné pour ce culte.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-4">
                  {roles.map(role => (
                    <div key={role} className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-5 border border-gray-100 dark:border-slate-700 print:border-2 print:border-gray-200 print:bg-transparent">
                      <h3 className="font-bold text-purple-900 dark:text-purple-400 text-lg mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-slate-700 pb-2 print:border-gray-300">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        {role}
                      </h3>
                      
                      <ul className="space-y-3">
                        {activeAssignments.filter(a => a.role === role).map(assignment => (
                          <li key={assignment.id} className="flex items-center gap-3">
                            {assignment.members?.photo_url ? (
                              <img src={assignment.members.photo_url} className="w-8 h-8 rounded-full object-cover shadow-sm print:hidden" alt="" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shadow-sm print:hidden">
                                {assignment.members?.first_name?.[0]}{assignment.members?.last_name?.[0]}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                                {assignment.members?.first_name} {assignment.members?.last_name}
                              </div>
                              {assignment.status === 'replaced' && (
                                <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded ml-1 print:text-black print:bg-transparent">
                                  Remplacé
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-12 pt-6 border-t border-gray-200 dark:border-slate-700 text-center text-xs text-gray-400 hidden print:block">
                Généré par Église Connect • Ne pas jeter sur la voie publique
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
