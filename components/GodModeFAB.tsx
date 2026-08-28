'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function GodModeFAB({ userEmail }: { userEmail: string }) {
  const [isOpen, setIsOpen] = useState(false)

  // Le bouton ne s'affiche STRICTEMENT que pour cet email
  if (userEmail !== 'munokolive@gmail.com') return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {/* Menu déroulant (vers le haut) */}
      <div 
        className={`mb-4 flex flex-col gap-3 transition-all duration-300 origin-bottom ${
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-10 pointer-events-none'
        }`}
      >
        <Link 
          href="/super-admin"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 bg-slate-900 text-gold-400 font-bold px-5 py-3 rounded-2xl shadow-xl hover:bg-slate-800 transition-colors border-2 border-gold-500/50 hover:-translate-x-2"
        >
          <span className="text-xl">👑</span>
          Super Admin Mode
        </Link>
        <Link 
          href="/dashboard"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 bg-white dark:bg-slate-800 text-primary-900 dark:text-white font-bold px-5 py-3 rounded-2xl shadow-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-gray-700 hover:-translate-x-2"
        >
          <span className="text-xl">⛪</span>
          Mode Responsable
        </Link>
        <Link 
          href="/member-dashboard"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold px-5 py-3 rounded-2xl shadow-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-gray-700 hover:-translate-x-2"
        >
          <span className="text-xl">👥</span>
          Espace Membre
        </Link>
      </div>

      {/* Bouton principal flottant */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform focus:outline-none border-4 border-white dark:border-slate-800 relative group"
      >
        {/* Effet de pulsation */}
        <div className="absolute inset-0 rounded-full bg-gold-400 animate-ping opacity-75 duration-1000 group-hover:hidden"></div>
        
        {isOpen ? (
          <svg className="w-8 h-8 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
        ) : (
          <svg className="w-8 h-8 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
        )}
      </button>
    </div>
  )
}
