'use client'

import { useState } from 'react'
import { updateEdificationFeed } from '@/app/actions/edification'
import toast from 'react-hot-toast'

export default function EdificationClient({ church }: { church: any }) {
  const [mode, setMode] = useState<'auto' | 'manual'>(church?.edification_mode || 'auto')
  const [verseText, setVerseText] = useState(church?.custom_verse_text || "Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux.")
  const [verseRef, setVerseRef] = useState(church?.custom_verse_ref || 'Matthieu 18:20')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    const res = await updateEdificationFeed(church.id, mode, verseText, verseRef)
    setIsSaving(false)

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Paramètres sauvegardés avec succès !')
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Settings Panel */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span>⚙️</span> Configuration
        </h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Pilote Automatique
                {mode === 'auto' && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold uppercase tracking-wider animate-pulse">Actif</span>}
              </h3>
              <p className="text-xs text-gray-500 mt-1">Génère un verset aléatoire différent chaque semaine.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={mode === 'auto'}
                onChange={(e) => setMode(e.target.checked ? 'auto' : 'manual')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-500"></div>
            </label>
          </div>

          <div className={`transition-all duration-300 ${mode === 'auto' ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Verset Personnalisé</label>
            <textarea 
              value={verseText}
              onChange={(e) => setVerseText(e.target.value)}
              className="w-full p-3 rounded-lg border dark:bg-slate-900 dark:border-slate-600 text-sm focus:ring-2 focus:ring-primary-500 min-h-[100px] mb-3"
              placeholder="Saisissez le verset ici..."
            />
            
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Référence Biblique</label>
            <input 
              type="text"
              value={verseRef}
              onChange={(e) => setVerseRef(e.target.value)}
              className="w-full p-3 rounded-lg border dark:bg-slate-900 dark:border-slate-600 text-sm focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: Psaumes 23:1"
            />
          </div>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-md transition-colors flex justify-center items-center gap-2"
          >
            {isSaving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>

      {/* Preview Panel */}
      <div>
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-500">
          <span>👀</span> Aperçu (Espace Membre)
        </h2>
        
        {(() => {
          const autoVerses = [
            { text: "L'Éternel est mon berger: je ne manquerai de rien.", ref: "Psaumes 23:1" },
            { text: "Ne t'ai-je pas donné cet ordre: Fortifie-toi et prends courage ?", ref: "Josué 1:9" },
            { text: "Je puis tout par celui qui me fortifie.", ref: "Philippiens 4:13" },
            { text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique...", ref: "Jean 3:16" },
            { text: "Confie-toi en l'Éternel de tout ton cœur...", ref: "Proverbes 3:5" }
          ];
          const weekNumber = Math.ceil(Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (24 * 60 * 60 * 1000)) / 7);
          const currentAutoVerse = autoVerses[weekNumber % autoVerses.length];

          return (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 p-8 rounded-2xl border border-amber-200/50 dark:border-amber-800/30 shadow-lg relative overflow-hidden transform rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="absolute top-0 right-0 p-6 opacity-10 text-8xl">✨</div>
              <div className="absolute -bottom-10 -left-10 opacity-5 text-9xl">🕊️</div>
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <span className="text-amber-600 dark:text-amber-500 text-sm font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
                  <span className="w-8 h-px bg-amber-300"></span>
                  Verset de la semaine
                  <span className="w-8 h-px bg-amber-300"></span>
                </span>
                
                <p className="font-serif text-2xl md:text-3xl text-gray-800 dark:text-amber-100/90 leading-relaxed italic mb-8">
                  "{mode === 'auto' ? currentAutoVerse.text : verseText}"
                </p>
                
                <span className="inline-block bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
                  — {mode === 'auto' ? currentAutoVerse.ref : verseRef}
                </span>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
