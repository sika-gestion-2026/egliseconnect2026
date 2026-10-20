'use client'

import React, { useRef, useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import toast from 'react-hot-toast'

export interface ChurchCardTheme {
  primaryGradient: string
  accentColor: string
  accentGradient: string
  goldPill: string
  ringColor: string
  borderGlow: string
  chipBg: string
  chipText: string
}

export interface MemberCardData {
  id: string
  first_name: string
  last_name: string
  phone?: string | null
  email?: string | null
  photo_url?: string | null
  status?: string | null
  role_title?: string | null
  commune?: string | null
  quartier?: string | null
  created_at?: string | null
  church: {
    id?: string
    name: string
    code?: string
    logo_url?: string | null
    city?: string | null
    commune?: string | null
    quartier?: string | null
    leader_name?: string | null
    leader_contact?: string | null
    leader_title?: string | null
    theme_color?: string | null
  }
}

/**
 * Convertit RGB en Hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toH = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toH(r)}${toH(g)}${toH(b)}`
}

/**
 * Assombrit ou éclaircit une couleur Hex
 */
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  let r = (num >> 16) + Math.round(255 * (percent / 100))
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100))
  let b = (num & 0x0000ff) + Math.round(255 * (percent / 100))

  r = Math.min(255, Math.max(0, r))
  g = Math.min(255, Math.max(0, g))
  b = Math.min(255, Math.max(0, b))

  return rgbToHex(r, g, b)
}

/**
 * Dérive un thème complet ultra-esthétique à partir d'une couleur d'accentuation (ou dominante de logo)
 */
export function buildThemeFromColor(accentHex: string): ChurchCardTheme {
  // Teinte de fond sombre impériale dérivée de la couleur du logo
  const darkBase = adjustBrightness(accentHex, -82)
  const darkMid = adjustBrightness(accentHex, -70)
  const darkEnd = adjustBrightness(accentHex, -55)
  const brighterAccent = adjustBrightness(accentHex, 20)

  return {
    primaryGradient: `linear-gradient(180deg, ${darkBase} 0%, ${darkMid} 50%, ${darkEnd} 100%)`,
    accentColor: accentHex,
    accentGradient: `linear-gradient(135deg, ${brighterAccent} 0%, ${accentHex} 60%, ${adjustBrightness(accentHex, -25)} 100%)`,
    goldPill: `linear-gradient(135deg, ${accentHex}, ${adjustBrightness(accentHex, -30)})`,
    ringColor: `${accentHex}66`,
    borderGlow: `0 20px 45px -10px ${darkBase}cc, 0 0 0 1px ${accentHex}55`,
    chipBg: `${accentHex}26`,
    chipText: brighterAccent,
  }
}

/**
 * Palettes harmonieuses de secours par défaut si aucun logo n'a été fourni
 */
const PRESET_ACCENTS = [
  '#f59e0b', // Or Céleste
  '#06b6d4', // Cyan Sanctuaire
  '#8b5cf6', // Violet Royal
  '#10b981', // Émeraude Grâce
  '#ec4899', // Rose Majesté
  '#3b82f6', // Bleu Saphir
  '#e11d48', // Rubis Glorieux
]

/**
 * Extrait la couleur dominante d'un logo d'église via un Canvas HTML5
 */
