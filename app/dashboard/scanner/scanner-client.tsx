'use client'

import { useEffect, useState, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'

export default function ScannerClient({ serviceId, serviceName }: { serviceId: string, serviceName: string }) {
  const [scannedResult, setScannedResult] = useState<string | null>(null)
  const [memberInfo, setMemberInfo] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [offlineQueue, setOfflineQueue] = useState<string[]>([])
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Load offline queue on mount
    const saved = localStorage.getItem('offline_scans_' + serviceId)
    if (saved) {
      setOfflineQueue(JSON.parse(saved))
    }
    // Only init scanner if not already scanning
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
        /* verbose= */ false
      )
      
      scannerRef.current.render(onScanSuccess, onScanFailure)
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        })
        scannerRef.current = null
      }
    }
  }, [])

  async function onScanSuccess(decodedText: string, decodedResult: any) {
    if (isLoading || scannedResult === decodedText) return
    
    // Pause scanning visually
    if (scannerRef.current) {
      scannerRef.current.pause(true)
    }

    setScannedResult(decodedText)
    setIsLoading(true)
    
    try {
      // 1. Fetch member info
      const { data: member, error: memberErr } = await supabase
        .from('members')
        .select('id, first_name, last_name, photo_url')
        .eq('id', decodedText)
        .single()

      if (memberErr || !member) {
        toast.error("Membre introuvable. QR Code invalide.")
        resetScanner()
        return
      }

      setMemberInfo(member)

      // 2. Log attendance
      const { error: rsvpErr } = await supabase
        .from('service_declarations')
        .upsert({
          service_id: serviceId,
          member_id: member.id,
          status: 'present',
          updated_at: new Date().toISOString()
        }, { onConflict: 'service_id,member_id' })

      if (rsvpErr) {
        throw new Error("Erreur DB")
      } else {
        toast.success(`${member.first_name} pointé(e) présent(e) !`)
        const audio = new Audio('/success.mp3')
        audio.play().catch(e => {}) 
      }
    } catch (err) {
      // MODE HORS-LIGNE
      if (!window.navigator.onLine || err) {
        // Enregistrer dans localStorage
        const newQueue = [...offlineQueue, decodedText]
        setOfflineQueue(newQueue)
        localStorage.setItem('offline_scans_' + serviceId, JSON.stringify(newQueue))
        
        toast.success(`Mode hors-ligne: Présence sauvegardée localement.`)
        const audio = new Audio('/success.mp3')
        audio.play().catch(e => {}) 
      } else {
        toast.error("Erreur d'enregistrement.")
      }
    } finally {
      setIsLoading(false)
      setTimeout(resetScanner, 3000)
    }
  }

  async function syncOfflineScans() {
    if (offlineQueue.length === 0) return
    if (!window.navigator.onLine) {
      toast.error("Veuillez vous connecter à Internet pour synchroniser.")
      return
    }

    const id = toast.loading(`Synchronisation de ${offlineQueue.length} pointage(s)...`)
    
    let successCount = 0
    for (const memberId of offlineQueue) {
      const { error } = await supabase
        .from('service_declarations')
        .upsert({
          service_id: serviceId,
          member_id: memberId,
          status: 'present',
          updated_at: new Date().toISOString()
        }, { onConflict: 'service_id,member_id' })
        
      if (!error) successCount++
    }

    setOfflineQueue([])
    localStorage.removeItem('offline_scans_' + serviceId)
    toast.success(`${successCount} pointage(s) synchronisé(s) !`, { id })
  }

  function onScanFailure(error: any) {
    // Ignore scan failures (happens constantly as it scans empty space)
    // But catch permission errors
    if (typeof error === 'string' && error.toLowerCase().includes('permission')) {
      setCameraError("L'accès à la caméra a été refusé. Veuillez l'autoriser dans les paramètres de votre navigateur.")
    }
  }

  function resetScanner() {
    setScannedResult(null)
    setMemberInfo(null)
    if (scannerRef.current) {
      scannerRef.current.resume()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-xl border border-primary-200 dark:border-primary-900/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <p className="text-xs text-primary-600 dark:text-primary-400 font-bold uppercase tracking-wider mb-1">Culte Actif</p>
          <p className="font-bold text-gray-900 dark:text-white">{serviceName}</p>
        </div>
        <div className="flex items-center gap-4">
          {offlineQueue.length > 0 && (
            <button 
              onClick={syncOfflineScans}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg shadow-sm animate-pulse"
            >
              🔄 Synchroniser ({offlineQueue.length})
            </button>
          )}
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.7)]"></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden relative">
        {cameraError && (
          <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 z-10 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Caméra bloquée</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm max-w-sm">{cameraError}</p>
            <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-primary-900 text-white rounded-lg text-sm font-bold">Réessayer</button>
          </div>
        )}
        {/* The div where html5-qrcode injects the video stream */}
        <div id="qr-reader" className="w-full border-none"></div>
      </div>

      {/* Result overlay */}
      {memberInfo && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-11/12 max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 border-2 border-green-500 animate-in slide-in-from-bottom-10 flex items-center gap-4 z-50">
          {memberInfo.photo_url ? (
            <img src={memberInfo.photo_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-green-200" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xl border-2 border-green-200">
              {memberInfo.first_name[0]}
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Présence Validée
            </p>
            <p className="font-bold text-xl text-gray-900 dark:text-white mt-1 leading-tight">
              {memberInfo.first_name} {memberInfo.last_name}
            </p>
          </div>
        </div>
      )}

      {/* Global CSS override for the ugly html5-qrcode default UI */}
      <style dangerouslySetInnerHTML={{__html: `
        #qr-reader { border: none !important; border-radius: 1rem; overflow: hidden; }
        #qr-reader__scan_region { background-color: #000; }
        #qr-reader__dashboard_section_csr button { 
          background: #1e3a8a; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; margin: 10px; cursor: pointer;
        }
        #qr-reader__dashboard_section_csr span { color: inherit; }
        #qr-reader__dashboard_section_swaplink { display: none; }
      `}} />
    </div>
  )
}
