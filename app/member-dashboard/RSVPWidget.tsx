'use client'

import { useState, useEffect } from 'react'
import { submitRsvpAction } from '@/app/actions/submitRsvp'

type RSVPWidgetProps = {
  serviceId: string
  serviceName: string
  serviceDate: string
  serviceTime: string
  serviceType?: string
  initialStatus?: string
  isToday?: boolean
}

export default function RSVPWidget({ serviceId, serviceName, serviceDate, serviceTime, serviceType, initialStatus, isToday }: RSVPWidgetProps) {
  const [status, setStatus] = useState<string | null>(initialStatus || null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isActuallyToday, setIsActuallyToday] = useState(false)

  useEffect(() => {
    setIsActuallyToday(new Date(serviceDate).toDateString() === new Date().toDateString())
  }, [serviceDate])

  const handleStatusClick = async (newStatus: string) => {
    if (newStatus === 'present') {
      setLoading(true)
      const formData = new FormData()
      formData.append('service_id', serviceId)
      formData.append('service_date', serviceDate)
      formData.append('service_time', serviceTime)
      formData.append('service_name', serviceName)
      formData.append('status', 'present')
      
      const res = await submitRsvpAction(formData)
      if (res.error) setError(res.error)
      else {
        setStatus('present')
        setShowForm(false)
        
        // Surprise confetti!
        import('canvas-confetti').then((confetti) => {
          const duration = 3 * 1000;
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

          const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

          const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
              return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti.default({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti.default({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
          }, 250);
        });
      }
      setLoading(false)
    } else {
      setStatus(newStatus)
      setShowForm(true)
    }
  }

  const handleSubmitReason = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    formData.append('service_id', serviceId)
    formData.append('service_date', serviceDate)
    formData.append('service_time', serviceTime)
    formData.append('service_name', serviceName)
    formData.append('status', status as string)

    const res = await submitRsvpAction(formData)
    if (res.error) setError(res.error)
    else {
      setShowForm(false)
    }
    setLoading(false)
  }

  const isSpecial = serviceType === 'special'

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border-t-4 ${isSpecial ? 'border-gold-500 shadow-gold-900/20' : 'border-primary-900'}`}>
      <div className={`p-6 text-white relative ${isActuallyToday ? 'bg-gradient-to-br from-green-600 to-emerald-500 animate-pulse-slow' : isSpecial ? 'bg-gradient-to-br from-gold-600 to-orange-500 animate-pulse-slow' : 'bg-gradient-to-br from-primary-900 to-primary-600'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-20 text-6xl">
          {isActuallyToday ? '🔥' : isSpecial ? '⏰' : '⛪'}
        </div>
        <div className="flex items-center gap-2 mb-1">
          {(isSpecial || isActuallyToday) && <span className="text-xl animate-bounce">{isActuallyToday ? '🔥' : '🚨'}</span>}
          <h2 className="text-sm uppercase tracking-widest font-bold text-white/80">
            {isActuallyToday ? "C'est Aujourd'hui !" : isSpecial ? 'Événement Spécial' : 'Prochain Culte'}
          </h2>
        </div>
        <h3 className="text-3xl font-serif font-bold mb-3 relative z-10">{serviceName}</h3>
        <p className="text-lg flex items-center gap-3 font-medium">
          <span className="flex items-center gap-1" suppressHydrationWarning><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> {new Date(serviceDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <span className="flex items-center gap-1" suppressHydrationWarning><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {serviceTime.substring(0,5)}</span>
        </p>
      </div>

      <div className="p-6">
        <h4 className="text-center text-gray-600 dark:text-gray-300 font-medium mb-6">Confirmez votre présence pour faciliter l'organisation :</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => handleStatusClick('present')}
            disabled={loading}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${status === 'present' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 shadow-md transform scale-105' : 'border-gray-200 dark:border-slate-700 hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-900/10 text-gray-700 dark:text-gray-300'}`}
          >
            <span className="text-3xl mb-2">✅</span>
            <span className="font-bold">Je serai présent</span>
          </button>
          
          <button 
            onClick={() => handleStatusClick('late')}
            disabled={loading}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${status === 'late' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 shadow-md transform scale-105' : 'border-gray-200 dark:border-slate-700 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/10 text-gray-700 dark:text-gray-300'}`}
          >
            <span className="text-3xl mb-2">⏳</span>
            <span className="font-bold">Je serai en retard</span>
          </button>
          
          <button 
            onClick={() => handleStatusClick('absent')}
            disabled={loading}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${status === 'absent' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 shadow-md transform scale-105' : 'border-gray-200 dark:border-slate-700 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-700 dark:text-gray-300'}`}
          >
            <span className="text-3xl mb-2">❌</span>
            <span className="font-bold">Je serai absent</span>
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmitReason} className="mt-8 p-6 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
            <h5 className="font-bold text-gray-900 dark:text-white mb-4">
              {status === 'late' ? 'Raison du retard (optionnel)' : 'Motif de l\'absence'}
            </h5>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sélectionnez une cause :</label>
                <select name="reason" required={status === 'absent'} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                  <option value="">Sélectionnez...</option>
                  <option value="sick">Maladie</option>
                  <option value="travel">Voyage / Déplacement</option>
                  <option value="work">Travail / Études</option>
                  <option value="emergency">Urgence familiale</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Un petit mot pour le pasteur (optionnel) :</label>
                <textarea name="notes" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white" placeholder="Sujet de prière ou précision..."></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:underline">Annuler</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-primary-900 text-white rounded-md font-bold hover:bg-primary-800 transition-colors disabled:opacity-50">
                  {loading ? 'Envoi...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </form>
        )}

        {error && <p className="text-red-500 text-center mt-4 text-sm font-medium">{error}</p>}
        {status && !showForm && !error && (
          <p className="text-center text-green-600 dark:text-green-400 mt-6 font-medium animate-in fade-in">
            ✓ Votre réponse a bien été enregistrée. Merci !
          </p>
        )}
      </div>
    </div>
  )
}
