'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface WorshipReminderProps {
  upcomingServices: any[]
  churchName: string
}

export default function WorshipReminder({ upcomingServices, churchName }: WorshipReminderProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [nextAlert, setNextAlert] = useState<any>(null)
  
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null)
  const [isAlerting, setIsAlerting] = useState(false)
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false)
  
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  // Initialiser l'audio context pour la sonnerie de pointe (Synthétiseur 100% JS)
  const unlockAudio = async () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass()
      }
    }
    
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume()
    }
    
    setIsAudioUnlocked(true)

    // Demander aussi les permissions de notification
    if ('Notification' in window) {
      const perm = await Notification.requestPermission()
      setPermission(perm)
    }
    
    // Petit feedback haptique
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50])
    }
  }

  const playAlarmSound = () => {
    if (!audioCtxRef.current) return
    const ctx = audioCtxRef.current
    
    // Séquence de 3 bips (style sonnette moderne / cloche électronique)
    const playBeep = (timeOffset: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + timeOffset) // Note E5
      osc.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + timeOffset + 0.6)
      
      gain.gain.setValueAtTime(0, ctx.currentTime + timeOffset)
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + timeOffset + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + timeOffset + 0.8)
      
      osc.start(ctx.currentTime + timeOffset)
      osc.stop(ctx.currentTime + timeOffset + 1)
    }

    playBeep(0)
    playBeep(1)
    playBeep(2)
    playBeep(3)
  }

  // Décompte temps réel
  useEffect(() => {
    if (!upcomingServices || upcomingServices.length === 0) return

    const next = upcomingServices[0]
    setNextAlert(next)

    const [h, m] = (next.service_time || '09:00').split(':').map(Number)
    const serviceDateTime = new Date(next.service_date)
    serviceDateTime.setHours(h, m, 0, 0)

    const updateTimer = () => {
      const now = new Date().getTime()
      const diffMs = serviceDateTime.getTime() - now

      if (diffMs <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 })
        // C'est l'heure !
        if (!isAlerting) {
          triggerAlarm(next)
          setIsAlerting(true)
        }
      } else {
        const d = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        const h = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)
        setTimeLeft({ d, h, m: minutes, s: seconds })
        
        // Alerte 1 heure avant (vibration uniquement)
        if (d === 0 && h === 0 && minutes === 59 && seconds === 59) {
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
        }
      }
    }

    updateTimer() // run immediate
    const intervalId = setInterval(updateTimer, 1000)

    return () => clearInterval(intervalId)
  }, [upcomingServices, isAlerting])

  const triggerAlarm = (service: any) => {
    // 1. Jouer le son
    if (isAudioUnlocked) {
      playAlarmSound()
    }
    
    // 2. Vibrate ultra fort (style alarme)
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 1000, 500, 1000])
    }
    
    // 3. Notification Web
    if (Notification.permission === 'granted') {
      new Notification(`🔥 Le culte commence MAINTENANT !`, {
        body: `C'est l'heure de "${service.name}". Rejoignez-nous vite !`,
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [500, 200, 500, 200, 1000],
        tag: `worship-alarm-${service.id}`,
      } as NotificationOptions & { vibrate?: number[] })
    }
  }

  if (!nextAlert || !timeLeft) return null

  // Déterminer le statut visuel
  const isNow = timeLeft.d === 0 && timeLeft.h === 0 && timeLeft.m === 0 && timeLeft.s === 0
  const isApproaching = timeLeft.d === 0 && timeLeft.h === 0 && timeLeft.m < 60 && !isNow

  // Formatage avec le zéro initial
  const pad = (num: number) => num.toString().padStart(2, '0')

  return (
    <div className={`relative overflow-hidden rounded-3xl p-6 shadow-2xl transition-colors duration-1000 border-2 ${
      isNow 
        ? 'bg-gradient-to-br from-red-600 to-rose-700 border-red-400 text-white animate-pulse-slow' 
        : isApproaching
        ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300 text-amber-950'
        : 'bg-gradient-to-br from-slate-900 to-indigo-950 dark:from-slate-900 dark:to-black border-indigo-500/30 text-white'
    }`}>
      {/* Background Decor */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Infos Culte */}
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md mb-3 border border-white/20">
            <span className={isNow ? 'animate-bounce' : 'animate-pulse'}>{isNow ? '🔥' : '⏳'}</span>
            <span className="text-xs font-black uppercase tracking-widest text-white/90">
              {isNow ? 'C\'est l\'heure !' : 'Prochain Culte'}
            </span>
          </div>
          <h3 className="text-2xl md:text-3xl font-serif font-bold text-white mb-1 drop-shadow-md">
            {nextAlert.name}
          </h3>
          <p className="text-sm font-medium text-white/70 flex items-center justify-center md:justify-start gap-3">
            <span>📅 {new Date(nextAlert.service_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}</span>
            <span>⏰ {nextAlert.service_time?.substring(0, 5)}</span>
          </p>
        </div>

        {/* Compteur Digital Ultra-Moderne (Glassmorphism) */}
        {!isNow ? (
          <div className="flex gap-2 sm:gap-4 shrink-0">
            <TimeBlock value={pad(timeLeft.d)} label="Jours" />
            <span className="text-2xl font-black text-white/50 self-center mb-5 animate-pulse">:</span>
            <TimeBlock value={pad(timeLeft.h)} label="Heures" />
            <span className="text-2xl font-black text-white/50 self-center mb-5 animate-pulse">:</span>
            <TimeBlock value={pad(timeLeft.m)} label="Min" />
            <span className="text-2xl font-black text-white/50 self-center mb-5 animate-pulse">:</span>
            <TimeBlock value={pad(timeLeft.s)} label="Sec" highlight />
          </div>
        ) : (
          <div className="bg-white/20 backdrop-blur-lg px-8 py-4 rounded-2xl border border-white/40 shadow-xl animate-bounce">
            <span className="text-3xl font-black uppercase tracking-widest text-white drop-shadow-lg">En Cours</span>
          </div>
        )}

      </div>

      {/* Bouton d'activation des alertes (Crucial pour la Sonnerie) */}
      {!isAudioUnlocked && (
        <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/60 text-center sm:text-left flex-1 max-w-sm">
            Autorisez les alertes sonores et haptiques pour ne jamais rater ce culte.
          </p>
          <button
            onClick={unlockAudio}
            className="group relative overflow-hidden bg-white text-slate-900 font-bold px-6 py-2.5 rounded-full text-sm shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center gap-2"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <span className="relative z-10">🔔 Activer l'Alarme Interactive</span>
          </button>
        </div>
      )}
      
      {isAudioUnlocked && !isNow && (
        <div className="mt-4 text-center md:text-right">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-300/90 bg-green-900/30 px-3 py-1 rounded-full border border-green-400/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Système d'Alerte Armé
          </span>
        </div>
      )}

    </div>
  )
}

// Composant interne pour chaque bloc de temps
function TimeBlock({ value, label, highlight = false }: { value: string, label: string, highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`relative overflow-hidden w-14 h-16 sm:w-16 sm:h-20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner border border-white/20 ${highlight ? 'bg-white/20' : 'bg-white/10'}`}>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: 20, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
            className="absolute text-2xl sm:text-3xl font-mono font-black text-white drop-shadow-md"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[10px] sm:text-xs font-bold text-white/60 uppercase tracking-widest mt-2">
        {label}
      </span>
    </div>
  )
}
