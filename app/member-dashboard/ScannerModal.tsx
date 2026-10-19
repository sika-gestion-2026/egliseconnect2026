'use client'

import { useEffect, useState, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { processCheckinScan } from '@/app/actions/checkin'
import toast from 'react-hot-toast'

export default function ScannerModal({ onClose }: { onClose: () => void }) {
  const [scanning, setScanning] = useState(true)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    // Only init if we are scanning
    if (scanning) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      
      scannerRef.current = scanner;

      scanner.render(
        async (decodedText) => {
          // Success
          setScanning(false)
          scanner.clear()
          
          const loadingToast = toast.loading("Validation de la présence...")
          
          const res = await processCheckinScan(decodedText)
          if (res.success) {
            toast.success("Présence validée ! Bienvenue au culte 🎉", { id: loadingToast })
            // Play a success sound if possible
            try {
              const audio = new Audio('/success-beep.mp3') // Optional, if they have an audio file
              audio.play().catch(() => {})
            } catch (e) {}
            setTimeout(() => onClose(), 2000)
          } else {
            toast.error(res.error || "Erreur", { id: loadingToast })
            // Allow scanning again after 3 seconds
            setTimeout(() => setScanning(true), 3000)
          }
        },
        (error) => {
          // Ignore normal scan failures (happens every frame)
        }
      );

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [scanning, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden relative">
        <button 
          onClick={() => {
            if (scannerRef.current) scannerRef.current.clear().catch(() => {})
            onClose()
          }}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
        >
          ✕
        </button>
        
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold mb-2 dark:text-white">Scanner à l'entrée</h2>
          <p className="text-sm text-gray-500 mb-6">Pointez votre caméra vers le QR Code affiché à l'entrée de l'église.</p>
          
          {scanning ? (
            <div className="rounded-xl overflow-hidden shadow-inner bg-black">
              <div id="reader" className="w-full"></div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-500 mb-4 animate-bounce">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <p className="font-bold text-lg text-green-600">Scan Réussi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
