'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getScheduleSettings, saveScheduleSettings, generateScheduleAction, updateServiceAction, deleteServiceAction } from '@/app/actions/scheduleSettings'

const DAYS_OF_WEEK = [
  { value: 'Monday', label: 'Lundi' },
  { value: 'Tuesday', label: 'Mardi' },
  { value: 'Wednesday', label: 'Mercredi' },
  { value: 'Thursday', label: 'Jeudi' },
  { value: 'Friday', label: 'Vendredi' },
  { value: 'Saturday', label: 'Samedi' },
  { value: 'Sunday', label: 'Dimanche' },
]

const TYPE_OPTIONS = [
  { value: 'regular', label: 'Culte Régulier', emoji: '🙏' },
  { value: 'special', label: 'Événement Spécial', emoji: '🌟' },
  { value: 'seminar', label: 'Séminaire', emoji: '📚' },
  { value: 'meeting', label: 'Réunion', emoji: '🤝' },
]

type Service = {
  id: string
  name: string
  service_date: string
  service_time: string
  type: string
  service_declarations?: { count: number }[]
}

type ScheduleSettingsProps = {
  services?: Service[]
}

export default function ScheduleSettings({ services = [] }: ScheduleSettingsProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [worshipDays, setWorshipDays] = useState<any[]>([])
  const [generateMonths, setGenerateMonths] = useState(3)
  const [generating, setGenerating] = useState(false)
  
  // Success notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  
  // Edit modal
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) loadSettings()
  }, [isOpen])

  const loadSettings = async () => {
    setLoading(true)
    const res = await getScheduleSettings()
    if (res.success) setWorshipDays(res.worshipDays)
    setLoading(false)
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 6000)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    // Save config first
    await saveScheduleSettings(worshipDays)
    const res = await generateScheduleAction(generateMonths)

    if (res.error) {
      showNotification('error', res.error)
    } else if (res.count === 0) {
      showNotification('success', res.message || 'Tous les cultes existent déjà pour cette période !')
    } else {
      showNotification('success', `🎉 ${res.count} culte(s) généré(s) avec succès pour ${generateMonths} mois !`)
      setIsOpen(false)
      router.refresh()
    }
    setGenerating(false)
  }

  const handleEditSave = async () => {
    if (!editingService) return
    setSaving(true)
    const res = await updateServiceAction(editingService.id, {
      name: editingService.name,
      service_date: editingService.service_date,
      service_time: editingService.service_time,
      type: editingService.type,
    })
    if (res.error) {
      showNotification('error', res.error)
    } else {
      showNotification('success', '✅ Programme mis à jour !')
      setEditingService(null)
      router.refresh()
    }
    setSaving(false)
  }

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Supprimer ce culte définitivement ?')) return
    const res = await deleteServiceAction(serviceId)
    if (res.error) {
      showNotification('error', res.error)
    } else {
      showNotification('success', '🗑️ Culte supprimé.')
      router.refresh()
    }
  }

  const addDay = () => {
    setWorshipDays([...worshipDays, { day: 'Sunday', start_time: '10:00', end_time: '12:00', name: 'Nouveau Programme' }])
  }

  const removeDay = (index: number) => setWorshipDays(worshipDays.filter((_, i) => i !== index))

  const updateDay = (index: number, field: string, value: string) => {
    const newDays = [...worshipDays]
    newDays[index][field] = value
    setWorshipDays(newDays)
  }

  return (
    <>
      {/* Global Notification Banner */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[200] max-w-sm px-6 py-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-in slide-in-from-right-8 duration-300 border ${
          notification.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span className="text-2xl">{notification.type === 'success' ? '✅' : '❌'}</span>
          <div>
            <p className="font-bold text-sm">{notification.type === 'success' ? 'Succès !' : 'Erreur'}</p>
            <p className="text-xs mt-0.5 opacity-80">{notification.message}</p>
          </div>
          <button onClick={() => setNotification(null)} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex justify-between items-center">
              <h3 className="font-bold font-serif text-lg text-gray-900 dark:text-white flex items-center gap-2">
                ✏️ Modifier le Programme
              </h3>
              <button onClick={() => setEditingService(null)} className="text-gray-400 hover:text-gray-600 bg-white dark:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center shadow-sm">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Thème</label>
                <input
                  type="text"
                  value={editingService.name}
                  onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 dark:bg-slate-900 dark:border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Date</label>
                  <input
                    type="date"
                    value={editingService.service_date}
                    onChange={e => setEditingService({ ...editingService, service_date: e.target.value })}
                    className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Heure</label>
                  <input
                    type="time"
                    value={editingService.service_time.substring(0, 5)}
                    onChange={e => setEditingService({ ...editingService, service_time: e.target.value })}
                    className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Type</label>
                <select
                  value={editingService.type}
                  onChange={e => setEditingService({ ...editingService, type: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 dark:bg-slate-900 dark:border-slate-700"
                >
                  {TYPE_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setEditingService(null)} className="px-5 py-2.5 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-bold text-sm">
                Annuler
              </button>
              <button onClick={handleEditSave} disabled={saving} className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md transition-all">
                {saving ? 'Sauvegarde...' : '💾 Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Panel Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 border border-primary-200 transition-colors"
      >
        <span>⚙️</span> Configurer & Générer
      </button>

      {/* Config Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold font-serif text-gray-900 dark:text-white flex items-center gap-2">
                  <span>📅</span> Programmes Réguliers
                </h2>
                <p className="text-sm text-gray-500 mt-1">Configurez vos jours de culte et générez-les automatiquement.</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white dark:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center shadow-sm">✕</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
              ) : (
                <>
                  {worshipDays.map((day, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3 relative">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Thème du Programme</label>
                        <input type="text" value={day.name || ''} onChange={(e) => updateDay(index, 'name', e.target.value)}
                          className="w-full mt-1 p-2 bg-white dark:bg-slate-800 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-500"
                          placeholder="Ex: Jeudi Solution" />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Jour</label>
                          <select value={day.day} onChange={(e) => updateDay(index, 'day', e.target.value)}
                            className="w-full mt-1 p-2 bg-white dark:bg-slate-800 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
                            {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="text-xs font-bold text-gray-500 uppercase">Début</label>
                          <input type="time" value={day.start_time || day.time || ''} onChange={(e) => updateDay(index, 'start_time', e.target.value)}
                            className="w-full mt-1 p-2 bg-white dark:bg-slate-800 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div className="w-24">
                          <label className="text-xs font-bold text-gray-500 uppercase">Fin</label>
                          <input type="time" value={day.end_time || ''} onChange={(e) => updateDay(index, 'end_time', e.target.value)}
                            className="w-full mt-1 p-2 bg-white dark:bg-slate-800 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <button onClick={() => removeDay(index)}
                          className="self-end mb-0.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 w-9 h-9 rounded-lg flex items-center justify-center transition-colors text-lg">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addDay}
                    className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors flex justify-center items-center gap-2">
                    <span>➕</span> Ajouter un programme
                  </button>
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto text-sm text-gray-500">
                  <span>Période :</span>
                  <select value={generateMonths} onChange={(e) => setGenerateMonths(Number(e.target.value))}
                    className="p-2 border rounded-lg bg-gray-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-primary-500 cursor-pointer">
                    <option value={1}>1 mois</option>
                    <option value={3}>3 mois</option>
                    <option value={6}>6 mois</option>
                    <option value={12}>1 an</option>
                  </select>
                </div>
                <button onClick={handleGenerate} disabled={generating || loading}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                  {generating ? (
                    <><span className="animate-spin">⚡</span> Génération en cours...</>
                  ) : (
                    <><span>💾</span> Enregistrer & Générer</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Exported edit/delete buttons to use on individual service cards
export function ServiceCardActions({ service }: { service: Service }) {
  const router = useRouter()
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const handleEditSave = async () => {
    if (!editingService) return
    setSaving(true)
    const res = await updateServiceAction(editingService.id, {
      name: editingService.name,
      service_date: editingService.service_date,
      service_time: editingService.service_time,
      type: editingService.type,
    })
    if (res.error) {
      showNotification('error', res.error)
    } else {
      setEditingService(null)
      router.refresh()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer ce culte définitivement ?')) return
    const res = await deleteServiceAction(service.id)
    if (res.error) {
      showNotification('error', res.error)
    } else {
      router.refresh()
    }
  }

  return (
    <>
      {notification && (
        <div className={`fixed top-6 right-6 z-[200] max-w-xs px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {notification.message}
        </div>
      )}
      
      <div className="flex gap-1" onClick={e => e.preventDefault()}>
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingService(service); }}
          className="p-1.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors text-sm"
          title="Modifier">✏️</button>
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(); }}
          className="p-1.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors text-sm"
          title="Supprimer">🗑️</button>
      </div>

      {editingService && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4" onClick={() => setEditingService(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex justify-between items-center">
              <h3 className="font-bold font-serif text-lg text-gray-900 dark:text-white">✏️ Modifier le Programme</h3>
              <button onClick={() => setEditingService(null)} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Thème</label>
                <input type="text" value={editingService.name} onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 dark:bg-slate-900 dark:border-slate-700" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Date</label>
                  <input type="date" value={editingService.service_date} onChange={e => setEditingService({ ...editingService, service_date: e.target.value })}
                    className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 dark:bg-slate-900 dark:border-slate-700" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Heure</label>
                  <input type="time" value={editingService.service_time.substring(0, 5)} onChange={e => setEditingService({ ...editingService, service_time: e.target.value })}
                    className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 dark:bg-slate-900 dark:border-slate-700" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Type</label>
                <select value={editingService.type} onChange={e => setEditingService({ ...editingService, type: e.target.value })}
                  className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 dark:bg-slate-900 dark:border-slate-700">
                  {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setEditingService(null)} className="px-5 py-2.5 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-bold text-sm">Annuler</button>
              <button onClick={handleEditSave} disabled={saving} className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-md">
                {saving ? 'Sauvegarde...' : '💾 Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
