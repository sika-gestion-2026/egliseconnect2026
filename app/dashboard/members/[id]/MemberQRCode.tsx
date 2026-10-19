'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useRef } from 'react'

export default function MemberQRCode({ memberId, memberName }: { memberId: string, memberName: string }) {
  const qrRef = useRef<SVGSVGElement>(null)

  const handlePrint = () => {
    const svg = qrRef.current
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()
    
    img.onload = () => {
      canvas.width = img.width + 40
      canvas.height = img.height + 80
      
      if (ctx) {
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 20, 20)
        
        ctx.fillStyle = "black"
        ctx.font = "bold 16px Arial"
        ctx.textAlign = "center"
        ctx.fillText(memberName, canvas.width / 2, canvas.height - 20)
      }

      const a = document.createElement("a")
      a.download = `carte_membre_${memberName.replace(/\s+/g, '_')}.png`
      a.href = canvas.toDataURL("image/png")
      a.click()
    }

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 flex flex-col items-center justify-center space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 border-b pb-2 dark:border-slate-700 w-full text-center">
        Carte de Membre (QR Code)
      </h3>
      <div className="p-3 bg-white rounded-xl shadow-inner border border-gray-100">
        <QRCodeSVG 
          id="member-qr"
          value={memberId} 
          size={160}
          level="M"
          includeMargin={false}
          ref={qrRef}
        />
      </div>
      <p className="text-xs text-gray-500 text-center max-w-[200px]">
        À présenter à l'accueil pour les pointages rapides.
      </p>
      <button 
        onClick={handlePrint}
        className="text-xs bg-primary-100 text-primary-900 hover:bg-primary-200 dark:bg-slate-700 dark:text-white px-4 py-2 rounded-lg font-bold transition-colors"
      >
        Télécharger le badge
      </button>
    </div>
  )
}
