'use client'

import { useState } from 'react'
import Link from 'next/link'
import InfiltrateButton from '@/components/InfiltrateButton'

export default function ChurchesTable({ churches }: { churches: any[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredChurches = (churches || []).filter(church => {
    const matchesStatus = statusFilter === 'all' || (church.status || 'active') === statusFilter
    if (!matchesStatus) return false

    if (!searchTerm.trim()) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      church.name?.toLowerCase().includes(searchLower) ||
      church.code?.toLowerCase().includes(searchLower) ||
      church.city?.toLowerCase().includes(searchLower) ||
      church.commune?.toLowerCase().includes(searchLower) ||
      church.quartier?.toLowerCase().includes(searchLower)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filteredChurches.length / itemsPerPage))
  const paginatedChurches = filteredChurches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="mt-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-2xl font-serif text-primary-900 dark:text-gold-400">Répertoire & Administration</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Recherchez, gérez, modifiez ou téléportez-vous dans n&apos;importe quelle église du réseau.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Filtres de statut */}
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-slate-800 p-1 border border-gray-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => { setStatusFilter('all'); setCurrentPage(1) }}
              className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-900 dark:text-gold-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'}`}
            >
              Toutes ({churches?.length || 0})
            </button>
            <button
              onClick={() => { setStatusFilter('active'); setCurrentPage(1) }}
              className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'active' ? 'bg-white dark:bg-slate-700 shadow-sm text-green-600 dark:text-green-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'}`}
            >
              Actives ({churches?.filter(c => (c.status || 'active') === 'active').length || 0})
            </button>
            <button
              onClick={() => { setStatusFilter('suspended'); setCurrentPage(1) }}
              className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'suspended' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600 dark:text-red-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'}`}
            >
              Suspendues ({churches?.filter(c => c.status === 'suspended').length || 0})
            </button>
          </div>

          <div className="relative flex-1 md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Rechercher nom, code, ville..."
              className="pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 w-full dark:bg-slate-700 dark:text-white text-xs shadow-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          <Link href="/super-admin/churches/new" className="px-4 py-2 bg-gradient-to-r from-primary-900 to-primary-800 text-white rounded-xl text-xs font-bold hover:shadow-md transition-all flex items-center justify-center gap-1.5 whitespace-nowrap border border-gold-500/30">
            <span>➕</span> Nouvelle Église
          </Link>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md overflow-hidden border border-gray-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-slate-750 text-[11px] uppercase text-gray-500 dark:text-gray-300 tracking-wider">
                <th className="px-5 py-3.5 font-bold border-b dark:border-slate-700">Code</th>
                <th className="px-5 py-3.5 font-bold border-b dark:border-slate-700">Logo</th>
                <th className="px-5 py-3.5 font-bold border-b dark:border-slate-700">Nom de l&apos;Église</th>
                <th className="px-5 py-3.5 font-bold border-b dark:border-slate-700">Localisation</th>
                <th className="px-5 py-3.5 font-bold border-b dark:border-slate-700">Statut</th>
                <th className="px-5 py-3.5 font-bold border-b dark:border-slate-700 text-right">Actions Directes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
              {paginatedChurches.length > 0 ? (
                paginatedChurches.map((church) => (
                  <tr key={church.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-primary-700 dark:text-primary-300">
                      <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-950/40 rounded border border-primary-200 dark:border-primary-800">
                        {church.code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {church.logo_url ? (
                        <img src={church.logo_url} alt="Logo" className="h-8 w-8 object-cover rounded-full shadow-sm border border-gray-200 dark:border-slate-600 bg-white" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center text-xs font-bold text-primary-800 dark:text-gold-400 shadow-sm border border-gold-500/40">
                          {church.name?.substring(0, 2).toUpperCase() || 'EC'}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-sm text-gray-900 dark:text-white">
                      {church.name}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600 dark:text-gray-300">
                      {[church.city, church.commune, church.quartier].filter(Boolean).join(' • ') || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${church.status === 'active' || !church.status ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800/50' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/50'}`}>
                        {church.status === 'suspended' ? '🔴 Suspendue' : '🟢 Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <InfiltrateButton churchId={church.id} />
                        <Link 
                          href={`/super-admin/churches/${church.id}`} 
                          className="text-xs font-bold text-primary-700 hover:text-primary-900 dark:text-gold-400 dark:hover:text-gold-300 bg-primary-50 hover:bg-primary-100 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border border-primary-200/50 dark:border-slate-600 shadow-sm"
                        >
                          ⚙️ Gérer
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                    Aucune église ne correspond à votre filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center bg-gray-50/60 dark:bg-slate-750 px-6 py-3 border-t border-gray-100 dark:border-slate-700 text-xs">
            <p className="text-gray-500 dark:text-gray-400">
              Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredChurches.length)} sur {filteredChurches.length} églises
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border dark:border-slate-600 rounded-lg font-medium disabled:opacity-40 hover:bg-white dark:hover:bg-slate-700 transition-colors"
              >
                Précédent
              </button>
              <span className="flex items-center px-3 font-bold text-primary-900 dark:text-gold-400">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border dark:border-slate-600 rounded-lg font-medium disabled:opacity-40 hover:bg-white dark:hover:bg-slate-700 transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
