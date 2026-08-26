'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { assignVolunteer, removeAssignment } from '@/app/actions/planning'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'

interface PlanningClientProps {
  events: any[]
  assignments: any[]
  members: any[]
}

const ROLES = ['Louange', 'Accueil', 'Technique/Régie', 'Modération', 'Sécurité']

export default function PlanningClient({ events, assignments: initialAssignments, members }: PlanningClientProps) {
  const router = useRouter()
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.id || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [assignments, setAssignments] = useState(initialAssignments)

  // Sync with server if props change
  useEffect(() => {
    setAssignments(prev => {
      // Keep assignments that were created locally in this session
      const localAdds = prev.filter(a => a._isLocal || String(a.id).startsWith('temp-') || String(a.id).startsWith('real-'))
      // Filter out from initialAssignments any that match the localAdds to avoid duplicates
      const serverAssignments = initialAssignments.filter(a => 
        !localAdds.some(la => la.service_id === a.service_id && la.member_id === a.member_id && la.role === a.role)
      )
      return [...serverAssignments, ...localAdds]
    })
  }, [initialAssignments])

  const activeEvent = events.find(e => e.id === selectedEvent)
  const eventAssignments = assignments.filter((a: any) => a.service_id === selectedEvent)

  const handleAssign = async (role: string, memberId: string) => {
    if (!memberId) return
    setIsSubmitting(true)

    // Optimistic update
    const memberDetails = members.find(m => m.id === memberId)
    const tempId = 'temp-' + Date.now()
    const newLocalAssignment = {
      id: tempId,
      service_id: selectedEvent,
      member_id: memberId,
      role: role,
      status: 'present',
      members: memberDetails,
      _isLocal: true // Robust flag to protect from stale cache
    }
    setAssignments((prev: any[]) => [...prev, newLocalAssignment])

    const res = await assignVolunteer(selectedEvent, memberId, role)
    setIsSubmitting(false)
    if (res.error) {
      toast.error(res.error)
      // Revert optimistic update
      setAssignments((prev: any[]) => prev.filter(a => a.id !== tempId))
    } else {
      toast.success('Serviteur assigné avec succès')
      // Update temp ID with real ID, but KEEP _isLocal flag so useEffect protects it
      if (res.assignment) {
        setAssignments((prev: any[]) => prev.map(a => a.id === tempId ? { ...a, id: res.assignment.id } : a))
      } else {
        setAssignments((prev: any[]) => prev.map(a => a.id === tempId ? { ...a, id: tempId.replace('temp-', 'real-') } : a))
      }
      router.refresh()
    }
  }

  const handleRemove = async (assignmentId: string) => {
    setIsSubmitting(true)

    // Optimistic removal
    const previousAssignments = [...assignments]
    setAssignments((prev: any[]) => prev.filter(a => a.id !== assignmentId))

    const res = await removeAssignment(assignmentId)
    setIsSubmitting(false)
    if (res.error) {
      toast.error(res.error)
      // Revert optimistic removal
      setAssignments(previousAssignments)
    } else {
      toast.success('Assignation supprimée')
      router.refresh()
    }
  }

  const getStatusBadge = (status: string, refusalReason?: string) => {
    switch (status) {
      case 'present': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded shadow-sm">Présent</span>
      case 'absent': return (
        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded shadow-sm flex items-center gap-1 group relative cursor-help">
          Absent
          {refusalReason && (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs p-2 rounded-lg z-20 shadow-lg text-center whitespace-normal">
                Motif: {refusalReason}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </>
          )}
        </span>
      )
      case 'replaced': return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded shadow-sm">Remplacé</span>
      default: return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded shadow-sm">En attente</span>
    }
  }



  const exportPDF = () => {
    window.print()
  }

  if (events.length === 0) {
    return <div className="p-8 text-center text-gray-500">Aucun événement futur programmé.</div>
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Event Selection Sidebar (Mini Calendar View) */}
      <div className="w-full md:w-1/3 space-y-4 print:hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Calendrier des Événements</h3>
        </div>
        
        <div className="space-y-3">
          {events.map((event, index) => {
            const dateObj = new Date(event.service_date)
            const day = dateObj.toLocaleDateString('fr-FR', { day: '2-digit' })
            const monthStr = dateObj.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()
            const isSelected = selectedEvent === event.id
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
                onClick={() => setSelectedEvent(event.id)}
                className={`relative flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border ${
                  isSelected 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-md ring-1 ring-primary-500' 
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-primary-300'
                } ${isClosest ? 'ring-2 ring-gold-500 shadow-sm' : ''}`}
              >
                {isClosest && (
                  <div className="absolute top-0 right-0 bg-gold-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-bl-lg rounded-tr-xl z-10 flex items-center gap-1">
                    🔥 Prochain
                  </div>
                )}
                
                <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg flex-shrink-0 text-white shadow-sm ${monthColorBg}`}>
                  <span className="text-xs font-bold leading-none opacity-90">{monthStr}</span>
                  <span className="text-xl font-black leading-none mt-1">{day}</span>
                </div>
                
                <div className="flex-1 min-w-0 pt-1">
                  <div className="font-bold text-gray-900 dark:text-white truncate">{event.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                    <span>🕒</span> {event.service_time?.substring(0, 5)}
                  </div>
                </div>
                
                <div className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 self-center">
                  {event.type}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Assignment Board */}
      <div className="w-full md:w-2/3 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 print:w-full print:border-none print:shadow-none print:p-0 print:bg-transparent">
        {activeEvent && (
          <>
            <div className="flex justify-between items-center mb-6 border-b dark:border-slate-700 pb-4 print:hidden">
              <h2 className="text-2xl font-bold text-primary-900 dark:text-gold-400">
                Planning : {activeEvent.name}
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowQRModal(true)}
                  className="flex items-center gap-2 text-sm font-bold bg-green-50 text-green-900 dark:bg-green-900/30 dark:text-green-100 px-3 py-1.5 rounded-md hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                >
                  <span>📱</span> QR Code Entrée
                </button>
                <button 
                  onClick={exportPDF}
                  className="flex items-center gap-2 text-sm font-bold bg-primary-50 text-primary-900 dark:bg-primary-900/30 dark:text-primary-100 px-3 py-1.5 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                >
                  <span>🖨️</span> Exporter PDF
                </button>
              </div>
            </div>

            <div id="planning-board-content" className="space-y-8 bg-white dark:bg-slate-800 p-2">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold dark:text-white">{activeEvent.name}</h3>
                <p className="text-gray-500">{new Date(activeEvent.service_date).toLocaleDateString('fr-FR')} - {activeEvent.service_time}</p>
              </div>
              {ROLES.map(role => {
                const roleAssignments = eventAssignments.filter(a => a.role === role)

                return (
                  <div key={role} className="border dark:border-slate-700 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 dark:bg-slate-900 p-3 border-b dark:border-slate-700 flex justify-between items-center">
                      <h4 className="font-bold text-gray-700 dark:text-gray-300">{role}</h4>
                      <select 
                        disabled={isSubmitting}
                        className="text-sm border rounded p-1 dark:bg-slate-800 dark:border-slate-600 outline-none print:hidden"
                        onChange={(e) => {
                          handleAssign(role, e.target.value)
                          e.target.value = "" // reset
                        }}
                      >
                        <option value="">+ Assigner qqn</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800">
                      {roleAssignments.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Personne assigné</p>
                      ) : (
                        <ul className="space-y-3">
                          {roleAssignments.map(assignment => (
                            <li key={assignment.id} className="flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 p-2 rounded-md border dark:border-slate-700">
                              <div className="flex items-center gap-3">
                                {assignment.members?.photo_url ? (
                                  <img src={assignment.members.photo_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-xs">
                                    {assignment.members?.first_name?.[0]}{assignment.members?.last_name?.[0]}
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                                    {assignment.members?.first_name} {assignment.members?.last_name}
                                  </div>
                                  <div className="mt-1">
                                    {getStatusBadge(assignment.status, assignment.refusal_reason)}
                                    {assignment.status === 'replaced' && assignment.replacement_member_id && (
                                      <span className="ml-2 text-xs text-gray-500">
                                        (Remplacé par {members.find(m => m.id === assignment.replacement_member_id)?.first_name})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="print:hidden">
                                {isSubmitting ? (
                                  <span className="text-xs text-gray-400">...</span>
                                ) : (
                                  <button 
                                    onClick={() => handleRemove(assignment.id)}
                                    className="text-red-500 hover:text-red-700 p-2"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
      {/* QR Code Modal for Printing */}
      {showQRModal && activeEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 print:bg-white print:p-0">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden relative print:shadow-none print:max-w-none">
            <button 
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-black/10 hover:bg-black/20 rounded-full transition-colors print:hidden"
            >
              ✕
            </button>
            
            <div className="p-12 text-center flex flex-col items-center">
              <h1 className="text-4xl font-black mb-2 text-primary-900 uppercase tracking-widest">{activeEvent.name}</h1>
              <p className="text-xl text-gray-600 mb-12 font-medium">
                {new Date(activeEvent.service_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {activeEvent.service_time?.substring(0, 5)}
              </p>
              
              <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-gray-100 mb-8 print:shadow-none print:border-none">
                <QRCodeSVG 
                  value={`EGLISE_CONNECT_CHECKIN_${activeEvent.id}`} 
                  size={400} 
                  level="H" 
                  includeMargin={true}
                />
              </div>

              <div className="bg-primary-50 rounded-xl p-6 max-w-md w-full border border-primary-100 print:bg-transparent print:border-none">
                <h3 className="font-bold text-lg text-primary-900 mb-2 flex items-center justify-center gap-2">
                  <span>📱</span> Scannez pour valider votre présence
                </h3>
                <p className="text-sm text-gray-700">Ouvrez votre Espace Membre Église Connect et utilisez le bouton "Scanner à l'entrée".</p>
              </div>

              <button 
                onClick={() => window.print()}
                className="mt-8 bg-black hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-colors print:hidden flex items-center gap-2"
              >
                <span>🖨️</span> Lancer l'impression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
