'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { bulkImportMembers } from '@/app/actions/bulkMembers'
import toast from 'react-hot-toast'

export default function ExcelImportModal({ 
  churchId, 
  onClose 
}: { 
  churchId: string
  onClose: () => void 
}) {
  const [loading, setLoading] = useState(false)
  const [parsedData, setParsedData] = useState<any[]>([])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const json = XLSX.utils.sheet_to_json(worksheet)
        
        // Map excel columns to our database columns
        // Expecting something like: Nom, Prénom, Téléphone, Quartier, Email
        const mappedData = json.map((row: any) => ({
          first_name: row['Prénom'] || row['Prenom'] || row['first_name'] || '',
          last_name: row['Nom'] || row['last_name'] || '',
          phone: row['Téléphone'] || row['Telephone'] || row['phone'] || null,
          email: row['Email'] || row['email'] || null,
          quartier: row['Quartier'] || row['quartier'] || null
        })).filter(m => m.first_name || m.last_name)

        setParsedData(mappedData)
      } catch (err) {
        toast.error('Erreur lors de la lecture du fichier Excel.')
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (parsedData.length === 0) return
    setLoading(true)
    
    const res = await bulkImportMembers(churchId, parsedData)
    
    setLoading(false)
    if (res.success) {
      toast.success(`${parsedData.length} membres importés avec succès !`)
      onClose()
    } else {
      toast.error('Erreur lors de l\'importation: ' + res.error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
          <h2 className="text-xl font-bold font-serif text-primary-900 dark:text-gold-400 flex items-center gap-2">
            📊 Import Excel Massif
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6 flex-1">
          <p className="text-sm text-gray-500">
            Importez un fichier Excel (.xlsx, .csv) contenant une liste de membres. 
            Les colonnes reconnues sont : <strong>Nom, Prénom, Téléphone, Email, Quartier</strong>.
          </p>

          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileUpload}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-primary-50 file:text-primary-700
              hover:file:bg-primary-100 dark:file:bg-primary-900/30 dark:file:text-gold-400"
          />

          {parsedData.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-900/50">
              <p className="font-bold text-green-800 dark:text-green-400">
                ✅ {parsedData.length} membres détectés et prêts à être importés.
              </p>
              <div className="mt-2 max-h-32 overflow-y-auto text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {parsedData.slice(0, 5).map((m, i) => (
                  <div key={i}>{m.first_name} {m.last_name} - {m.phone || 'Pas de numéro'}</div>
                ))}
                {parsedData.length > 5 && <div>...et {parsedData.length - 5} autres.</div>}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium"
          >
            Annuler
          </button>
          <button 
            onClick={handleImport}
            disabled={parsedData.length === 0 || loading}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            {loading ? 'Importation en cours...' : 'Lancer l\'importation'}
          </button>
        </div>
      </div>
    </div>
  )
}
