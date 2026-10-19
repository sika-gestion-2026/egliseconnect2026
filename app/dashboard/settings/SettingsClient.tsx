'use client'

import { useState, useEffect } from 'react'
import FormActions from '@/components/FormActions'
import PhotoUploadPreview from '@/components/PhotoUploadPreview'

export default function SettingsClient({ church, updateChurchAction }: { church: any, updateChurchAction: any }) {
  const [activeTab, setActiveTab] = useState('general')
  const [localSettings, setLocalSettings] = useState({
    theme_color: '#0f172a',
    edification_mode: 'auto',
    custom_verse_text: '',
    custom_verse_ref: '',
    social_whatsapp: '',
    social_youtube: '',
    social_instagram: '',
    social_facebook: '',
    welcome_message: 'Bienvenue à la maison !'
  })

  // Load from local storage on mount (the immortal part)
  useEffect(() => {
    const saved = localStorage.getItem('church_advanced_settings')
    if (saved) {
      try {
        setLocalSettings(JSON.parse(saved))
      } catch(e) {}
    }
  }, [])

  // Save to local storage on change
  const handleLocalChange = (e: any) => {
    const { name, value } = e.target
    const updated = { ...localSettings, [name]: value }
    setLocalSettings(updated)
    localStorage.setItem('church_advanced_settings', JSON.stringify(updated))
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 bg-gray-50 dark:bg-slate-800/50 p-6 flex flex-col gap-2 border-r border-gray-100 dark:border-slate-800">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Configuration</h2>
        <button onClick={() => setActiveTab('general')} className={`text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'general' ? 'bg-primary-900 text-gold-400 shadow-md scale-105' : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-slate-700'}`}>🏛️ Général</button>
        <button onClick={() => setActiveTab('spirituel')} className={`text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'spirituel' ? 'bg-primary-900 text-gold-400 shadow-md scale-105' : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-slate-700'}`}>🕊️ Spirituel</button>
        <button onClick={() => setActiveTab('reseaux')} className={`text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'reseaux' ? 'bg-primary-900 text-gold-400 shadow-md scale-105' : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-slate-700'}`}>🌍 Réseaux & Dons</button>
        <button onClick={() => setActiveTab('design')} className={`text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'design' ? 'bg-primary-900 text-gold-400 shadow-md scale-105' : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-slate-700'}`}>✨ Design & Accueil</button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8">
        <form action={updateChurchAction} className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
          
          {/* GENERAL TAB */}
          <div className={activeTab === 'general' ? 'block' : 'hidden'}>
            <div className="mb-8">
              <h2 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold">Informations de Base</h2>
              <p className="text-gray-500">Gérez l'identité principale de votre église.</p>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-6">
              <PhotoUploadPreview name="logo_file" defaultPhotoUrl={church?.logo_url} fallbackIcon="⛪" title="Logo Officiel" description="Format carré recommandé" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nom de l'Église</label>
                <input name="name" defaultValue={church?.name || ''} required className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nom du Responsable</label>
                <input name="leader_name" defaultValue={church?.leader_name || ''} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary-500 transition-all" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Vision & Mission</label>
                <textarea name="vision" defaultValue={church?.vision || ''} rows={3} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary-500 transition-all" placeholder="La vision de votre église..."></textarea>
              </div>
            </div>
          </div>

          {/* SPIRITUEL TAB */}
          <div className={activeTab === 'spirituel' ? 'block' : 'hidden'}>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold">Édification</h2>
                <p className="text-gray-500">Nourrissez vos membres spirituellement.</p>
              </div>
              <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">Mode Local Actif</span>
            </div>
            
            <div className="bg-primary-50 dark:bg-slate-800 p-6 rounded-2xl border-2 border-primary-100 dark:border-primary-900 mb-6">
              <label className="block text-sm font-bold text-primary-900 dark:text-gold-400 mb-2">Mode du Verset de la Semaine</label>
              <select name="edification_mode" value={localSettings.edification_mode} onChange={handleLocalChange} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary-500 font-bold">
                <option value="auto">Généré Automatiquement</option>
                <option value="manual">Personnalisé (Manuel)</option>
              </select>
            </div>

            {localSettings.edification_mode === 'manual' && (
              <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-top-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Verset Personnalisé</label>
                  <textarea name="custom_verse_text" value={localSettings.custom_verse_text} onChange={handleLocalChange} rows={3} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-lg italic font-serif" placeholder="Car Dieu a tant aimé le monde..."></textarea>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Référence Biblique</label>
                  <input name="custom_verse_ref" value={localSettings.custom_verse_ref} onChange={handleLocalChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary-500 font-bold" placeholder="Jean 3:16" />
                </div>
              </div>
            )}
          </div>

          {/* RESEAUX TAB */}
          <div className={activeTab === 'reseaux' ? 'block' : 'hidden'}>
            <div className="mb-8">
              <h2 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold">Connectivité</h2>
              <p className="text-gray-500">Liens de vos plateformes sociales et dons.</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800 p-4 rounded-xl">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white text-xl">💬</div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Numéro WhatsApp</label>
                  <input name="social_whatsapp" value={localSettings.social_whatsapp} onChange={handleLocalChange} className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-primary-500 outline-none py-1" placeholder="+243..." />
                </div>
              </div>

              <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800 p-4 rounded-xl">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white text-xl">▶️</div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Chaîne YouTube</label>
                  <input name="social_youtube" value={localSettings.social_youtube} onChange={handleLocalChange} className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-primary-500 outline-none py-1" placeholder="https://youtube.com/..." />
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800 p-4 rounded-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xl">📸</div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Instagram</label>
                  <input name="social_instagram" value={localSettings.social_instagram} onChange={handleLocalChange} className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-primary-500 outline-none py-1" placeholder="@votre_eglise" />
                </div>
              </div>
            </div>
          </div>

          {/* DESIGN TAB */}
          <div className={activeTab === 'design' ? 'block' : 'hidden'}>
            <div className="mb-8">
              <h2 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold">Expérience Membre</h2>
              <p className="text-gray-500">Personnalisez l'accueil et le design de l'application.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-2xl">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Message de Bienvenue (après Scan QR)</label>
                <textarea name="welcome_message" value={localSettings.welcome_message} onChange={handleLocalChange} rows={2} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-center font-bold text-lg text-primary-900 dark:text-gold-400" placeholder="Bienvenue à la maison !"></textarea>
                <p className="text-xs text-gray-500 mt-2 text-center">Ce message apparaîtra sur l'écran du membre lorsqu'il arrivera à l'église.</p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white">Thème Principal</h3>
                  <p className="text-xs text-gray-500">Couleur dominante de l'espace membre</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" name="theme_color" value={localSettings.theme_color} onChange={handleLocalChange} className="w-12 h-12 rounded-xl cursor-pointer border-none p-0" />
                </div>
              </div>
            </div>
          </div>

          {/* Floating Save Button */}
          <div className="pt-8 mt-8 border-t border-gray-100 dark:border-slate-800">
            <FormActions submitText="Enregistrer toutes les modifications" />
            <p className="text-xs text-center text-gray-400 mt-4">Les options locales sont automatiquement sauvegardées sur cet appareil.</p>
          </div>
          
        </form>
      </div>
    </div>
  )
}
