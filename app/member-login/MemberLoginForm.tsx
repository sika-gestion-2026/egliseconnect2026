'use client'

import { useState } from 'react'
import { memberLoginAction } from '@/app/actions/memberLogin'
import { useRouter } from 'next/navigation'

export default function MemberLoginForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const res = await memberLoginAction(formData)
    
    if (res.error) {
      setError(res.error)
      setLoading(false)
    } else {
      router.push('/member-dashboard')
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="church_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Code de l'église
        </label>
        <div className="mt-1">
          <input
            id="church_code"
            name="church_code"
            type="text"
            required
            placeholder="Ex: ABC12"
            className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Téléphone ou Email
        </label>
        <div className="mt-1">
          <input
            id="identifier"
            name="identifier"
            type="text"
            required
            placeholder="Votre numéro ou adresse email"
            className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? 'Connexion en cours...' : 'Accéder à mon espace'}
        </button>
      </div>
    </form>
  )
}
