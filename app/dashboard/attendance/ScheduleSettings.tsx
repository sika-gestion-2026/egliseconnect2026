'use client'

import { useState } from 'react'
import { generateWeeklyScheduleAction } from '@/app/actions/generateWeeklySchedule'

export default function ScheduleSettings() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await generateWeeklyScheduleAction()
      if (res.error) {
        setMessage('❌ ' + res.error)
      } else {
        setMessage(`✅ Succès : ${res.count} nouveau(x) culte(s) généré(s).`)
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (err) {
      setMessage('❌ Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button 
        onClick={handleGenerate}
        disabled={loading}
        className="text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 border border-primary-200 transition-colors"
      >
        <span>⚡</span> {loading ? 'Génération...' : 'Générer la semaine'}
      </button>
      {message && <p className="text-xs font-medium mt-2 text-gray-600 animate-in fade-in">{message}</p>}
    </div>
  )
}
