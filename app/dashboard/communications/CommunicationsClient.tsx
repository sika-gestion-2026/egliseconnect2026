'use client'

import { useState } from 'react'

type Member = { quartier: string | null }

export default function CommunicationsClient({ members, quartiers }: { members: Member[], quartiers: string[] }) {
  const [charCount, setCharCount] = useState(0)
  const [sent, setSent] = useState(false)

  function handleSimulate() {
    setSent(true)
    setTimeout(() => setSent(false), 4000)
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border-t-4 border-primary-900 p-8">
      {sent && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg border border-green-200 text-center font-bold">
          ✅ Simulation d'envoi réussie ! (Connectez une API SMS pour l'envoi réel)
        </div>
      )}

      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-lg text-sm">
        <strong>Mode Démonstration :</strong> L'interface est prête. Connectez une clé API Twilio ou Orange SMS dans les variables d'environnement pour l'envoi réel.
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold mb-2">Cible (Destinataires) <span className="text-accent-500">*</span></label>
          <select name="target" className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700">
            <option value="all">Tous les membres ({members.length} membres)</option>
            <option value="absentees">Les absents du dernier culte</option>
            <optgroup label="Par Département / Groupe">
              <option value="dept_mutuelle">Tous les membres de la Mutuelle</option>
              <option value="dept_jeunesse">Groupe de Jeunesse</option>
              <option value="dept_chorale">Groupe musical (Chant/Instrument)</option>
              <option value="dept_anciens">Anciens de l'église</option>
            </optgroup>
            <optgroup label="Par Quartier">
              {quartiers.map((q) => (
                <option key={q} value={`quartier_${q}`}>Quartier : {q}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2 flex justify-between">
            <span>Message SMS <span className="text-accent-500">*</span></span>
            <span className="text-gray-400 font-normal">{charCount} / 160 caractères</span>
          </label>
          <textarea
            name="message"
            rows={4}
            maxLength={160}
            onChange={(e) => setCharCount(e.target.value.length)}
            className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700"
            placeholder="Ex: Shalom ! Nous vous rappelons la réunion de ce soir à 18h..."
          ></textarea>
        </div>

        <div className="flex justify-end pt-4 border-t dark:border-slate-700">
          <button
            type="button"
            onClick={handleSimulate}
            className="px-6 py-3 bg-primary-900 hover:bg-primary-500 text-white font-bold rounded-md shadow-md flex items-center gap-2 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            Envoyer le SMS Massif
          </button>
        </div>
      </div>
    </div>
  )
}
