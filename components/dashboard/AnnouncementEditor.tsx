'use client'

import { useState } from 'react'
import { saveAnnouncementAction } from '@/app/actions/saveAnnouncement'

export default function AnnouncementEditor({ initialAnnouncement }: { initialAnnouncement?: any }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    
    const formData = new FormData(e.currentTarget)
    const res = await saveAnnouncementAction(formData)
    
    setLoading(false)
    if (res.error) {
      alert(res.error)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border-t-4 border-amber-500 overflow-hidden">
      <div className="p-6 border-b border-gray-100 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-900/10">
        <h2 className="text-xl font-serif font-bold text-amber-900 dark:text-amber-400 flex items-center gap-2">
          <span>📢</span> Message de la Semaine
        </h2>
        <p className="text-sm text-gray-500 mt-1">Publiez une annonce ou un thème qui sera visible par tous les fidèles sur leur accueil.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Titre (Ex: Thème du Mois)</label>
          <input 
            type="text" 
            name="title" 
            required 
            defaultValue={initialAnnouncement?.title || ''}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Verset Clé (Optionnel)</label>
          <input 
            type="text" 
            name="verses" 
            placeholder="Ex: Jean 3:16"
            defaultValue={initialAnnouncement?.verses || ''}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white font-serif italic text-amber-900 dark:text-amber-300" 
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Message</label>
          <textarea 
            name="content" 
            required 
            rows={4}
            defaultValue={initialAnnouncement?.content || ''}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white resize-none" 
          />
        </div>

        <div className="flex justify-between items-center pt-2">
          {success ? (
            <span className="text-green-600 font-medium text-sm flex items-center gap-1">✅ Publié avec succès</span>
          ) : (
            <span></span>
          )}
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Publication...' : 'Publier aux membres'}
          </button>
        </div>
      </form>
    </div>
  )
}
