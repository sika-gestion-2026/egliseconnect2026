'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { assignVolunteer, removeAssignment, sendReminderNotification } from '@/app/actions/planning'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  ChevronDown,
  X,
  UserPlus,
  Bell
} from 'lucide-react'

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
  const [remindingId, setRemindingId] = useState<string | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [assignments, setAssignments] = useState(initialAssignments)

  // Custom Combobox state
  const [activeRoleMenu, setActiveRoleMenu] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  // Close custom menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.assign-menu-container')) {
        setActiveRoleMenu(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Sync with server if props change
  useEffect(() => {
    setAssignments(prev => {
      const localAdds = prev.filter(a => a._isLocal || String(a.id).startsWith('temp-') || String(a.id).startsWith('real-'))
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
    setActiveRoleMenu(null)
    setSearchQuery('')

    const memberDetails = members.find(m => m.id === memberId)
    const tempId = 'temp-' + Date.now()
    const newLocalAssignment = {
      id: tempId,
      service_id: selectedEvent,
      member_id: memberId,
      role: role,
      status: 'present',
      members: memberDetails,
      _isLocal: true 
    }
    setAssignments((prev: any[]) => [...prev, newLocalAssignment])

    const res = await assignVolunteer(selectedEvent, memberId, role)
    setIsSubmitting(false)
    if (res.error) {
      toast.error(res.error)
      setAssignments((prev: any[]) => prev.filter(a => a.id !== tempId))
    } else {
      toast.success('Serviteur assigné avec succès', {
        icon: '👏',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      })
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
    const previousAssignments = [...assignments]
    setAssignments((prev: any[]) => prev.filter(a => a.id !== assignmentId))

    const res = await removeAssignment(assignmentId)
    setIsSubmitting(false)
    if (res.error) {
      toast.error(res.error)
      setAssignments(previousAssignments)
    } else {
      toast.success('Assignation supprimée')
      router.refresh()
    }
  }

  const handleRemind = async (assignmentId: string, memberName: string) => {
    setRemindingId(assignmentId)
    const res = await sendReminderNotification(assignmentId)
    setRemindingId(null)
    
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`Rappel envoyé à ${memberName}`, {
        icon: '🔔',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      })
    }
  }

  const getStatusBadge = (status: string, refusalReason?: string) => {
    switch (status) {
      case 'present': return (
        <span className="flex items-center gap-1 bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm">
          <CheckCircle2 size={12} /> Présent
        </span>
      )
      case 'absent': return (
        <span className="flex items-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm group relative cursor-help">
          <XCircle size={12} /> Absent
          {refusalReason && (
            <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs p-2 rounded-lg z-20 shadow-xl border border-white/10 text-center whitespace-normal">
              Motif: {refusalReason}
            </div>
          )}
        </span>
      )
      case 'replaced': return (
        <span className="flex items-center gap-1 bg-purple-500/10 text-purple-500 border border-purple-500/20 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm">
          <Users size={12} /> Remplacé
        </span>
      )
      default: return (
        <span className="flex items-center gap-1 bg-gray-500/10 text-gray-500 border border-gray-500/20 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full backdrop-blur-sm">
          <Clock size={12} /> En attente
        </span>
      )
    }
  }

  const exportPDF = () => {
    window.print()
  }

  const filteredMembers = members.filter(m => 
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (events.length === 0) {
    return <div className="p-8 text-center text-gray-500">Aucun événement futur programmé.</div>
  }

  // Calculate some stats
  const totalAssigned = eventAssignments.length
  const presentCount = eventAssignments.filter(a => a.status === 'present').length
  const progressPercent = totalAssigned > 0 ? (presentCount / totalAssigned) * 100 : 0

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Event Selection Sidebar (Mini Calendar View) */}
      <div className="w-full md:w-1/3 space-y-4 print:hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl text-gray-900 dark:text-white flex items-center gap-2">
            📅 Calendrier
          </h3>
        </div>
        
        <div className="space-y-4">
          {events.map((event, index) => {
            const dateObj = new Date(event.service_date)
            const day = dateObj.toLocaleDateString('fr-FR', { day: '2-digit' })
            const monthStr = dateObj.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()
            const isSelected = selectedEvent === event.id
            const isClosest = index === 0

            const monthColors = [
              'from-red-500 to-rose-600', 'from-orange-500 to-amber-600', 'from-amber-400 to-orange-500', 
              'from-emerald-400 to-green-600', 'from-teal-400 to-emerald-600', 'from-cyan-400 to-blue-600', 
              'from-sky-400 to-blue-600', 'from-blue-500 to-indigo-600', 'from-indigo-500 to-purple-600', 
              'from-violet-500 to-purple-600', 'from-purple-500 to-fuchsia-600', 'from-pink-500 to-rose-600'
            ];
            const monthColorBg = monthColors[dateObj.getMonth()];

            return (
              <div 
                key={event.id}
                onClick={() => setSelectedEvent(event.id)}
                className={`relative flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${
                  isSelected 
                  ? 'border-white/20 bg-white/40 dark:bg-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md scale-[1.02]' 
                  : 'border-transparent bg-white/20 dark:bg-slate-800/20 hover:bg-white/40 dark:hover:bg-slate-800/40 hover:scale-[1.01]'
                }`}
              >
                {isClosest && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg z-10 flex items-center gap-1 border border-white/20 backdrop-blur-md animate-pulse">
                    🔥 Prochain
                  </div>
                )}
                
                <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl flex-shrink-0 text-white shadow-lg bg-gradient-to-br ${monthColorBg} border border-white/20`}>
                  <span className="text-xs font-bold leading-none opacity-90">{monthStr}</span>
                  <span className="text-2xl font-black leading-none mt-1">{day}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={`font-bold truncate text-lg transition-colors ${isSelected ? 'text-primary-600 dark:text-gold-400' : 'text-gray-900 dark:text-white'}`}>
                    {event.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 font-medium">
                    <Clock size={14} className="opacity-70" /> {event.service_time?.substring(0, 5)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Assignment Board */}
      <div className="w-full md:w-2/3 print:w-full">
        {activeEvent && (
          <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-3xl p-6 lg:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50 dark:border-white/10 print:bg-transparent print:border-none print:shadow-none print:p-0">
            
            {/* Header & Stats */}
            <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 pb-8 print:hidden">
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/20 to-transparent"></div>
              <div className="relative z-10">
                <h2 className="text-4xl font-black bg-gradient-to-r from-primary-600 to-indigo-600 dark:from-gold-400 dark:to-orange-400 bg-clip-text text-transparent drop-shadow-sm tracking-tight mb-2">
                  {activeEvent.name}
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-gray-500 dark:text-gray-400 font-medium bg-white/50 dark:bg-slate-800/50 px-3 py-1 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
                    {new Date(activeEvent.service_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                  <span className="text-sm font-bold text-white bg-gradient-to-r from-primary-500 to-indigo-500 px-3 py-1.5 rounded-lg shadow-md shadow-primary-500/20">
                    {totalAssigned} ouvrier{totalAssigned > 1 ? 's' : ''} affecté{totalAssigned > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowQRModal(true)}
                  className="group relative flex items-center gap-2 text-sm font-bold bg-white dark:bg-slate-700 text-gray-800 dark:text-white px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 transition-all shadow-sm border border-gray-200 dark:border-white/10"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  <span className="text-green-500">📱</span> Afficher QR Code
                </button>
                <button 
                  onClick={exportPDF}
                  className="group flex items-center gap-2 text-sm font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2.5 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-md"
                >
                  <Printer size={16} /> Exporter
                </button>
              </div>
            </div>

            {/* Roles Grid */}
            <div id="planning-board-content" className="grid gap-6">
              {ROLES.map(role => {
                const roleAssignments = eventAssignments.filter(a => a.role === role)
                const isMenuOpen = activeRoleMenu === role

                return (
                  <div key={role} className="bg-white/60 dark:bg-slate-900/40 rounded-2xl border border-gray-200/50 dark:border-white/5 overflow-hidden backdrop-blur-md shadow-sm transition-all hover:shadow-md">
                    {/* Role Header */}
                    <div className="bg-gradient-to-r from-gray-50/80 to-white/80 dark:from-slate-800/80 dark:to-slate-900/80 p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center relative backdrop-blur-md">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/10 to-indigo-500/10 dark:from-primary-900/50 dark:to-indigo-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 shadow-inner border border-primary-500/20">
                          <Users size={20} />
                        </div>
                        <h4 className="font-black text-xl text-gray-800 dark:text-gray-100 tracking-tight">{role}</h4>
                        <span className="bg-primary-500/10 text-primary-700 dark:text-primary-300 border border-primary-500/20 text-xs font-black px-2.5 py-1 rounded-full shadow-sm">
                          {roleAssignments.length}
                        </span>
                      </div>
                      
                      {/* Custom Assign Button */}
                      <div className="relative print:hidden assign-menu-container">
                        <button 
                          onClick={() => {
                            setActiveRoleMenu(isMenuOpen ? null : role)
                            setSearchQuery('')
                          }}
                          disabled={isSubmitting}
                          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-sm disabled:opacity-50"
                        >
                          <UserPlus size={16} /> Assigner
                        </button>

                        {/* Custom Combobox Dropdown */}
                        {isMenuOpen && (
                          <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in duration-200">
                            <div className="p-3 border-b border-gray-100 dark:border-slate-700">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                  type="text"
                                  autoFocus
                                  placeholder="Rechercher un membre..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                              </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-2">
                              {filteredMembers.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500">Aucun membre trouvé</div>
                              ) : (
                                filteredMembers.map(m => {
                                  // Check if already assigned to this role
                                  const isAssigned = roleAssignments.some(a => a.member_id === m.id)
                                  return (
                                    <button
                                      key={m.id}
                                      onClick={() => !isAssigned && handleAssign(role, m.id)}
                                      disabled={isAssigned}
                                      className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${
                                        isAssigned 
                                        ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-900/50' 
                                        : 'hover:bg-primary-50 dark:hover:bg-slate-700'
                                      }`}
                                    >
                                      {m.photo_url ? (
                                        <img src={m.photo_url} className="w-8 h-8 rounded-full object-cover shadow-sm" alt="" />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-600 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold text-xs shadow-sm">
                                          {m.first_name?.[0]}{m.last_name?.[0]}
                                        </div>
                                      )}
                                      <div className="flex-1 truncate">
                                        <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                          {m.first_name} {m.last_name}
                                        </div>
                                      </div>
                                      {isAssigned && <CheckCircle2 size={16} className="text-primary-500" />}
                                    </button>
                                  )
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Role Assignments List */}
                    <div className="p-4">
                      {roleAssignments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center bg-gray-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 mb-2">
                            <Users size={20} />
                          </div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Aucun membre assigné</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Cliquez sur Assigner pour ajouter quelqu'un.</p>
                        </div>
                      ) : (
                        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                          {roleAssignments.map(assignment => (
                            <li key={assignment.id} className="group relative flex justify-between items-center bg-white/80 dark:bg-slate-800/80 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/10 hover:-translate-y-0.5 backdrop-blur-sm">
                              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 to-indigo-500/0 group-hover:from-primary-500/5 group-hover:to-indigo-500/5 rounded-2xl transition-colors pointer-events-none"></div>
                              <div className="flex items-center gap-4 overflow-hidden relative z-10">
                                {assignment.members?.photo_url ? (
                                  <img src={assignment.members.photo_url} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-md" alt="" />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-100 to-indigo-100 dark:from-primary-900/60 dark:to-indigo-900/60 text-primary-700 dark:text-primary-300 flex items-center justify-center font-black text-lg shadow-md border-2 border-white dark:border-slate-700">
                                    {assignment.members?.first_name?.[0]}{assignment.members?.last_name?.[0]}
                                  </div>
                                )}
                                <div className="truncate">
                                  <div className="font-black text-base text-gray-900 dark:text-white truncate">
                                    {assignment.members?.first_name} {assignment.members?.last_name}
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-1.5">
                                    {getStatusBadge(assignment.status, assignment.refusal_reason)}
                                    {assignment.status === 'replaced' && assignment.replacement_member_id && (
                                      <span className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 truncate max-w-[100px]">
                                        par {members.find(m => m.id === assignment.replacement_member_id)?.first_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="print:hidden ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-1 py-1 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 relative z-10 translate-x-2 group-hover:translate-x-0">
                                {isSubmitting || remindingId === assignment.id ? (
                                  <div className="w-9 h-9 flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin"></div>
                                  </div>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => handleRemind(assignment.id, assignment.members?.first_name || 'le membre')}
                                      className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all duration-200"
                                      title="Envoyer un rappel"
                                    >
                                      <Bell size={18} className="group-hover:animate-[wiggle_1s_ease-in-out_infinite]" />
                                    </button>
                                    <button 
                                      onClick={() => handleRemove(assignment.id)}
                                      className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200"
                                      title="Retirer"
                                    >
                                      <X size={18} />
                                    </button>
                                  </>
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
          </div>
        )}
      </div>

      {/* QR Code Modal for Printing */}
      {showQRModal && activeEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:bg-white print:p-0 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden relative print:shadow-none print:max-w-none shadow-2xl">
            <button 
              onClick={() => setShowQRModal(false)}
              className="absolute top-6 right-6 z-10 w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors print:hidden"
            >
              <X size={20} />
            </button>
            
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <Users size={40} />
              </div>
              <h1 className="text-4xl font-black mb-3 text-gray-900 uppercase tracking-widest">{activeEvent.name}</h1>
              <p className="text-xl text-gray-500 mb-10 font-medium">
                {new Date(activeEvent.service_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {activeEvent.service_time?.substring(0, 5)}
              </p>
              
              <div className="bg-white p-8 rounded-[40px] shadow-[0_20px_50px_rgb(0,0,0,0.1)] mb-10 print:shadow-none print:border-none print:p-0 border border-gray-100">
                <QRCodeSVG 
                  value={`EGLISE_CONNECT_CHECKIN_${activeEvent.id}`} 
                  size={300} 
                  level="H" 
                  includeMargin={true}
                  className="rounded-2xl"
                />
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 max-w-md w-full border border-gray-100 print:bg-transparent print:border-none">
                <h3 className="font-bold text-lg text-gray-900 mb-2 flex items-center justify-center gap-2">
                  <span className="text-green-500">📱</span> Scannez pour valider
                </h3>
                <p className="text-sm text-gray-600">Ouvrez votre Espace Membre Église Connect et utilisez le bouton "Scanner à l'entrée".</p>
              </div>

              <button 
                onClick={() => window.print()}
                className="mt-8 bg-gray-900 hover:bg-black text-white font-bold py-4 px-10 rounded-full shadow-lg transition-transform hover:scale-105 print:hidden flex items-center gap-2"
              >
                <Printer size={20} /> Lancer l'impression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
