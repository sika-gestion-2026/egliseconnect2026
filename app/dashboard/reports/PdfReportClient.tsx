'use client'

import { useState, useRef } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export default function PdfReportClient({ reportData }: { reportData: any }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const handleGeneratePDF = async () => {
    setIsGenerating(true)
    try {
      if (reportRef.current) {
        // Unhide the report div for capture
        reportRef.current.style.display = 'block'
        
        const canvas = await html2canvas(reportRef.current, {
          scale: 2, // Higher resolution
          useCORS: true
        })
        
        // Re-hide the report div
        reportRef.current.style.display = 'none'

        const imgData = canvas.toDataURL('image/png')
        
        // A4 format
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        })

        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
        pdf.save(`Rapport_Eglise_${new Date().getTime()}.pdf`)
      }
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      alert("Une erreur est survenue lors de la création du PDF.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
          <div className="w-24 h-24 bg-primary-50 dark:bg-primary-900/30 text-primary-900 dark:text-gold-400 rounded-full flex items-center justify-center mb-2">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold dark:text-white mb-2">Générateur de Rapport Mensuel</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Ce rapport va compiler les statistiques de <strong>{reportData.churchName}</strong> en un magnifique document PDF imprimable.
            </p>
          </div>

          <button 
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="px-8 py-4 bg-primary-900 hover:bg-primary-800 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-3 text-lg disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Création du PDF...
              </>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Générer & Télécharger
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hidden Div representing the PDF Layout */}
      <div 
        ref={reportRef} 
        style={{ display: 'none', width: '210mm', minHeight: '297mm', padding: '40px', backgroundColor: '#ffffff', color: '#000000', fontFamily: 'sans-serif' }}
      >
        <div style={{ borderBottom: '2px solid #D4AF37', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '32px', margin: '0', color: '#0f172a' }}>{reportData.churchName}</h1>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '5px' }}>Rapport Statistique Mensuel</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#94a3b8' }}>
            Généré le <br />
            <strong>{reportData.generatedAt}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
          <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', margin: '0 0 10px 0' }}>Total Membres</h3>
            <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#0f172a', margin: '0' }}>{reportData.membersCount}</p>
          </div>
          <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', margin: '0 0 10px 0' }}>Présents au dernier culte</h3>
            <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#059669', margin: '0' }}>{reportData.presentCount}</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '5px 0 0 0' }}>{reportData.lastAttendanceDate}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1, backgroundColor: '#fff1f2', padding: '20px', borderRadius: '10px', border: '1px solid #fecdd3' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#9f1239', margin: '0 0 10px 0' }}>Fidèles Absents</h3>
            <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#e11d48', margin: '0' }}>{reportData.absentees}</p>
            <p style={{ fontSize: '12px', color: '#f43f5e', margin: '5px 0 0 0' }}>Action requise (Appels ou Visites)</p>
          </div>
          <div style={{ flex: 1, backgroundColor: '#f5f3ff', padding: '20px', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#5b21b6', margin: '0 0 10px 0' }}>Anniversaires du mois</h3>
            <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#7c3aed', margin: '0' }}>{reportData.birthdays}</p>
            <p style={{ fontSize: '12px', color: '#8b5cf6', margin: '5px 0 0 0' }}>À célébrer pendant le culte</p>
          </div>
        </div>
        
        <div style={{ marginTop: '50px', textAlign: 'center', color: '#cbd5e1', fontSize: '12px', fontStyle: 'italic' }}>
          Document généré automatiquement par Église Connect
        </div>
      </div>
    </>
  )
}