export async function extractDominantColor(imgSrc: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = imgSrc.startsWith('http') ? `/api/image-proxy?url=${encodeURIComponent(imgSrc)}` : imgSrc
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve(null)
          
          canvas.width = 40
          canvas.height = 40
          ctx.drawImage(img, 0, 0, 40, 40)
          
          const imageData = ctx.getImageData(0, 0, 40, 40).data
          let rTotal = 0, gTotal = 0, bTotal = 0, validPixels = 0

          // Analyse les pixels non-transparents et évite le blanc/noir pur pour capter la vraie teinte
          for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i]
            const g = imageData[i + 1]
            const b = imageData[i + 2]
            const a = imageData[i + 3]

            if (a > 150) {
              const maxC = Math.max(r, g, b)
              const minC = Math.min(r, g, b)
              const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC

              // Privilégier les pixels colorés (évite l'arrière-plan blanc ou transparent)
              if (saturation > 0.18 && maxC > 40 && minC < 240) {
                rTotal += r
                gTotal += g
                bTotal += b
                validPixels++
              }
            }
          }

          if (validPixels > 5) {
            const r = Math.round(rTotal / validPixels)
            const g = Math.round(gTotal / validPixels)
            const b = Math.round(bTotal / validPixels)
            return resolve(rgbToHex(r, g, b))
          }
          resolve(null)
        } catch {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

/**
 * Calcule le thème exclusif d'une église :
 * Basé sur le code/nom de l'église, tout en s'adaptant à la couleur du logo dès qu'elle est connue
 */
export function getFallbackChurchTheme(churchSeed: string): ChurchCardTheme {
  let hash = 0
  for (let i = 0; i < churchSeed.length; i++) {
    hash = (hash << 5) - hash + churchSeed.charCodeAt(i)
    hash |= 0
  }
  const colorIndex = Math.abs(hash) % PRESET_ACCENTS.length
  return buildThemeFromColor(PRESET_ACCENTS[colorIndex])
}

/**
 * Proxy Base64 pour sécuriser l'export canvas sans tainting
 */
async function toDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  if (url.startsWith('data:')) return url
  try {
    const target = url.startsWith('http') ? `/api/image-proxy?url=${encodeURIComponent(url)}` : url
    const res = await fetch(target)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn("Échec conversion data URL image", e)
    return null
  }
}

