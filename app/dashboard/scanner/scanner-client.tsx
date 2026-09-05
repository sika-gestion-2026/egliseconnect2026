'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import { searchMembersAction } from '@/app/actions/searchMembers'

export default function ScannerClient({ serviceId, serviceName }: { serviceId: string, serviceName: string }) {
  const [scannedResult, setScannedResult] = useState<string | null>(null)
  const [memberInfo, setMemberInfo] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [offlineQueue, setOfflineQueue] = useState<string[]>([])
  
  const [history, setHistory] = useState<any[]>([])
  const [totalPresent, setTotalPresent] = useState(0)
  
  // Manual Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const supabase = createClient()

  // Load initial stats and history
  const loadStats = useCallback(async () => {
    try {
      const { data: declarations, count } = await supabase
        .from('service_declarations')
        .select('*, members(id, first_name, last_name, photo_url)', { count: 'exact' })
        .eq('service_id', serviceId)
        .order('updated_at', { ascending: false })

      if (count !== null) setTotalPresent(count)
      if (declarations) {
        setHistory(declarations.map(d => ({
          ...d.members,
          scannedAt: new Date(d.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        })).slice(0, 10)) // Keep last 10
      }
    } catch (e) {
      console.error(e)
    }
  }, [serviceId, supabase])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    const saved = localStorage.getItem('offline_scans_' + serviceId)
    if (saved) {
      setOfflineQueue(JSON.parse(saved))
    }
    
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

  // Handle Manual Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearching(true)
        const res = await searchMembersAction(searchQuery)
        if (res.success) {
          setSearchResults(res.data || [])
        }
        setIsSearching(false)
      } else {
        setSearchResults([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  async function processMemberScan(memberId: string) {
    if (isLoading) return
    setIsLoading(true)
    
    if (scannerRef.current) {
      scannerRef.current.pause(true)
    }

    try {
      const { data: member, error: memberErr } = await supabase
        .from('members')
        .select('id, first_name, last_name, photo_url')
        .eq('id', memberId)
        .single()

      if (memberErr || !member) {
        toast.error("Membre introuvable.")
        resetScanner()
        return
      }

      setMemberInfo(member)

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
        
        // Update local state immediately
        setTotalPresent(prev => prev + 1)
        setHistory(prev => [{
          ...member,
          scannedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }, ...prev].slice(0, 10))
        
        setSearchQuery('')
      }
    } catch (err) {
      if (!window.navigator.onLine || err) {
        const newQueue = [...offlineQueue, memberId]
        setOfflineQueue(newQueue)
        localStorage.setItem('offline_scans_' + serviceId, JSON.stringify(newQueue))
        toast.success(`Sauvegardé localement.`)
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

  async function onScanSuccess(decodedText: string, decodedResult: any) {
    if (scannedResult === decodedText) return
    setScannedResult(decodedText)
    await processMemberScan(decodedText)
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
    loadStats() // Refresh stats
  }

  function onScanFailure(error: any) {
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
    <div className="flex flex-col xl:flex-row gap-8 pb-10">
      
      {/* Left Column: Scanner and Stats */}
      <div className="flex-1 space-y-6">
        
        {/* Top Info Bar */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 p-6 rounded-3xl shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-primary-500/30">
              📲
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Culte Actif</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{serviceName}</h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Total Présents</p>
            <h3 className="text-3xl font-black text-green-500">{totalPresent}</h3>
          </div>
        </div>

        {offlineQueue.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-2xl flex items-center justify-between animate-pulse">
            <p className="text-amber-700 dark:text-amber-400 font-bold text-sm">⚠️ {offlineQueue.length} pointage(s) en attente de réseau.</p>
            <button 
              onClick={syncOfflineScans}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-md transition-all"
            >
              Synchroniser
            </button>
          </div>
        )}

        {/* Scanner Container */}
        <div className="bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl relative overflow-hidden group border-4 border-slate-800">
          {/* Decorative Corner Borders */}
          <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-primary-500 rounded-tl-xl z-20 opacity-50"></div>
          <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-primary-500 rounded-tr-xl z-20 opacity-50"></div>
          <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-primary-500 rounded-bl-xl z-20 opacity-50"></div>
          <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-primary-500 rounded-br-xl z-20 opacity-50"></div>

          {/* Scanning Animation Line */}
          {!memberInfo && !isLoading && !cameraError && (
            <div className="absolute top-0 left-0 w-full h-1 bg-primary-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] z-20 animate-[scan_3s_ease-in-out_infinite]"></div>
          )}

          {cameraError && (
            <div className="absolute inset-0 bg-slate-900/95 z-30 flex flex-col items-center justify-center p-6 text-center rounded-[2rem]">
              <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Caméra Inaccessible</h3>
              <p className="text-slate-400 font-medium mb-8 max-w-sm">{cameraError}</p>
              <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-slate-900 rounded-xl font-black hover:bg-slate-200 transition-colors">Réessayer</button>
            </div>
          )}

          {/* Member Info Overlay (Success) */}
          {memberInfo && (
            <div className="absolute inset-0 bg-green-500/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center rounded-[2rem] animate-in zoom-in-95 duration-300">
              <div className="w-32 h-32 mb-6 relative">
                <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-30"></div>
                {memberInfo.photo_url ? (
                  <img src={memberInfo.photo_url} alt="" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-2xl relative z-10" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center text-green-600 font-black text-5xl border-4 border-green-200 shadow-2xl relative z-10">
                    {memberInfo.first_name[0]}{memberInfo.last_name[0]}
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center z-20 shadow-lg text-green-500">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
              </div>
              <h2 className="text-3xl font-black text-white mb-1 drop-shadow-md">
                {memberInfo.first_name} {memberInfo.last_name}
              </h2>
              <p className="text-green-100 font-bold uppercase tracking-widest text-sm">Présence Validée</p>
            </div>
          )}

          <div id="qr-reader" className="w-full h-full min-h-[400px] rounded-[2rem] overflow-hidden bg-black flex items-center justify-center"></div>
        </div>
      </div>

      {/* Right Column: Search & History */}
      <div className="xl:w-[400px] flex flex-col gap-6">
        
        {/* Manual Search */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 p-6 rounded-3xl shadow-xl relative z-40">
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span>⌨️</span> Recherche Manuelle
          </h3>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Nom du membre..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium dark:text-white transition-all shadow-inner"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            {isSearching && (
              <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-500 animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl p-2 max-h-64 overflow-y-auto custom-scrollbar">
              {searchResults.map(member => (
                <button
                  key={member.id}
                  onClick={() => processMemberScan(member.id)}
                  disabled={isLoading}
                  className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors flex items-center gap-3 disabled:opacity-50"
                >
                  {member.photo_url ? (
                    <img src={member.photo_url} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-600" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
                      {member.first_name[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{member.first_name} {member.last_name}</p>
                    <p className="text-[10px] font-bold text-slate-400">{member.quartier || 'Inconnu'}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* History List */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-xl flex-1 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>🕒</span> Derniers Scans
            </h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 opacity-50">
                <span className="text-4xl mb-3">📭</span>
                <p className="font-bold text-sm text-slate-500">Aucun pointage récent</p>
              </div>
            ) : (
              history.map((h, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 animate-in slide-in-from-right-4 fade-in">
                  <div className="relative">
                    {h.photo_url ? (
                      <img src={h.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-white dark:border-slate-700" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center font-black text-green-600 text-sm">
                        {h.first_name[0]}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{h.first_name} {h.last_name}</p>
                    <p className="text-xs font-bold text-slate-400">{h.scannedAt}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(400px); opacity: 0; }
        }
        #qr-reader { border: none !important; }
        #qr-reader__scan_region { background-color: transparent !important; }
        #qr-reader__scan_region img { display: none !important; }
        #qr-reader__dashboard_section_csr button { 
          background: white; color: #0f172a; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 900; margin: 10px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        #qr-reader__dashboard_section_csr span { color: white !important; font-weight: bold; }
        #qr-reader__dashboard_section_swaplink { display: none; }
        #qr-reader video { border-radius: 2rem !important; object-fit: cover !important; }
      `}} />
    </div>
  )
}

