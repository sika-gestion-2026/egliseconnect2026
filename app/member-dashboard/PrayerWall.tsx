'use client'

import { useState } from 'react'

export default function PrayerWall() {
  const [requests, setRequests] = useState([
    { id: 1, text: "Priez pour la guérison de ma mère qui est à l'hôpital depuis mardi.", author: "Marie K.", prayers: 12 },
    { id: 2, text: "Que Dieu m'accorde la réussite à mon entretien d'embauche demain.", author: "Anonyme", prayers: 5 }
  ])
  const [newRequest, setNewRequest] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRequest.trim()) return
    setRequests([{ id: Date.now(), text: newRequest, author: "Moi", prayers: 0 }, ...requests])
    setNewRequest('')
  }

  const handlePray = (id: number) => {
    setRequests(requests.map(r => r.id === id ? { ...r, prayers: r.prayers + 1 } : r))
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-serif font-bold text-primary-900 dark:text-gold-400 flex items-center gap-2">
          🙏 Mur de Prière
        </h2>
        <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-gold-400 px-3 py-1 rounded-full font-bold">
          Réseau Spirituel
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 relative">
        <textarea
          value={newRequest}
          onChange={(e) => setNewRequest(e.target.value)}
          placeholder="Partagez un sujet de prière avec l'église..."
          className="w-full p-4 pb-12 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
          rows={3}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" className="rounded border-gray-300 text-primary-600" />
            Anonyme
          </label>
          <button type="submit" className="px-4 py-1.5 bg-primary-900 hover:bg-primary-800 text-white rounded-lg text-xs font-bold transition-colors">
            Publier
          </button>
        </div>
      </form>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {requests.map(req => (
          <div key={req.id} className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700">
            <p className="text-gray-800 dark:text-gray-200 text-sm mb-3">"{req.text}"</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">— {req.author}</span>
              <button 
                onClick={() => handlePray(req.id)}
                className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-primary-600 hover:border-primary-300 transition-all shadow-sm"
              >
                <span>🙏</span> Je prie ({req.prayers})
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
