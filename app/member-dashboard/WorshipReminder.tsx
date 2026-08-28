'use client'

import { useEffect, useState } from 'react'

interface WorshipDay {
  day: string
  name: string
  start_time: string
  end_time?: string
}

interface WorshipReminderProps {
  upcomingServices: any[]
  churchName: string
}

const DAY_NAMES_FR: Record<string, string> = {
  Sunday: 'Dimanche', Monday: 'Lundi', Tuesday: 'Mardi',
  Wednesday: 'Mercredi', Thursday: 'Jeudi', Friday: 'Vendredi', Saturday: 'Samedi'
}

export default function WorshipReminder({ upcomingServices, churchName }: WorshipReminderProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [nextAlert, setNextAlert] = useState<any>(null)
  const [countdown, setCountdown] = useState<string>('')
  const [justAsked, setJustAsked] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  // Compute next service and countdown
  useEffect(() => {
    if (!upcomingServices || upcomingServices.length === 0) return

    const checkAndAlert = () => {
      const now = new Date()
      const next = upcomingServices[0]
      if (!next) return

      const [h, m] = (next.service_time || '09:00').split(':').map(Number)
      const serviceDateTime = new Date(next.service_date)
      serviceDateTime.setHours(h, m, 0, 0)

      const diffMs = serviceDateTime.getTime() - now.getTime()
      const diffH = Math.floor(diffMs / (1000 * 60 * 60))
      const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

      if (diffMs <= 0) {
        setCountdown('En cours maintenant 🔴')
      } else if (diffH < 24) {
        setCountdown(`Dans ${diffH}h${diffM.toString().padStart(2, '0')}`)
      } else {
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        setCountdown(`Dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`)
      }

      setNextAlert(next)

      // Trigger vibration + notification if ≤ 2h before service
      if (diffMs > 0 && diffMs <= 2 * 60 * 60 * 1000) {
        const lastAlertKey = `alert_${next.id}_${next.service_date}`
        if (!sessionStorage.getItem(lastAlertKey)) {
          sessionStorage.setItem(lastAlertKey, '1')
          // Vibrate phone
          if ('vibrate' in navigator) {
            navigator.vibrate([300, 100, 300, 100, 500])
          }
          // Web notification
          if (Notification.permission === 'granted') {
            new Notification(`⛪ Culte dans ${diffH}h${diffM > 0 ? diffM + 'min' : ''} !`, {
              body: `🔥 "${next.name}" commence bientôt à ${(next.service_time || '').substring(0, 5)}. Préparez-vous !`,
              icon: '/logo.png',
              badge: '/logo.png',
              tag: `worship-${next.id}`,
            })
          }
        }
      }
    }

    checkAndAlert()
    const interval = setInterval(checkAndAlert, 60 * 1000) // Every minute
    return () => clearInterval(interval)
  }, [upcomingServices])

  const requestPermission = async () => {
    setJustAsked(true)
    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm === 'granted' && 'vibrate' in navigator) {
      navigator.vibrate([100, 50, 100])
    }
  }

  if (!nextAlert) return null

  const isToday = nextAlert.service_date === new Date().toISOString().split('T')[0]
  const isSoon = countdown.startsWith('Dans') && (countdown.includes('h') && !countdown.includes('jour'))

  return (
    <div className={`rounded-2xl p-5 border-2 shadow-md transition-all duration-500 ${
      isToday 
        ? 'bg-gradient-to-r from-red-500 to-orange-500 border-red-600 text-white animate-pulse-slow' 
        : isSoon
        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 border-amber-500 text-amber-950'
        : 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800'
    }`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className={`text-4xl ${isToday ? 'animate-bounce' : ''}`}>
            {isToday ? '🔔' : '⛪'}
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest ${isToday ? 'text-white/80' : 'text-indigo-500 dark:text-indigo-400'}`}>
              {isToday ? '⚡ Alerte — Culte Aujourd\'hui !' : 'Prochain Culte'}
            </p>
            <h3 className={`text-xl font-serif font-bold ${isToday ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              {nextAlert.name}
            </h3>
            <p className={`text-sm mt-1 font-medium flex items-center gap-3 ${isToday ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'}`}>
              <span>📅 {new Date(nextAlert.service_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <span>⏰ {(nextAlert.service_time || '').substring(0, 5)}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`text-2xl font-black tabular-nums ${isToday ? 'text-white' : 'text-indigo-700 dark:text-indigo-300'}`}>
            {countdown}
          </span>
          
          {permission === 'default' && !justAsked && (
            <button
              onClick={requestPermission}
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur text-white border border-white/40 transition-all flex items-center gap-1"
            >
              🔔 Activer les alertes
            </button>
          )}
          {permission === 'granted' && (
            <span className="text-xs font-bold text-green-300 flex items-center gap-1">
              ✅ Alertes activées
            </span>
          )}
          {permission === 'denied' && (
            <span className="text-xs text-red-300">🚫 Alertes bloquées</span>
          )}
        </div>
      </div>
    </div>
  )
}
