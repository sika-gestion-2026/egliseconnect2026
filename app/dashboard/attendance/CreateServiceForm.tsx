'use client'

import { useState } from 'react'
import { createServiceAction } from '@/app/actions/createService'

export default function CreateServiceForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    try {
      const res = await createServiceAction(formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setIsOpen(false)
      }
    } catch (err) {
      setError('Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-primary-900 text-white px-4 py-2 rounded-md hover:bg-primary-800 transition-colors font-medium text-sm flex items-center gap-2"
      >
        <span>📅</span> Planifier un Culte
      </button>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md mb-8 animate-in fade-in slide-in-from-top-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold font-serif text-primary-900 dark:text-gold-400">Nouveau Culte</h2>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type d'événement</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="type" value="regular" defaultChecked className="text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Culte Régulier</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="type" value="special" className="text-primary-600 focus:ring-primary-500" />
              <span className="text-sm font-bold text-primary-900 dark:text-gold-400">Événement Spécial 🌟</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du Culte / Événement</label>
          <input 
            type="text" 
            name="name" 
            required
            defaultValue="Culte du Dimanche"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 text-gray-900 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input 
              type="date" 
              name="service_date" 
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Heure</label>
            <input 
              type="time" 
              name="service_time" 
              required
              defaultValue="09:30"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <div className="flex justify-end pt-2">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-gold-500 text-white px-6 py-2 rounded-md hover:bg-gold-600 transition-colors font-bold disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer et Ouvrir les RSVP'}
          </button>
        </div>
      </form>
    </div>
  )
}
