'use client'

import { useState } from 'react'
import { addTeamMember, removeTeamMember } from './actions'

interface Profile {
  id: string
  email: string
  role: string
  created_at: string
}

export default function TeamClient({ 
  initialTeam, 
  currentUserEmail,
  currentUserId
}: { 
  initialTeam: Profile[], 
  currentUserEmail: string,
  currentUserId: string
}) {
  const [team, setTeam] = useState<Profile[]>(initialTeam)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)

    const result = await addTeamMember(formData)

    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess('Modérateur ajouté avec succès !')
      // Re-fetch or add to local state
      setTeam([
        ...team,
        {
          id: Math.random().toString(), // temporary ID before refresh
          email,
          role: 'church_admin',
          created_at: new Date().toISOString()
        }
      ])
      setEmail('')
      setPassword('')
    }
    setLoading(false)
  }

  const handleRemove = async (id: string, memberEmail: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir retirer les accès de modérateur à ${memberEmail} ?`)) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const result = await removeTeamMember(id)

    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(`Accès révoqués pour ${memberEmail}.`)
      setTeam(team.filter(t => t.id !== id))
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400">Équipe & Modérateurs</h1>
        <p className="text-gray-500 mt-2">
          Gérez les comptes des collaborateurs de votre église. Seuls ces comptes auront accès à l'application pour ajouter et gérer les membres.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 font-medium">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulaire d'ajout */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border-t-4 border-gold-500 space-y-4 h-fit">
          <h2 className="text-lg font-bold text-primary-900 dark:text-gold-400">Nouveau Modérateur</h2>
          <p className="text-xs text-gray-500">
            Créez des identifiants sécurisés pour votre collaborateur. Il pourra se connecter directement avec ces informations.
          </p>

          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Adresse Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@eglise.com"
                className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Mot de passe temporaire</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-primary-900 hover:bg-primary-500 text-white rounded-md font-bold transition-colors disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer le compte'}
            </button>
          </form>
        </div>

        {/* Liste des modérateurs */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-750 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b">
                <th className="px-6 py-3">Adresse Email</th>
                <th className="px-6 py-3">Rôle</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-slate-700">
              {team.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-slate-750/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{member.email}</div>
                    <div className="text-xs text-gray-500">
                      Ajouté le {new Date(member.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {member.email === currentUserEmail ? 'Pasteur Principal' : 'Modérateur'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {member.email !== currentUserEmail && (
                      <button
                        onClick={() => handleRemove(member.id, member.email)}
                        disabled={loading}
                        className="text-sm font-semibold text-red-600 hover:text-red-900 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        Révoquer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {team.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    Aucun modérateur configuré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
