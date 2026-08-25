'use client'

import { useState } from 'react'
import { saveNoteAction } from '@/app/actions/memberNotes'

type Verse = {
  reference: string
  text: string
}

type Note = {
  id: string
  title: string
  content: string
  verses: Verse[]
  created_at: string
}

export default function NotesWidget({ initialNotes, defaultTitle = '' }: { initialNotes: Note[], defaultTitle?: string }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(false)

  // Editor states
  const [title, setTitle] = useState(defaultTitle)
  const [content, setContent] = useState('')
  const [verses, setVerses] = useState<Verse[]>([])

  const [newVerseRef, setNewVerseRef] = useState('')
  const [newVerseText, setNewVerseText] = useState('')
  const [showVerseForm, setShowVerseForm] = useState(false)

  const handleAddVerse = () => {
    if (newVerseRef && newVerseText) {
      setVerses([...verses, { reference: newVerseRef, text: newVerseText }])
      setNewVerseRef('')
      setNewVerseText('')
      setShowVerseForm(false)
    }
  }

  const handleRemoveVerse = (index: number) => {
    setVerses(verses.filter((_, i) => i !== index))
  }

  const handleSaveNote = async () => {
    if (!title) return alert('Veuillez entrer un titre')
    
    setLoading(true)
    const formData = new FormData()
    formData.append('title', title)
    formData.append('content', content)
    formData.append('verses', JSON.stringify(verses))

    const res = await saveNoteAction(formData)
    setLoading(false)

    if (res.error) {
      alert(res.error)
    } else {
      // Pour éviter de re-fetch, on l'ajoute localement
      const newNote = {
        id: Math.random().toString(),
        title,
        content,
        verses,
        created_at: new Date().toISOString()
      }
      setNotes([newNote, ...notes])
      setIsCreating(false)
      setTitle('')
      setContent('')
      setVerses([])
    }
  }

  if (isCreating) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-serif text-primary-900 dark:text-gold-400 font-bold">Nouveau Carnet</h2>
          <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="space-y-6">
          <div>
            <input 
              type="text" 
              placeholder="Titre de l'enseignement..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl font-bold bg-transparent border-b-2 border-gray-200 dark:border-slate-700 focus:border-primary-500 dark:focus:border-gold-400 outline-none pb-2 text-gray-900 dark:text-white"
            />
          </div>

          {/* Verses Section */}
          <div className="space-y-4">
            {verses.map((v, i) => (
              <div key={i} className="relative bg-orange-50 dark:bg-amber-900/10 p-4 rounded-lg border-l-4 border-orange-400 font-serif italic text-gray-700 dark:text-gray-300 shadow-sm group">
                <button onClick={() => handleRemoveVerse(i)} className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                <p className="text-sm">"{v.text}"</p>
                <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-2">— {v.reference}</p>
              </div>
            ))}

            {showVerseForm ? (
              <div className="bg-gray-50 dark:bg-slate-750 p-4 rounded-lg border border-gray-200 dark:border-slate-600 space-y-3 animate-in slide-in-from-top-2">
                <input 
                  type="text" 
                  placeholder="Référence (ex: Jean 3:16)" 
                  value={newVerseRef}
                  onChange={(e) => setNewVerseRef(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
                <textarea 
                  placeholder="Texte du verset..." 
                  value={newVerseText}
                  onChange={(e) => setNewVerseText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowVerseForm(false)} className="px-3 py-1 text-xs text-gray-500">Annuler</button>
                  <button onClick={handleAddVerse} className="px-3 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-md">Ajouter</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowVerseForm(true)}
                className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 font-medium hover:bg-orange-50 dark:hover:bg-orange-900/20 px-3 py-2 rounded-md transition-colors"
              >
                <span>📖</span> Ajouter un verset
              </button>
            )}
          </div>

          <div>
            <textarea 
              placeholder="Vos notes..." 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full p-4 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-750 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button 
              onClick={handleSaveNote}
              disabled={loading}
              className="px-6 py-3 bg-primary-900 text-white font-bold rounded-xl shadow-md hover:bg-primary-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer la note'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-serif text-gray-900 dark:text-white font-bold">Mon Carnet Spirituel</h2>
          <p className="text-sm text-gray-500">Retrouvez vos enseignements et versets clés.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white rounded-lg font-medium shadow-sm transition-colors"
        >
          <span>✍️</span> Nouvelle Note
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {notes.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-slate-600">
            Vous n'avez pas encore pris de notes. Commencez votre carnet !
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6 border-t-4 border-orange-400 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{note.title}</h3>
                <span className="text-xs text-gray-400 whitespace-nowrap bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
                  {new Date(note.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              
              <div className="flex-1">
                {note.verses?.map((v, i) => (
                  <div key={i} className="mb-4 bg-orange-50 dark:bg-amber-900/10 p-3 rounded-md border-l-4 border-orange-400 font-serif italic text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-bold text-orange-600 dark:text-orange-400">{v.reference}</span> : "{v.text}"
                  </div>
                ))}
                {note.content && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4 whitespace-pre-wrap">
                    {note.content}
                  </p>
                )}
              </div>
              
              <button className="mt-4 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-gold-400 text-left">
                Lire la suite →
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
