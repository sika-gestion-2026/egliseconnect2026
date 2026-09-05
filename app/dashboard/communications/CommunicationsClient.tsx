'use client'

import { useState, useMemo, useEffect } from 'react'

type Member = { quartier: string | null }

export default function CommunicationsClient({ members, quartiers }: { members: Member[], quartiers: string[] }) {
  const [message, setMessage] = useState('')
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['all'])
  const [isSending, setIsSending] = useState(false)
  const [sendProgress, setSendProgress] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)

  // Smart Counter Logic
  const charCount = message.length
  const smsSegments = useMemo(() => {
    if (charCount === 0) return 1
    if (charCount <= 160) return 1
    return Math.ceil(charCount / 153)
  }, [charCount])

  // Audience calculation
  const audienceCount = useMemo(() => {
    if (selectedTargets.includes('all')) return members.length
    // This is a mockup of audience calculation based on targets
    let count = 0
    selectedTargets.forEach(target => {
      if (target === 'absentees') count += Math.floor(members.length * 0.1) // Fake 10%
      if (target.startsWith('dept_')) count += Math.floor(members.length * 0.25) // Fake 25% per dept
      if (target.startsWith('quartier_')) count += Math.floor(members.length * 0.15) // Fake 15% per quarter
    })
    return Math.min(count, members.length) || 0
  }, [selectedTargets, members])

  const toggleTarget = (target: string) => {
    if (target === 'all') {
      setSelectedTargets(['all'])
      return
    }
    setSelectedTargets(prev => {
      const withoutAll = prev.filter(t => t !== 'all')
      if (withoutAll.includes(target)) {
        const next = withoutAll.filter(t => t !== target)
        return next.length === 0 ? ['all'] : next
      }
      return [...withoutAll, target]
    })
  }

  const handleSimulate = () => {
    if (message.trim() === '') return
    
    setIsSending(true)
    setSendProgress(0)
    
    // Animate progress to 100%
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setTimeout(() => {
          setIsSending(false)
          setShowSuccess(true)
          setMessage('')
          setSendProgress(0)
          setTimeout(() => setShowSuccess(false), 5000)
        }, 500)
      }
      setSendProgress(progress)
    }, 300)
  }

  const isTargetSelected = (target: string) => selectedTargets.includes(target)

  return (
    <div className="space-y-8 animate-fade-in-up pb-20">
      
      {/* Header Premium SaaS */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h2 className="text-3xl font-extrabold mb-2 flex items-center gap-3">
              <span className="text-4xl">📱</span> Centre de Communication
            </h2>
            <p className="text-indigo-200 text-sm max-w-lg leading-relaxed">
              Touchez tous vos fidèles en un clic. Créez des campagnes SMS ciblées et gardez votre église connectée.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex-1 min-w-[150px] flex flex-col">
              <span className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span> SMS Envoyés
              </span>
              <span className="text-3xl font-black text-white">1,248</span>
              <span className="text-xs text-indigo-300 mt-1">Ce mois-ci</span>
            </div>
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-xl border border-green-500/30 rounded-2xl p-5 flex-1 min-w-[150px] flex flex-col">
              <span className="text-green-200 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Taux de Délivrance
              </span>
              <span className="text-3xl font-black text-green-400">99.8%</span>
              <span className="text-xs text-green-300 mt-1">Fiabilité Maximale</span>
            </div>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="animate-fade-in bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 p-6 rounded-2xl flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <div>
            <h4 className="font-bold text-lg">Campagne envoyée avec succès !</h4>
            <p className="text-sm opacity-80">Les SMS sont en cours d'acheminement vers {audienceCount} destinataires.</p>
          </div>
        </div>
      )}

      {/* Main Grid: Form (Left) & Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Editor Form */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-3xl p-8 border border-gray-100 dark:border-slate-700/50 shadow-sm relative">
          
          {isSending && (
            <div className="absolute inset-0 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-8 text-center animate-fade-in">
              <div className="w-24 h-24 mb-6 relative">
                <svg className="animate-spin w-full h-full text-primary-200 dark:text-primary-900/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle></svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-black text-primary-600 dark:text-primary-400">{sendProgress}%</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Envoi Massif en cours...</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Distribution des messages à vos fidèles ({audienceCount} cibles)</p>
              
              <div className="w-full max-w-md bg-gray-200 dark:bg-slate-700 h-2 rounded-full mt-8 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 transition-all duration-300 ease-out"
                  style={{ width: `${sendProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <h3 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-2">
            Créer une Nouvelle Campagne
          </h3>

          <div className="space-y-8">
            {/* Target Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Cible (Destinataires)</label>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <button 
                  onClick={() => toggleTarget('all')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${isTargetSelected('all') ? 'bg-primary-500 text-white border-primary-500 shadow-md shadow-primary-500/20' : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                >
                  🌐 Tous les membres
                </button>
                <button 
                  onClick={() => toggleTarget('absentees')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${isTargetSelected('absentees') ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20' : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                >
                  ⚠️ Absents du dernier culte
                </button>
                <button 
                  onClick={() => toggleTarget('dept_mutuelle')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${isTargetSelected('dept_mutuelle') ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                >
                  🏦 Mutuelle
                </button>
                <button 
                  onClick={() => toggleTarget('dept_jeunesse')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${isTargetSelected('dept_jeunesse') ? 'bg-purple-500 text-white border-purple-500 shadow-md shadow-purple-500/20' : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                >
                  ⚡ Jeunesse
                </button>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3 text-blue-800 dark:text-blue-300 font-medium">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  <span>Audience estimée :</span>
                </div>
                <span className="text-xl font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-blue-900/40 px-3 py-1 rounded-lg shadow-sm">
                  {audienceCount} fidèles
                </span>
              </div>
            </div>

            {/* Message Area */}
            <div>
              <div className="flex justify-between items-end mb-4">
                <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contenu du Message</label>
                <div className="flex gap-2 text-xs font-bold">
                  <button className="text-primary-500 hover:text-primary-700 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded-md">
                    + Prénom
                  </button>
                  <button className="text-primary-500 hover:text-primary-700 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded-md">
                    + Date du jour
                  </button>
                </div>
              </div>

              <div className={`relative rounded-2xl border-2 transition-all ${charCount > 480 ? 'border-red-400 dark:border-red-500/50' : 'border-gray-200 dark:border-slate-700 focus-within:border-primary-500 dark:focus-within:border-primary-500'}`}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full h-40 p-5 bg-transparent border-none focus:ring-0 resize-none font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  placeholder="Shalom Bien-aimé(e), nous te rappelons la réunion de ce soir à 18h00 pile à l'église. Ne manque pas ce moment de grâce !"
                ></textarea>
                
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-b-[14px] border-t border-gray-100 dark:border-slate-700 flex justify-between items-center text-sm font-medium">
                  <div className="flex items-center gap-4">
                    <span className={`${charCount > 480 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                      {charCount} caractères
                    </span>
                    <span className="text-gray-300 dark:text-slate-600">|</span>
                    <span className="text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                      {smsSegments} SMS / pers.
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    Max conseillé: 480
                  </span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-6 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <div className="text-xs font-bold text-gray-500 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span> Mode Démonstration Actif
              </div>
              <button
                onClick={handleSimulate}
                disabled={charCount === 0 || isSending}
                className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-3 disabled:opacity-50 disabled:shadow-none transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                Lancer la Campagne SMS
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview Mockup (Right) */}
        <div className="lg:col-span-4 hidden lg:flex flex-col items-center">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Aperçu en direct</h4>
          
          {/* Smartphone Mockup */}
          <div className="w-[300px] h-[600px] bg-slate-900 rounded-[45px] p-3 shadow-2xl relative border-[6px] border-slate-800">
            {/* Notch */}
            <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-3xl w-32 mx-auto z-20"></div>
            
            {/* Screen */}
            <div className="w-full h-full bg-slate-50 rounded-[32px] overflow-hidden relative flex flex-col relative">
              
              {/* Fake Status Bar */}
              <div className="h-12 w-full pt-3 px-6 flex justify-between items-center text-[10px] font-bold text-slate-900 z-10 relative">
                <span>12:00</span>
                <div className="flex gap-1.5 items-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 22h20V2z"/></svg>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
                </div>
              </div>

              {/* Fake SMS Header */}
              <div className="px-4 pb-3 border-b border-gray-200 flex items-center justify-between bg-white/80 backdrop-blur-md relative z-10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 mb-1 flex items-center justify-center text-gray-500 font-bold text-xs">E</div>
                  <span className="text-[10px] font-bold text-gray-900">EgliseConnect</span>
                </div>
                <div className="w-5"></div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 bg-gray-100 p-4 flex flex-col justify-end">
                <span className="text-[9px] text-gray-400 font-bold text-center mb-4 uppercase">Aujourd'hui 12:00</span>
                
                {charCount > 0 ? (
                  <div className="bg-blue-500 text-white p-3 rounded-2xl rounded-br-sm text-sm self-end max-w-[85%] shadow-sm animate-fade-in-up whitespace-pre-wrap break-words">
                    {message.replace(/\+ Prénom/g, "Jean").replace(/\+ Date du jour/g, new Date().toLocaleDateString('fr-FR'))}
                  </div>
                ) : (
                  <div className="bg-gray-200 text-gray-400 p-3 rounded-2xl rounded-br-sm text-sm self-end max-w-[85%] shadow-sm italic text-center">
                    Votre message apparaîtra ici...
                  </div>
                )}
                <span className="text-[9px] text-gray-400 font-bold text-right mt-1">Distribué</span>
              </div>
              
              {/* Fake Input Area */}
              <div className="h-16 bg-gray-50 border-t border-gray-200 px-4 flex items-center justify-between z-10 relative">
                <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <div className="flex-1 mx-3 h-8 border border-gray-300 rounded-full px-3 text-[10px] text-gray-400 flex items-center">
                  Message Texte...
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                </div>
              </div>

            </div>
          </div>
          
        </div>

      </div>
    </div>
  )
}
