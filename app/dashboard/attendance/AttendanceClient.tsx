'use client'

import { useState } from 'react'
import { saveAttendance } from './actions'

type Member = {
  id: string
  first_name: string
  last_name: string
}

export default function AttendanceClient({ members }: { members: Member[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set())
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isSaving, setIsSaving] = useState(false)

  const filteredMembers = members.filter(m => 
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const togglePresence = (id: string) => {
    setPresentIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    const result = await saveAttendance(date, Array.from(presentIds))
    setIsSaving(false)
    if (result.error) {
      alert("Erreur lors de la sauvegarde : " + result.error)
    } else {
      alert(`Pointage sauvegardé avec succès pour le ${date} !`)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border-t-4 border-accent-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pointage</h2>
          <p className="text-sm text-gray-500">{presentIds.size} / {members.length} membres présents</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <input 
            type="date" 
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700"
          />
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-accent-900 hover:bg-accent-500 disabled:opacity-50 text-white font-medium rounded-md shadow-sm transition-colors whitespace-nowrap"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer le pointage'}
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <input 
          type="text"
          placeholder="Rechercher un membre (ex: Jean)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded-full bg-gray-50 dark:bg-slate-900 dark:border-slate-700 focus:ring-accent-500 focus:border-accent-500 shadow-inner"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredMembers.map(member => {
          const isPresent = presentIds.has(member.id)
          return (
            <div 
              key={member.id}
              onClick={() => togglePresence(member.id)}
              className={`p-4 rounded-lg cursor-pointer border-2 transition-all flex items-center justify-between ${isPresent ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-accent-200'}`}
            >
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {member.first_name} {member.last_name}
              </div>
              
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${isPresent ? 'bg-gold-500 border-gold-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                {isPresent && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                )}
              </div>
            </div>
          )
        })}
        {filteredMembers.length === 0 && (
          <p className="col-span-full text-center text-gray-500 py-8">Aucun membre trouvé.</p>
        )}
      </div>
    </div>
  )
}
