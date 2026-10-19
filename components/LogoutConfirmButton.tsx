'use client'

import { useState } from 'react'
import { LogOut, AlertCircle, X, Check } from 'lucide-react'

interface LogoutConfirmButtonProps {
  action?: () => Promise<void> | void
  formAction?: string
  variant?: 'sidebar' | 'member' | 'superadmin' | 'navbar'
  userName?: string
  className?: string
  churchName?: string
}

export default function LogoutConfirmButton({
  action,
  formAction = '/auth/signout',
  variant = 'sidebar',
  userName,
  className,
  churchName,
}: LogoutConfirmButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    setIsSubmitting(true)
    if (action) {
      try {
        await action()
      } catch (err) {
        console.error('Erreur déconnexion:', err)
        setIsSubmitting(false)
      }
    } else {
      // Formulaire standard POST
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = formAction
      document.body.appendChild(form)
      form.submit()
    }
  }

  // Styles de déclencheur selon le contexte
  const renderTrigger = () => {
    if (variant === 'sidebar') {
      return (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`w-full text-left px-4 py-3 text-sm font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all duration-300 flex items-center gap-3 border border-red-500/20 hover:border-red-500/40 shadow-lg shadow-red-500/5 hover:-translate-y-0.5 ${className || ''}`}
        >
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      )
    }

    if (variant === 'member') {
      return (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`text-xs font-bold text-red-500 hover:text-white hover:bg-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-md shadow-sm border border-red-200 dark:border-red-800 transition-colors flex items-center gap-1.5 ${className || ''}`}
        >
          <LogOut size={14} />
          <span>Me déconnecter</span>
        </button>
      )
    }

    if (variant === 'superadmin') {
      return (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`text-sm text-gray-200 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors ${className || ''}`}
        >
          <LogOut size={16} />
          <span>Déconnexion</span>
        </button>
      )
    }

    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={className || "text-sm text-red-500 hover:text-red-700 flex items-center gap-1.5"}
      >
        <LogOut size={16} />
        <span>Déconnexion</span>
      </button>
    )
  }

  return (
    <>
      {renderTrigger()}

      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transform animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Bandeau stylé */}
            <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-primary-900 p-6 text-white text-center relative overflow-hidden border-b-2 border-gold-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
              
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-red-500/20 border border-red-400/30 flex items-center justify-center text-red-300 shadow-inner">
                <LogOut size={28} />
              </div>

              <h3 className="text-xl font-serif font-bold text-white tracking-wide">
                Confirmation de Déconnexion
              </h3>
              <p className="text-xs text-gold-300/90 mt-1">
                {churchName ? `Espace ${churchName}` : 'Session Église Connect'}
              </p>
            </div>

            {/* Corps du message */}
            <div className="p-6 text-center">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                {userName ? `Chèr(e) ${userName}, souhaitez-vous vraiment vous déconnecter ?` : 'Souhaitez-vous vraiment vous déconnecter de votre espace ?'}
              </p>

              {/* Encadré rassurant Reconnexion en 1 Clic */}
              <div className="mt-4 p-3.5 bg-gradient-to-br from-amber-50 to-gold-500/10 dark:from-slate-800/80 dark:to-gold-950/20 rounded-2xl border border-gold-400/30 text-left flex items-start gap-3 shadow-sm">
                <div className="p-1.5 bg-gold-500/20 text-gold-600 dark:text-gold-400 rounded-lg flex-shrink-0 mt-0.5">
                  <Check size={16} />
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <span className="font-bold text-primary-900 dark:text-gold-400 block mb-0.5">Reconnexion facile en 1 clic</span>
                  Votre profil restera mémorisé sur cet appareil. Vous pourrez revenir instantanément sans retaper vos coordonnées.
                </div>
              </div>
            </div>

            {/* Boutons d'actions */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span>Déconnexion...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    <span>Oui, me déconnecter</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
