'use client'

import { useState } from 'react'
import { markNotificationsRead } from '@/app/actions/planning'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  is_read: boolean
  created_at: string
  related_assignment_id?: string
}

export default function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(notifications)
  const [refusingId, setRefusingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const unread = items.filter(n => !n.is_read)

  const handleOpen = async () => {
    setOpen(prev => !prev)
    if (!open && unread.length > 0) {
      const ids = unread.map(n => n.id)
      await markNotificationsRead(ids)
      setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }

  const getIcon = (type: string) => {
    if (type === 'assignment') return '🙏'
    if (type === 'removal') return 'ℹ️'
    if (type === 'service_reminder') return '📅'
    return '🔔'
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "À l'instant"
    if (mins < 60) return `il y a ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `il y a ${hrs}h`
    const days = Math.floor(hrs / 24)
    return `il y a ${days}j`
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 group"
        aria-label="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse shadow-lg">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 z-50 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-primary-50 to-blue-50 dark:from-slate-800 dark:to-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔔</span>
                <span className="font-bold text-gray-900 dark:text-white text-sm">Notifications</span>
              </div>
              {items.length > 0 && (
                <span className="text-xs text-gray-500">{items.length} message{items.length > 1 ? 's' : ''}</span>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y dark:divide-slate-700">
              {items.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-3xl mb-2">🎉</p>
                  <p className="text-sm text-gray-500">Aucune notification</p>
                </div>
              ) : (
                items.map(n => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 transition-colors ${n.is_read ? 'bg-white dark:bg-slate-800' : 'bg-blue-50 dark:bg-blue-900/20'}`}
                  >
                    <div className="flex gap-3 items-start">
                      <span className="text-xl flex-shrink-0 mt-0.5">{getIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold text-gray-900 dark:text-white leading-snug ${!n.is_read ? 'text-blue-900 dark:text-blue-200' : ''}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-3">
                          {n.body}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1.5">{timeAgo(n.created_at)}</p>
                        
                        {n.type === 'assignment' && n.related_assignment_id && (
                          <div className="mt-3">
                            {refusingId === n.id ? (
                              <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-800">
                                <p className="text-xs font-bold text-red-800 dark:text-red-300 mb-1">Motif de votre indisponibilité :</p>
                                <textarea
                                  value={reason}
                                  onChange={e => setReason(e.target.value)}
                                  className="w-full text-sm p-2 border rounded border-red-200 dark:border-red-700 bg-white dark:bg-slate-800 outline-none"
                                  rows={2}
                                  placeholder="Raison (ex: voyage, malade...)"
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    disabled={isSubmitting || !reason.trim()}
                                    onClick={async () => {
                                      setIsSubmitting(true)
                                      const { refuseAssignment } = await import('@/app/actions/planning')
                                      await refuseAssignment(n.related_assignment_id!, reason)
                                      setItems(prev => prev.filter(item => item.id !== n.id))
                                      setRefusingId(null)
                                      setReason('')
                                      setIsSubmitting(false)
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded disabled:opacity-50"
                                  >
                                    Confirmer le refus
                                  </button>
                                  <button
                                    onClick={() => setRefusingId(null)}
                                    className="text-gray-500 hover:text-gray-700 text-xs px-2 py-1.5"
                                  >
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setRefusingId(n.id) }}
                                className="text-red-500 hover:text-red-700 text-xs font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-100"
                              >
                                Décliner (Indisponible)
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
