'use client'

import { useFormStatus } from 'react-dom'
import { useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

export default function FormActions({ cancelUrl, submitText = 'Enregistrer' }: { cancelUrl?: string, submitText?: string }) {
  const { pending } = useFormStatus()
  const toastIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (pending) {
      toastIdRef.current = toast.loading('Opération en cours...')
    } else {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current)
        toastIdRef.current = null
      }
    }
    return () => {
      if (toastIdRef.current) toast.dismiss(toastIdRef.current)
    }
  }, [pending])

  return (
    <div className="flex justify-end gap-4 border-t pt-6 dark:border-slate-700">
      {cancelUrl && (
        <Link 
          href={cancelUrl} 
          onClick={() => toast('Action annulée', { icon: 'ℹ️' })}
          className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          Annuler
        </Link>
      )}
      <button 
        type="submit" 
        disabled={pending}
        className="px-6 py-2 bg-primary-900 hover:bg-primary-500 text-white font-bold rounded-md transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
      >
        {pending && (
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {pending ? 'Patientez...' : submitText}
      </button>
    </div>
  )
}
