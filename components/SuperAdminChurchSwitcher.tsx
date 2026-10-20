'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { switchChurchAction } from '@/app/actions/switchChurch'

interface Church {
  id: string
  name: string
  code: string
  logo_url: string | null
  status: string
}

export default function SuperAdminChurchSwitcher({
  churches,
  currentChurchId,
  currentChurchName,
}: {
  churches: Church[]
  currentChurchId: string | null
  currentChurchName: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = churches.filter((c) => {
    const s = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(s) ||
      c.code?.toLowerCase().includes(s)
    )
  })

  const handleSwitch = async (code: string) => {
    setLoading(code)
    setError(null)
    try {
      const res = await switchChurchAction(code)
      if (res.error) {
        setError(res.error)
        setLoading(null)
      } else if (res.redirectUrl) {
        router.push(res.redirectUrl)
        router.refresh()
      }
    } catch {
      setError('Erreur inattendue')
      setLoading(null)
    }
  }

  const handleGlobalView = async () => {
    setLoading('SUPER')
    setError(null)
    try {
      const res = await switchChurchAction('SUPER')
      if (res.error) {
        setError(res.error)
        setLoading(null)
      } else if (res.redirectUrl) {
        router.push(res.redirectUrl)
        router.refresh()
      }
    } catch {
      setError('Erreur inattendue')
      setLoading(null)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 rounded-lg text-sm font-medium text-gold-700 dark:text-gold-400 transition-colors max-w-[220px]"
      >
        <span className="text-base">🏛️</span>
        <span className="truncate">{currentChurchName || 'Choisir une église'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-3 bg-gradient-to-r from-primary-900 to-primary-800">
            <p className="text-gold-400 font-bold text-sm flex items-center gap-2">
              ⚡ Changer d'église
            </p>
            <input
              type="text"
              autoFocus
              placeholder="Rechercher une église..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-2 w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div className="max-h-80 overflow-y-auto">
            <button
              onClick={handleGlobalView}
              disabled={loading === 'SUPER'}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-slate-800"
            >
              <span className="w-8 h-8 rounded-lg bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center text-sm">
                🌐
              </span>
              <div className="text-left flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Vue Globale</p>
                <p className="text-xs text-gray-500">Retour au Super Admin</p>
              </div>
              {loading === 'SUPER' && (
                <span className="text-xs text-gray-400 animate-pulse">...</span>
              )}
            </button>

            {filtered.map((church) => (
              <button
                key={church.id}
                onClick={() => handleSwitch(church.code)}
                disabled={loading === church.code}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border-b border-gray-50 dark:border-slate-800/50 ${
                  church.id === currentChurchId ? 'bg-gold-50 dark:bg-gold-900/10' : ''
                }`}
              >
                {church.logo_url ? (
                  <img
                    src={church.logo_url}
                    alt={church.name}
                    className="w-8 h-8 rounded-lg object-cover border border-gray-200 dark:border-slate-600"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">
                    {church.name?.substring(0, 2).toUpperCase() || 'E'}
                  </div>
                )}
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {church.name}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">{church.code}</p>
                </div>
                {church.id === currentChurchId && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-bold">
                    Actuelle
                  </span>
                )}
                {loading === church.code && (
                  <span className="text-xs text-gray-400 animate-pulse">...</span>
                )}
              </button>
            ))}

            {filtered.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">
                Aucune église trouvée
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