export default function MemberIDCard({
  member,
  compact = false,
  showActions = true,
}: {
  member: MemberCardData
  compact?: boolean
  showActions?: boolean
}) {
  const [side, setSide] = useState<'recto' | 'verso'>('recto')
  const [isExporting, setIsExporting] = useState(false)
  const rectoRef = useRef<HTMLDivElement>(null)
  const versoRef = useRef<HTMLDivElement>(null)

  const churchSeed = member.church.name || member.church.code || 'eglise-connect'
  const fallbackTheme = member.church.theme_color
    ? buildThemeFromColor(member.church.theme_color)
    : getFallbackChurchTheme(churchSeed)
  const [theme, setTheme] = useState<ChurchCardTheme>(fallbackTheme)

  // Extraction automatique de la couleur dominante du logo ou prise en compte de la couleur personnalisée
  useEffect(() => {
    let isMounted = true

    // 1. Si une couleur de thème a été explicitement choisie dans les paramètres de l'église, elle prime
    if (member.church.theme_color) {
      setTheme(buildThemeFromColor(member.church.theme_color))
      return
    }

    // 2. Sinon, extraction automatique de la couleur dominante du logo officiel
    if (member.church.logo_url) {
      extractDominantColor(member.church.logo_url).then((dominantHex) => {
        if (isMounted && dominantHex) {
          setTheme(buildThemeFromColor(dominantHex))
        }
      })
    } else {
      setTheme(fallbackTheme)
    }
    return () => {
      isMounted = false
    }
  }, [member.church.logo_url, member.church.theme_color, churchSeed])

  const memberCode = member.id
    ? (member.church.code ? `${member.church.code}-` : '') + member.id.split('-')[0].toUpperCase()
    : '000000'

  const firstName = (member.first_name || '').trim()
  const lastName = (member.last_name || '').trim().toUpperCase()
  const fullDisplayName = `${firstName} ${lastName}`.trim()
  const displayRole = member.role_title || (member.status === 'member' ? 'Membre Actif' : 'Fidèle')
  const pastorTitle = member.church.leader_title || 'Pasteur Principal'
  const pastorName = member.church.leader_name || 'Direction Pastorale'

  const churchLocation = [
    member.church.quartier,
    member.church.commune,
    member.church.city,
  ].filter(Boolean).join(' • ') || 'Siège de la communauté'

  const churchContact = member.church.leader_contact

  /**
   * Capture haute fidélité pour impression Carte de Membre (Format Paysage Universel 85.6 × 54 mm)
   * Utilise html-to-image avec gestion sécurisée des images sans bloquer.
   */
  const captureSideDataUrl = async (sideToCapture: 'recto' | 'verso'): Promise<string> => {
    const originalSide = side
    setSide(sideToCapture)
    await new Promise((resolve) => setTimeout(resolve, 150))

    const targetEl = sideToCapture === 'recto' ? rectoRef.current : versoRef.current
    if (!targetEl) throw new Error(`Face ${sideToCapture} introuvable`)

    try {
      const dataUrl = await toPng(targetEl, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#07152b',
        cacheBust: true,
      })

      return dataUrl
    } finally {
      setSide(originalSide)
    }
  }

  /**
   * Génération du PDF d'impression Universel (Format Carte de Crédit / PVC ISO 7810 ID-1 : 85.6 × 54 mm Paysage)
   */
  const generateBadgePDF = async (): Promise<Blob> => {
    if (!rectoRef.current || !versoRef.current) {
      throw new Error('Éléments de carte introuvables')
    }

    // Capture séquentielle des deux faces
    const rectoDataUrl = await captureSideDataUrl('recto')
    const versoDataUrl = await captureSideDataUrl('verso')

    if (!rectoDataUrl || !versoDataUrl) {
      throw new Error('Échec de la capture des faces')
    }

    // Format universel carte bancaire / PVC standard ID-1 : 85.6 mm × 53.98 mm Paysage
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 54],
    })

    // Page 1 : RECTO (Face Officielle)
    doc.addImage(rectoDataUrl, 'PNG', 0, 0, 85.6, 54, undefined, 'FAST')

    // Page 2 : VERSO (Coordonnées & Informations)
    doc.addPage([85.6, 54], 'landscape')
    doc.addImage(versoDataUrl, 'PNG', 0, 0, 85.6, 54, undefined, 'FAST')

    return doc.output('blob')
  }

  // Téléchargement sécurisé et direct du PDF
  const handleDownload = async () => {
    try {
      setIsExporting(true)
      const toastId = toast.loading("Génération du PDF d'impression universel...")

      const pdfBlob = await generateBadgePDF()
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Carte_Membre_${firstName}_${lastName}.pdf`.replace(/\s+/g, '_')
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 250)

      toast.success('Carte PDF prête (Format Standard 85.6 × 54 mm) !', { id: toastId })
    } catch (err: any) {
      console.error('Erreur téléchargement PDF:', err)
      toast.error('Erreur lors de la création du PDF : ' + (err?.message || 'Inconnue'))
    } finally {
      setIsExporting(false)
    }
  }

  // Partager le Badge Officiel en PDF (Recto + Verso)
  const handleShare = async () => {
    try {
      setIsExporting(true)
      const toastId = toast.loading('Génération du Badge PDF pour partage...')

      const pdfBlob = await generateBadgePDF()
      const fileName = `Badge_${firstName}_${lastName}.pdf`.replace(/\s+/g, '_')
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Badge Officiel PDF - ${fullDisplayName}`,
          text: `Badge officiel (Recto/Verso) de ${fullDisplayName} - ${member.church.name}`,
        })
        toast.success('Badge PDF partagé avec succès !', { id: toastId })
      } else if (navigator.share) {
        // Fallback si partage de fichiers PDF non supporté par l'OS/navigateur
        await navigator.share({
          title: `Badge Officiel - ${fullDisplayName}`,
          text: `Badge de membre : ${fullDisplayName} - ${member.church.name} (Code: ${memberCode})`,
        })
        toast.success('Lien partagé !', { id: toastId })
      } else {
        // Déclenchement automatique du téléchargement si pas de Web Share API
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Partage non supporté : PDF téléchargé automatiquement !', { id: toastId })
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err)
        toast.error('Partage non disponible.')
      }
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-xl">
      {/* Contrôles supérieurs */}
      {showActions && (
        <div className="flex flex-col w-full gap-2.5 mb-3 px-1">
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            {/* Bascule Recto / Verso */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => setSide('recto')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                  side === 'recto'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Recto (Face)
              </button>
              <button
                type="button"
                onClick={() => setSide('verso')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                  side === 'verso'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Verso (Infos)
              </button>
            </div>

            {/* Actions Télécharger / Partager */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                disabled={isExporting}
                title="Partager le Badge PDF (Recto & Verso)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                Partager PDF
              </button>
              <button
                onClick={handleDownload}
                disabled={isExporting}
                title="Télécharger la carte de membre en PDF standard d'impression (85.6 × 54 mm)"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-black rounded-lg bg-primary-900 hover:bg-primary-800 text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="12" y2="18"></line>
                  <line x1="15" y1="15" x2="12" y2="18"></line>
                </svg>
                {isExporting ? 'Génération...' : 'Télécharger PDF (Impression)'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Format Standard Universel d&apos;Impression ISO CR80 (85.6 × 54 mm)
            </span>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              ✦ Haute Définition
            </span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CADRE CARTE DE MEMBRE STANDARD UNIVERSEL (85.6 × 54 mm)  */}
      {/* ========================================================= */}
      <div className="w-full max-w-[530px] relative select-none">
        
        {/* --------------------------------------------------------- */}
        {/* FACE RECTO PAYSAGE UNIVERSELLE                            */}
        {/* --------------------------------------------------------- */}
        <div
          ref={rectoRef}
          id={`member-pvc-recto-${member.id}`}
          className="w-full rounded-[14px] overflow-hidden relative shadow-2xl flex flex-col justify-between"
          style={{
            aspectRatio: '85.6 / 54',
            background: theme.primaryGradient,
            boxShadow: theme.borderGlow,
            display: side === 'recto' ? 'flex' : 'none',
            padding: '12px 14px 8px 14px',
          }}
        >
          {/* REFLET VERNIS BRILLANT PVC */}
          <div
            className="absolute inset-0 pointer-events-none z-30"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 40%, transparent 60%, rgba(255,255,255,0.06) 90%, transparent 100%)',
            }}
          />

          {/* Halo d'ambiance premium */}
          <div
            className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none"
            style={{ backgroundColor: theme.accentColor, opacity: 0.16 }}
          />

          {/* 1. EN-TÊTE : Logo + Nom Église + Badge Département */}
          <div className="relative z-10 flex items-center justify-between gap-2 border-b border-white/20 pb-1.5 shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-white shadow-sm overflow-hidden ring-1 ring-white/90 flex items-center justify-center p-0.5 shrink-0">
                {member.church.logo_url ? (
                  <img
                    src={member.church.logo_url}
                    alt="Logo"
                    className="w-full h-full object-cover rounded-full"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <span className="font-serif font-black text-slate-800 text-xs">
                    {member.church.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black font-serif text-white tracking-wide text-[11px] leading-tight uppercase drop-shadow-sm truncate">
                  {member.church.name}
                </h3>
                <span className="text-[7.5px] font-mono tracking-wider text-white/75 uppercase block mt-0.5">
                  CARTE OFFICIELLE DE MEMBRE
                </span>
              </div>
            </div>

            {/* Département / Rôle Principal */}
            <div 
              className="px-2 py-0.5 rounded-full border shadow-sm backdrop-blur-md shrink-0 max-w-[150px]"
              style={{ 
                backgroundColor: theme.chipBg, 
                borderColor: `${theme.accentColor}55` 
              }}
            >
              <p 
                title={displayRole}
                className="font-extrabold uppercase tracking-wider text-[8px] leading-tight drop-shadow-sm truncate text-center"
                style={{ color: theme.chipText }}
              >
                {displayRole}
              </p>
            </div>
          </div>

          {/* 2. CORPS : Photo (gauche) + Informations (centre) + QR Code (droite) */}
          <div className="relative z-10 flex items-center justify-between gap-2.5 my-auto shrink-0">
            
            {/* Photo Membre */}
            <div className="relative shrink-0">
              <div
                className="w-[68px] h-[80px] rounded-lg p-0.5 shadow-md relative overflow-hidden"
                style={{ background: theme.accentGradient }}
              >
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={fullDisplayName}
                    className="w-full h-full rounded-[6px] object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full rounded-[6px] bg-slate-900 flex items-center justify-center text-white font-bold text-lg font-serif">
                    {firstName[0]}
                    {lastName[0]}
                  </div>
                )}
              </div>
              {/* Badge Coche */}
              <div
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-black shadow border border-white"
                style={{ backgroundColor: theme.accentColor }}
              >
                ✓
              </div>
            </div>

            {/* Informations Membre au Centre */}
            <div className="flex-1 min-w-0 px-0.5 flex flex-col justify-center">
              <span 
                className="text-[10px] font-extrabold uppercase tracking-wide drop-shadow-sm leading-tight truncate"
                style={{ color: theme.chipText }}
              >
                {firstName}
              </span>
              <span className="text-[13px] font-black text-white uppercase tracking-tight drop-shadow-sm leading-tight truncate">
                {lastName}
              </span>

              <div className="mt-1.5 space-y-0.5">
                {member.phone && (
                  <p className="text-[9px] font-bold text-white/95 flex items-center gap-1 leading-tight truncate">
                    <span className="text-[8.5px] shrink-0">📞</span>
                    <span className="font-mono">{member.phone}</span>
                  </p>
                )}

                {(member.quartier || member.commune) && (
                  <p className="text-[8.5px] font-medium text-white/85 flex items-center gap-1 leading-tight truncate">
                    <span className="text-[8px] shrink-0">📍</span>
                    <span className="truncate">{[member.quartier, member.commune].filter(Boolean).join(', ')}</span>
                  </p>
                )}
              </div>
            </div>

            {/* QR Code à Droite */}
            <div className="flex flex-col items-center shrink-0 pl-1">
              <div className="p-1 bg-white rounded-md shadow border border-white/90">
                <QRCodeSVG
                  value={member.id}
                  size={50}
                  level="M"
                  includeMargin={false}
                  fgColor="#07152b"
                  bgColor="#ffffff"
                />
              </div>
              <span className="text-[7px] font-mono font-bold text-white/75 uppercase tracking-wider mt-0.5">
                POINTAGE
              </span>
            </div>
          </div>

          {/* 3. PIED DE CARTE DU RECTO : Code Membre centré */}
          <div className="relative z-10 flex items-center justify-center border-t border-white/20 pt-1 shrink-0 text-[8px] text-white/90">
            <span className="font-mono font-bold tracking-wider text-center">
              ID MEMBRE : {memberCode}
            </span>
          </div>

        </div>

        {/* --------------------------------------------------------- */}
        {/* FACE VERSO PAYSAGE UNIVERSELLE                            */}
        {/* --------------------------------------------------------- */}
        <div
          ref={versoRef}
          id={`member-pvc-verso-${member.id}`}
          className="w-full rounded-[14px] overflow-hidden relative shadow-2xl flex flex-col justify-between"
          style={{
            aspectRatio: '85.6 / 54',
            background: theme.primaryGradient,
            boxShadow: theme.borderGlow,
            display: side === 'verso' ? 'flex' : 'none',
            padding: '8px 14px 8px 14px',
          }}
        >
          {/* REFLET BRILLANT VERSO */}
          <div
            className="absolute inset-0 pointer-events-none z-30"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 40%, rgba(255,255,255,0.06) 80%, transparent 100%)',
            }}
          />

          {/* BANDE MAGNÉTIQUE PVC PAYSAGE */}
          <div className="w-full h-5 bg-black/75 rounded border-y border-white/10 relative z-10 flex items-center justify-between px-3 backdrop-blur-sm shrink-0">
            <span 
              className="text-[7.5px] font-mono tracking-widest font-extrabold uppercase"
              style={{ color: theme.chipText }}
            >
              CARTE OFFICIELLE DE MEMBRE
            </span>
            <span className="text-[7.5px] font-mono text-white/70">
              CODE : {memberCode}
            </span>
          </div>

          {/* LOGO EN FILIGRANE */}
          {member.church.logo_url && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden"
              style={{ opacity: 0.10 }}
            >
              <div className="w-36 h-36 rounded-full overflow-hidden flex items-center justify-center filter blur-[1px]">
                <img
                  src={member.church.logo_url}
                  alt="Filigrane verso"
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>
            </div>
          )}

          {/* CONTENU VERSO PAYSAGE AÉRÉ */}
          <div className="relative z-10 flex flex-col justify-between h-full pt-1.5 space-y-1 text-white">
            
            {/* Grille 2 colonnes : Église (gauche) & Coordonnées (droite) */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {/* Colonne Gauche : Église & Code */}
              <div className="border-r border-white/15 pr-1.5 space-y-0.5 min-w-0">
                <p className="text-[7px] uppercase tracking-wider text-white/60 font-bold">Communauté Chrétienne</p>
                <p className="text-[10px] font-black font-serif text-white leading-tight truncate">{member.church.name}</p>
                {member.church.code && (
                  <span 
                    className="inline-block text-[7.5px] font-mono font-bold px-1.5 py-0.5 rounded border mt-0.5"
                    style={{ 
                      backgroundColor: theme.chipBg, 
                      color: theme.chipText,
                      borderColor: `${theme.accentColor}55`
                    }}
                  >
                    CODE : {member.church.code}
                  </span>
                )}
              </div>

              {/* Colonne Droite : Direction Pastorale & Contact */}
              <div className="space-y-0.5 min-w-0 pl-1">
                <div>
                  <p 
                    className="text-[7px] font-black uppercase tracking-wider"
                    style={{ color: theme.chipText }}
                  >
                    {pastorTitle}
                  </p>
                  <p className="text-[9.5px] font-black text-white leading-tight truncate">{pastorName}</p>
                </div>

                <div className="pt-0.5 space-y-0.5">
                  {churchContact && (
                    <p className="text-[8.5px] font-bold text-white/95 font-mono flex items-center gap-1 leading-tight truncate">
                      <span>📞</span>
                      <span>{churchContact}</span>
                    </p>
                  )}
                  {churchLocation && (
                    <p className="text-[8px] font-medium text-white/85 flex items-center gap-1 leading-tight truncate">
                      <span>📍</span>
                      <span className="truncate">{churchLocation}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Note d'usage légale : En cas de perte */}
            <div 
              className="p-1 rounded-md border text-center"
              style={{
                backgroundColor: theme.chipBg,
                borderColor: `${theme.accentColor}33`,
              }}
            >
              <p className="text-[7px] text-white/90 leading-tight">
                ⚠️ <strong className="font-bold">En cas de perte :</strong> Merci de rapporter cette carte à l&apos;adresse de l&apos;église ou de contacter l&apos;accueil.
              </p>
            </div>

            {/* Code barre & Mentions bien centrées, sans Église Connect */}
            <div className="flex flex-col items-center justify-center border-t border-white/15 pt-0.5 space-y-0.5 text-center">
              <div className="flex items-center justify-center gap-1 opacity-70">
                <span className="w-0.5 h-2 bg-white"></span>
                <span className="w-1 h-2 bg-white"></span>
                <span className="w-0.5 h-2 bg-white"></span>
                <span className="w-1.5 h-2 bg-white"></span>
                <span className="w-0.5 h-2 bg-white"></span>
                <span className="w-1 h-2 bg-white"></span>
                <span className="w-0.5 h-2 bg-white"></span>
                <span className="w-1.5 h-2 bg-white"></span>
              </div>

              <p 
                className="text-[7px] font-mono tracking-wider uppercase font-semibold text-center"
                style={{ color: theme.chipText }}
              >
                Projet Copyright Munokolive
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
