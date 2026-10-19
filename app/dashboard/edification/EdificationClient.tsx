'use client'

import { useState, useEffect } from 'react'
import { updateEdificationFeed } from '@/app/actions/edification'
import toast from 'react-hot-toast'

const AUTO_VERSES = [
  { text: "L'Éternel est mon berger: je ne manquerai de rien.", ref: "Psaumes 23:1" },
  { text: "Ne t'ai-je pas donné cet ordre: Fortifie-toi et prends courage ?", ref: "Josué 1:9" },
  { text: "Je puis tout par celui qui me fortifie.", ref: "Philippiens 4:13" },
  { text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique...", ref: "Jean 3:16" },
  { text: "Confie-toi en l'Éternel de tout ton cœur...", ref: "Proverbes 3:5" }
];

export default function EdificationClient({ church }: { church: any }) {
  const [mode, setMode] = useState<'auto' | 'manual'>(church?.edification_mode || 'auto')
  const [verseText, setVerseText] = useState(church?.custom_verse_text || "Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux.")
  const [verseRef, setVerseRef] = useState(church?.custom_verse_ref || 'Matthieu 18:20')
  const [isSaving, setIsSaving] = useState(false)
  const [currentAutoVerse, setCurrentAutoVerse] = useState(AUTO_VERSES[0])

  // Calculate the verse for the current week in Auto Mode
  useEffect(() => {
    const weekNumber = Math.ceil(Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (24 * 60 * 60 * 1000)) / 7);
    setCurrentAutoVerse(AUTO_VERSES[weekNumber % AUTO_VERSES.length])
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    
    // Simuler un léger délai pour l'animation même si l'action est rapide
    await new Promise(r => setTimeout(r, 600))
    
    const res = await updateEdificationFeed(church.id, mode, verseText, verseRef)
    setIsSaving(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Paramètres sauvegardés avec succès !', {
        icon: '✨',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      })
    }
  }

  // Helper variables for the preview
  const displayVerse = mode === 'auto' ? currentAutoVerse.text : (verseText || 'Entrez un verset ici...');
  const displayRef = mode === 'auto' ? currentAutoVerse.ref : (verseRef || 'Livre Chapitre:Verset');

  return (
    <div className="space-y-8 animate-fade-in-up pb-20">
      
      {/* Header Premium */}
      <div className="bg-gradient-to-br from-violet-900 to-indigo-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h2 className="text-3xl font-extrabold mb-2 flex items-center gap-3">
              <span className="text-4xl">🕊️</span> Studio d'Édification
            </h2>
            <p className="text-indigo-200 text-sm max-w-lg leading-relaxed">
              Personnalisez la pensée spirituelle qui s'affichera chaque jour dans l'espace membre de vos fidèles.
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[120px]">
              <span className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">Mode Actuel</span>
              {mode === 'auto' ? (
                <span className="text-green-400 font-black text-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Auto
                </span>
              ) : (
                <span className="text-amber-400 font-black text-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> Manuel
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Editor Panel (Left) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-3xl p-8 border border-gray-100 dark:border-slate-700/50 shadow-sm flex flex-col relative overflow-hidden">
          
          <h3 className="text-xl font-bold mb-8 dark:text-white flex items-center gap-2">
            Configuration du Flux
          </h3>

          {/* Mode Toggle iOS Style */}
          <div className="mb-8 p-1 bg-gray-100 dark:bg-slate-900 rounded-2xl flex relative">
            <div 
              className={`absolute inset-y-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 rounded-xl shadow-sm transition-all duration-300 ease-out z-0 ${mode === 'manual' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-1'}`}
            ></div>
            
            <button 
              onClick={() => setMode('auto')}
              className={`flex-1 py-4 px-6 rounded-xl font-bold text-sm z-10 transition-colors ${mode === 'auto' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
            >
              🚀 Pilote Automatique
            </button>
            <button 
              onClick={() => setMode('manual')}
              className={`flex-1 py-4 px-6 rounded-xl font-bold text-sm z-10 transition-colors ${mode === 'manual' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
            >
              ✍️ Saisie Manuelle
            </button>
          </div>

          <div className="relative flex-1">
            {/* Auto Mode Info Overlay */}
            <div className={`absolute inset-0 z-20 transition-all duration-500 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl ${mode === 'manual' ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 text-center max-w-sm transform transition-transform duration-500 scale-100">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </div>
                <h4 className="font-bold text-lg mb-2 dark:text-white">Le Pilote Automatique gère tout !</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  L'intelligence pastorale sélectionne automatiquement un verset fort chaque semaine pour encourager vos fidèles.
                </p>
              </div>
            </div>

            {/* Manual Form Area */}
            <div className={`space-y-6 transition-all duration-500 ${mode === 'auto' ? 'blur-sm grayscale scale-[0.98] opacity-50' : 'blur-0 grayscale-0 scale-100 opacity-100'}`}>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Le Verset</label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-indigo-500 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition duration-500"></div>
                  <textarea 
                    value={verseText}
                    onChange={(e) => setVerseText(e.target.value)}
                    disabled={mode === 'auto'}
                    className="relative w-full h-40 p-5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary-500 resize-none font-serif text-lg leading-relaxed text-gray-800 dark:text-gray-100 shadow-inner"
                    placeholder="Saisissez le texte sacré ici..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">La Référence Biblique</label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-indigo-500 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition duration-500"></div>
                  <input 
                    type="text"
                    value={verseRef}
                    onChange={(e) => setVerseRef(e.target.value)}
                    disabled={mode === 'auto'}
                    className="relative w-full px-5 py-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary-500 font-bold text-gray-800 dark:text-gray-100 shadow-inner"
                    placeholder="Ex: Ésaïe 40:31"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 mt-auto border-t border-gray-100 dark:border-slate-700">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {isSaving ? (
                <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Sécurisation...</>
              ) : (
                <>Publier sur l'Espace Membre <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></>
              )}
            </button>
          </div>
        </div>

        {/* Preview Panel (Right) - 3D Card */}
        <div className="lg:col-span-5 flex flex-col">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            Aperçu Côté Fidèle
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-2"></span>
          </h4>
          
          <div className="flex-1 bg-gray-50 dark:bg-slate-900/50 rounded-3xl p-8 border border-dashed border-gray-300 dark:border-slate-700 flex items-center justify-center perspective-[1000px]">
            
            {/* The 3D Prayer Card */}
            <div className="w-full max-w-sm transform-gpu transition-all duration-700 hover:rotate-y-6 hover:rotate-x-6 hover:scale-105 shadow-2xl hover:shadow-primary-500/20 rounded-[32px] overflow-hidden relative bg-gradient-to-br from-amber-50 to-orange-100 dark:from-slate-800 dark:to-slate-900 border border-amber-200/50 dark:border-slate-700">
              
              {/* Decorative Background Elements */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/10 dark:bg-orange-500/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="relative p-8 md:p-10 flex flex-col items-center text-center min-h-[400px]">
                
                {/* Header line */}
                <div className="flex items-center gap-3 mb-8 opacity-60">
                  <div className="h-px w-8 bg-amber-700 dark:bg-amber-500/50"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-900 dark:text-amber-500">Parole du Jour</span>
                  <div className="h-px w-8 bg-amber-700 dark:bg-amber-500/50"></div>
                </div>

                {/* Decorative Quote Mark */}
                <span className="text-6xl text-amber-500/20 dark:text-amber-500/10 font-serif leading-none absolute top-16 left-6 -rotate-12">"</span>

                {/* The Verse Text */}
                <div className="flex-1 flex items-center justify-center my-4 relative z-10 w-full">
                  <p className="font-serif text-2xl md:text-3xl text-gray-900 dark:text-amber-50 leading-relaxed drop-shadow-sm break-words break-all hyphens-auto text-balance">
                    {displayVerse}
                  </p>
                </div>

                {/* Decorative Quote Mark */}
                <span className="text-6xl text-amber-500/20 dark:text-amber-500/10 font-serif leading-none absolute bottom-24 right-6 rotate-12">"</span>

                {/* The Reference */}
                <div className="mt-8 pt-6 border-t border-amber-900/10 dark:border-amber-500/20 w-full">
                  <span className="inline-block bg-white/60 dark:bg-slate-800/80 backdrop-blur-md px-6 py-2 rounded-full text-sm font-black text-amber-900 dark:text-amber-400 shadow-sm">
                    {displayRef}
                  </span>
                </div>
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  )
}
