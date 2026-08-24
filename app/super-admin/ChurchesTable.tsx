'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ChurchesTable({ churches }: { churches: any[] }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredChurches = churches?.filter(church => {
    const searchLower = searchTerm.toLowerCase()
    return (
      church.name?.toLowerCase().includes(searchLower) ||
      church.code?.toLowerCase().includes(searchLower) ||
      church.city?.toLowerCase().includes(searchLower) ||
      church.commune?.toLowerCase().includes(searchLower) ||
      church.quartier?.toLowerCase().includes(searchLower)
    )
  }) || []

  return (
    <div className="mt-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h3 className="text-2xl font-serif text-primary-900 dark:text-gold-400">Liste des Églises</h3>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Rechercher (Nom, Ville, Code...)"
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full dark:bg-slate-700 dark:text-white text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Link href="/super-admin/churches/new" className="px-4 py-2 bg-primary-900 text-white rounded-md text-sm font-medium hover:bg-primary-800 transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap">
            <span>+</span> Nouvelle Église
          </Link>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-x-auto border border-gray-100 dark:border-slate-700">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700 text-xs uppercase text-gray-500 dark:text-gray-300 tracking-wider">
              <th className="px-6 py-4 font-bold border-b dark:border-slate-600">Code</th>
              <th className="px-6 py-4 font-bold border-b dark:border-slate-600">Logo</th>
              <th className="px-6 py-4 font-bold border-b dark:border-slate-600">Nom</th>
              <th className="px-6 py-4 font-bold border-b dark:border-slate-600">Ville</th>
              <th className="px-6 py-4 font-bold border-b dark:border-slate-600">Commune</th>
              <th className="px-6 py-4 font-bold border-b dark:border-slate-600">Quartier</th>
              <th className="px-6 py-4 font-bold border-b dark:border-slate-600">Statut</th>
              <th className="px-6 py-4 font-bold border-b dark:border-slate-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {filteredChurches.length > 0 ? (
              filteredChurches.map((church) => (
                <tr key={church.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-750/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-gray-500 dark:text-gray-400">{church.code}</td>
                  <td className="px-6 py-4">
                    {church.logo_url ? (
                      <img src={church.logo_url} alt="Logo" className="h-8 w-8 object-cover rounded-full shadow-sm border border-gray-200 dark:border-slate-600" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300 shadow-sm border border-primary-200 dark:border-primary-800">
                        {church.name?.substring(0, 2).toUpperCase() || 'E'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-primary-900 dark:text-gold-400 whitespace-nowrap">{church.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{church.city || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{church.commune || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{church.quartier || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${church.status === 'active' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'}`}>
                      {church.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/super-admin/churches/${church.id}`} className="text-xs font-bold text-primary-600 hover:text-primary-800 dark:text-gold-400 dark:hover:text-gold-300 bg-primary-50 hover:bg-primary-100 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-md transition-all">
                      Gérer &rarr;
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  Aucune église trouvée pour la recherche "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
