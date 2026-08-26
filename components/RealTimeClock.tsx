"use client"
import { useState, useEffect } from 'react'

export default function RealTimeClock() {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => {
      setTime(new Date())
    }, 60000) // Update every minute is enough
    return () => clearInterval(interval)
  }, [])

  if (!time) {
    return <div className="animate-pulse h-12 w-32 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
  }

  const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(time)
  const day = time.getDate()
  const month = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(time)
  const hours = String(time.getHours()).padStart(2, '0')
  const minutes = String(time.getMinutes()).padStart(2, '0')

  return (
    <div className="md:text-right flex md:flex-col items-center md:items-end gap-2 md:gap-0 bg-white/50 dark:bg-slate-800/50 p-2 rounded-xl border border-gray-100/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
        <span>🕒</span> {hours}:{minutes}
      </p>
      <p className="text-lg md:text-xl font-serif text-primary-900 dark:text-gold-400 flex items-baseline">
        <span className="capitalize">{weekday}</span>
        <strong className="text-2xl md:text-3xl mx-1.5">{day}</strong>
        <span className="capitalize">{month}</span>
      </p>
    </div>
  )
}
