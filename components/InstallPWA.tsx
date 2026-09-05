'use client'

import { useState, useEffect } from 'react'
import { Download, X, Share, PlusSquare } from 'lucide-react'

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(true) // default true to avoid hydration flicker

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return

    // Check if app is already installed
    const isAppStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    setIsStandalone(isAppStandalone)

    if (isAppStandalone) return

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    if (isIosDevice) {
      // Show iOS prompt after a short delay
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(timer)
    }

    // Handle beforeinstallprompt for Android/Desktop Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    
    // Show the install prompt
    deferredPrompt.prompt()
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    }
    
    // Clear the deferredPrompt variable, since it can only be used once
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  if (isStandalone || !showPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:right-8 md:bottom-8 md:w-96 animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3">
          <button 
            onClick={() => setShowPrompt(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors bg-gray-100 dark:bg-slate-800 rounded-full p-1"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="flex gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
            <span className="text-xl font-black">EC</span>
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">Église Connect</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">
              Installez l'application pour un accès plus rapide et fluide.
            </p>
            
            {isIOS ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-xs text-blue-800 dark:text-blue-300">
                <div className="flex items-center gap-2 mb-2 font-bold">
                  <span>Pour installer sur iPhone :</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 opacity-90">
                  <li className="flex items-center gap-1.5">
                    Appuyez sur <Share size={14} className="inline" /> en bas
                  </li>
                  <li className="flex items-center gap-1.5">
                    Faites défiler et choisissez <br/>
                    <span className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1 border border-blue-100 dark:border-blue-800">
                      <PlusSquare size={12} /> Sur l'écran d'accueil
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="w-full bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-md transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                <Download size={16} /> Installer l'Application
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
