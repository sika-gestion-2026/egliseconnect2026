'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { switchChurchAction } from '@/app/actions/switchChurch'
import Link from 'next/link'

export function SuperAdminOmniboxClient() {
  const [isOpen, setIsOpen] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSwitch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await switchChurchAction(code)
      if (res.error) {
        setError(res.error)
      } else if (res.success) {
        setSuccess(res.message || 'Succès')
        setCode('')
        setTimeout(() => {
          setIsOpen(false)
          if (res.redirectUrl) {
            router.push(res.redirectUrl)
          }
        }, 1500)
      }
    } catch (err) {
      setError('Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }

  const toggleOpen = () => setIsOpen(!isOpen)

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Bouton God Mode */}
      <button
        onClick={toggleOpen}
        className={`w-14 h-14 flex items-center justify-center rounded-full shadow-2xl transition-all duration-500 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-gold-500 focus:ring-opacity-50 ${
          isOpen ? 'bg-slate-900 rotate-45' : 'bg-gradient-to-r from-gold-400 to-gold-600'
        }`}
        title="God Mode"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="w-6 h-6 text-white"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Menu God Mode */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-4 w-80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-900 p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gold-500/20 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
            <h3 className="text-gold-400 font-bold font-serif text-lg tracking-wider flex items-center gap-2 relative z-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              GOD MODE
            </h3>
            <p className="text-slate-300 text-xs mt-1 relative z-10">
              Téléportation et Vues
            </p>
          </div>

          <div className="p-5 space-y-5">
            {/* Formulaire de téléportation */}
            <form onSubmit={handleSwitch}>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Rejoindre une église
              </label>
              <div className="flex relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Code Église (ex: PARIS)"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm font-mono font-bold dark:text-white uppercase transition-shadow"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 bg-primary-900 text-white rounded-r-lg font-bold text-sm hover:bg-primary-800 transition-colors disabled:opacity-50"
                >
                  {loading ? '...' : 'Go'}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 italic">Tapez "SUPER" pour revenir à la vue globale</p>
              
              {error && <div className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</div>}
              {success && <div className="mt-2 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">{success}</div>}
            </form>

            <div className="h-px bg-gray-200 dark:bg-slate-700 w-full"></div>

            {/* Accès rapide aux Tableaux de Bord */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Tableaux de Bord
              </label>
              <div className="space-y-2">
                <Link href="/super-admin" onClick={() => setIsOpen(false)} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors">
                  <span className="w-6 h-6 rounded-md bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400 flex items-center justify-center">🌐</span>
                  Vue Globale (Super Admin)
                </Link>
                <Link href="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors">
                  <span className="w-6 h-6 rounded-md bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">🏛️</span>
                  Admin Église Active
                </Link>
                <Link href="/member-dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors">
                  <span className="w-6 h-6 rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">👤</span>
                  Espace Membre Actif
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
