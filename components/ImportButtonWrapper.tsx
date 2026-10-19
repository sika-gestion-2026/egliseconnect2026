'use client'

import { useState } from 'react'
import ExcelImportModal from './ExcelImportModal'

export default function ImportButtonWrapper({ churchId }: { churchId: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-white dark:bg-slate-800 text-primary-900 dark:text-white rounded-md font-medium border border-gray-300 dark:border-slate-600 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2 text-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        Importer Excel
      </button>
      {isOpen && <ExcelImportModal churchId={churchId} onClose={() => setIsOpen(false)} />}
    </>
  )
}
