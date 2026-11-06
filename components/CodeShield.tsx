'use client'

import { useEffect } from 'react'
import { siteConfig } from '@/utils/config'

function isField(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

/**
 * Empêche la copie du code et du cadre de l'application.
 * Les champs (nom, téléphone, message) restent sélectionnables :
 * un responsable doit pouvoir copier un numéro.
 */
export function CodeShield() {
  useEffect(() => {
    const stop = (event: Event) => {
      if (isField(event.target)) return
      event.preventDefault()
    }
    const onKey = (event: KeyboardEvent) => {
      if (isField(event.target)) return
      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && (key === 'u' || key === 's' || key === 'c')) {
        event.preventDefault()
      }
    }
    document.addEventListener('contextmenu', stop)
    document.addEventListener('copy', stop)
    document.addEventListener('cut', stop)
    document.addEventListener('dragstart', stop)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('contextmenu', stop)
      document.removeEventListener('copy', stop)
      document.removeEventListener('cut', stop)
      document.removeEventListener('dragstart', stop)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <p
      aria-hidden
      className="pointer-events-none fixed bottom-2 right-3 z-[70] select-none text-[10px] font-medium tracking-wide text-slate-500/80"
    >
      {siteConfig.signature}
    </p>
  )
}
