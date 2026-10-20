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
   * Capture haute fidélité pour impression Badge Tour de Cou PVC (Format Vertical 54 × 86 mm)
   * Utilise html-to-image avec prise en compte propre des conteneurs cachés.
   */
  const captureSideDataUrl = async (sideToCapture: 'recto' | 'verso'): Promise<string> => {
    const originalSide = side
    // On force l'affichage de la face dans le DOM actuel afin que toutes les dimensions et polices soient calculées
    setSide(sideToCapture)
    // On attend un frame de rendu pour que le navigateur peigne la face
    await new Promise((resolve) => setTimeout(resolve, 80))

    const targetEl = sideToCapture === 'recto' ? rectoRef.current : versoRef.current
    if (!targetEl) throw new Error(`Face ${sideToCapture} introuvable`)

    try {
      // Préchargement en Base64 de toutes les images pour éviter les erreurs CORS
      const images = targetEl.querySelectorAll('img')
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        const src = img.getAttribute('src')
        if (src && !src.startsWith('data:')) {
          const dataUrl = await toDataUrl(src)
          if (dataUrl) img.src = dataUrl
        }
      }

      // Rendu pixel-perfect haute résolution (pixelRatio: 3 = 300 DPI)
      const dataUrl = await toPng(targetEl, {
        quality: 0.98,
        pixelRatio: 3,
        backgroundColor: '#07152b',
        cacheBust: true,
      })

      return dataUrl
    } finally {
      // On restaure l'affichage d'origine
      setSide(originalSide)
    }
  }

  /**
   * Génération d'un document PDF professionnel Haute Définition
   * Contient les deux faces (Recto et Verso) prêtes pour l'impression directe (Badges PVC 54 × 86 mm)
   * Génère 2 pages de dimensions exactes ISO 7810 CR80 [54, 86] mm
   */
  const generateBadgePDF = async (): Promise<Blob> => {
    if (!rectoRef.current || !versoRef.current) {
      throw new Error('Éléments de carte introuvables')
    }

    // Capture séquentielle propre des deux faces avec bascule DOM
    const rectoDataUrl = await captureSideDataUrl('recto')
    const versoDataUrl = await captureSideDataUrl('verso')

    if (!rectoDataUrl || !versoDataUrl) {
      throw new Error('Échec de la capture des faces')
    }

    // Format badge vertical standard ISO 7810 CR80 : 54 mm × 86 mm
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [54, 86],
    })

    // Page 1 : RECTO (Face)
    doc.addImage(rectoDataUrl, 'PNG', 0, 0, 54, 86, undefined, 'FAST')

    // Page 2 : VERSO (Infos & Contact)
    doc.addPage([54, 86], 'portrait')
    doc.addImage(versoDataUrl, 'PNG', 0, 0, 54, 86, undefined, 'FAST')

    return doc.output('blob')
  }

  // Téléchargement du Badge Officiel complet (PDF 2 pages Recto + Verso)
  const handleDownload = async () => {
    try {
      setIsExporting(true)
      const toastId = toast.loading("Génération du PDF d'impression (Recto & Verso)...")

      const pdfBlob = await generateBadgePDF()
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Badge_Officiel_${firstName}_${lastName}.pdf`.replace(/\s+/g, '_')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Badge PDF prêt pour impression (Recto + Verso 54 × 86 mm) !', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la création du PDF.')
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
    <div className="flex flex-col items-center w-full max-w-sm">
      {/* Contrôles supérieurs */}
      {showActions && (
        <div className="flex flex-col w-full gap-2.5 mb-3 px-1">
          <div className="flex items-center justify-between w-full">
            {/* Bascule Recto / Verso */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => setSide('recto')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  side === 'verso'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Verso (Infos)
              </button>
            </div>

            {/* Actions Télécharger / Partager */}
            <div className="flex items-center gap-1.5">
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
                title="Télécharger le badge en PDF prêt à imprimer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-primary-900 hover:bg-primary-800 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="12" y2="18"></line>
                  <line x1="15" y1="15" x2="12" y2="18"></line>
                </svg>
                Télécharger PDF
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Format Badge Tour de Cou PVC (54 × 86 mm)
            </span>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
              ✦ Vernis Brillant
            </span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CADRE BADGE PVC VERTICAL (CR80 Portrait : 54 x 86 mm)      */}
      {/* ========================================================= */}
      <div className="w-full max-w-[310px] relative select-none">
        
        {/* --------------------------------------------------------- */}
        {/* FACE RECTO VERTICALE                                      */}
        {/* --------------------------------------------------------- */}
        <div
          ref={rectoRef}
          id={`member-pvc-recto-${member.id}`}
          className="w-full rounded-[26px] overflow-hidden relative"
          style={{
            aspectRatio: '0.628 / 1', // Format Badge Tour de cou ISO 7810 (54/86)
            background: theme.primaryGradient,
            boxShadow: theme.borderGlow,
            display: side === 'recto' ? 'block' : 'none',
          }}
        >
          {/* REFLET VERNIS BRILLANT PVC */}
          <div
            className="absolute inset-0 pointer-events-none z-30"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.03) 45%, transparent 60%, rgba(255,255,255,0.09) 90%, transparent 100%)',
            }}
          />

          {/* Fente stylisée pour cordon / Tour de cou en haut */}
          <div className="w-full flex justify-center pt-2.5 relative z-20">
            <div className="w-12 h-1.5 rounded-full bg-black/40 border border-white/20 shadow-inner"></div>
          </div>

          {/* Halo d'ambiance premium */}
          <div
            className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none"
            style={{ backgroundColor: theme.accentColor, opacity: 0.18 }}
          />

          {/* CONTENU PRINCIPAL DU BADGE VERTICAL */}
          <div className="relative z-10 h-[calc(100%-16px)] px-5 pb-5 pt-1.5 flex flex-col justify-between items-center text-center">
            
            {/* 1. EN-TÊTE : Logo Église + Nom Église + Département */}
            <div className="w-full flex flex-col items-center">
              {/* Logo église rond : REMPLIT PARFAITEMENT LE FOND BLANC */}
              <div className="w-14 h-14 rounded-full bg-white shadow-lg overflow-hidden ring-2 ring-white/90 flex items-center justify-center p-0.5">
                {member.church.logo_url ? (
                  <img
                    src={member.church.logo_url}
                    alt="Logo"
                    className="w-full h-full object-cover rounded-full"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <span className="font-serif font-black text-slate-800 text-lg">
                    {member.church.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Nom de l'église en BLANC pur bien visible */}
              <h3 className="font-black font-serif text-white tracking-wide text-[13px] leading-tight uppercase drop-shadow-md mt-2 w-full text-center">
                {member.church.name}
              </h3>

              {/* Département d'affectation aux couleurs de l'église */}
              <div 
                className="mt-1 px-3.5 py-1 rounded-full border shadow-sm backdrop-blur-md"
                style={{ 
                  backgroundColor: theme.chipBg, 
                  borderColor: `${theme.accentColor}55` 
                }}
              >
                <p 
                  title={displayRole}
                  className="font-extrabold uppercase tracking-wider text-[11px] leading-none drop-shadow-sm"
                  style={{ color: theme.chipText }}
                >
                  {displayRole}
                </p>
              </div>
            </div>

            {/* 2. PHOTO DU MEMBRE AVEC CADRE OR & COCHE */}
            <div className="relative my-1">
              <div
                className="w-24 h-24 rounded-2xl p-0.5 shadow-2xl relative overflow-hidden"
                style={{ background: theme.accentGradient }}
              >
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={fullDisplayName}
                    className="w-full h-full rounded-[14px] object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-white font-bold text-3xl font-serif">
                    {firstName[0]}
                    {lastName[0]}
                  </div>
                )}
              </div>
              {/* Badge Certifié */}
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-black shadow-md border-2 border-white"
                style={{ backgroundColor: theme.accentColor }}
              >
                ✓
              </div>
            </div>

            {/* 3. NOM ET PRÉNOM : Prénom avec couleur accent de l'église, Nom en Blanc Majuscule */}
            <div className="w-full">
              <div className="flex items-baseline justify-center gap-1.5 flex-wrap leading-tight">
                <span 
                  className="text-[14px] font-extrabold uppercase tracking-wide drop-shadow-sm"
                  style={{ color: theme.chipText }}
                >
                  {firstName}
                </span>
                <span className="text-[16px] font-black text-white uppercase tracking-tight drop-shadow-sm">
                  {lastName}
                </span>
              </div>

              {/* Téléphone et Localisation avec tout l'espace requis */}
              <div className="mt-2 space-y-1 text-center">
                {member.phone && (
                  <p className="text-[11.5px] font-bold text-white/95 flex items-center justify-center gap-1.5">
                    <span className="text-[11px]">📞</span>
                    <span>{member.phone}</span>
                  </p>
                )}

                {(member.quartier || member.commune) && (
                  <p className="text-[11px] font-medium text-white/80 flex items-center justify-center gap-1">
                    <span className="text-[10px]">📍</span>
                    <span>{[member.quartier, member.commune].filter(Boolean).join(' • ')}</span>
                  </p>
                )}
              </div>
            </div>

            {/* 4. QR CODE OFFICIEL AU BAS DU BADGE */}
            <div className="flex flex-col items-center pt-1 border-t border-white/15 w-full">
              <div className="p-1.5 bg-white rounded-xl shadow-lg border border-white/90">
                <QRCodeSVG
                  value={member.id}
                  size={46}
                  level="M"
                  includeMargin={false}
                  fgColor="#07152b"
                  bgColor="#ffffff"
                />
              </div>
              <span className="text-[7.5px] font-mono font-bold text-white/70 uppercase tracking-widest mt-1">
                POINTAGE ACCUEIL
              </span>
            </div>

          </div>
        </div>

        {/* --------------------------------------------------------- */}
        {/* FACE VERSO VERTICALE                                      */}
        {/* --------------------------------------------------------- */}
        <div
          ref={versoRef}
          id={`member-pvc-verso-${member.id}`}
          className="w-full rounded-[26px] overflow-hidden relative"
          style={{
            aspectRatio: '0.628 / 1', // Format Badge Tour de cou ISO 7810 (54/86)
            background: theme.primaryGradient,
            boxShadow: theme.borderGlow,
            display: side === 'verso' ? 'block' : 'none',
          }}
        >
          {/* REFLET BRILLANT VERSO */}
          <div
            className="absolute inset-0 pointer-events-none z-30"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 40%, rgba(255,255,255,0.08) 80%, transparent 100%)',
            }}
          />

          {/* Fente pour tour de cou au verso */}
          <div className="w-full flex justify-center pt-2.5 relative z-20">
            <div className="w-12 h-1.5 rounded-full bg-black/40 border border-white/20 shadow-inner"></div>
          </div>

          {/* BANDE MAGNÉTIQUE PVC : CARTE OFFICIELLE CENTRÉE */}
          <div className="w-full h-9 bg-black/60 mt-3 border-y border-white/10 relative z-10 flex items-center justify-center px-4 backdrop-blur-sm">
            <span 
              className="text-[9.5px] font-mono tracking-widest font-extrabold uppercase"
              style={{ color: theme.chipText }}
            >
              CARTE OFFICIELLE
            </span>
          </div>

          {/* LOGO DE L'ÉGLISE EN FILIGRANE ROND SANS CONTOUR BLANC AVEC LÉGER EFFET FLOU */}
          {member.church.logo_url && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 mt-8 overflow-hidden"
              style={{ opacity: 0.14 }}
            >
              <div className="w-48 h-48 rounded-full overflow-hidden flex items-center justify-center filter blur-[1px]">
                <img
                  src={member.church.logo_url}
                  alt="Filigrane verso"
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>
            </div>
          )}

          {/* CONTENU VERSO AÉRÉ */}
          <div className="relative z-10 p-5 pt-3 h-[calc(100%-65px)] flex flex-col justify-between text-white text-center">
            
            <div className="space-y-3">
              {/* Informations Communauté & Code */}
              <div className="border-b border-white/15 pb-2">
                <p className="text-[9px] uppercase tracking-wider text-white/60 font-bold">Communauté Chrétienne</p>
                <p className="text-sm font-black font-serif text-white mt-0.5">{member.church.name}</p>
                {member.church.code && (
                  <span 
                    className="inline-block text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border mt-1.5 shadow-sm"
                    style={{ 
                      backgroundColor: theme.chipBg, 
                      color: theme.chipText,
                      borderColor: `${theme.accentColor}55`
                    }}
                  >
                    CODE ÉGLISE : {member.church.code}
                  </span>
                )}
              </div>

              {/* Bloc Coordonnées de l'Église : Contact & Localisation pour restitution */}
              <div 
                className="rounded-xl p-2.5 border text-center backdrop-blur-sm space-y-1.5"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.12)'
                }}
              >
                <div>
                  <p 
                    className="text-[8.5px] font-black uppercase tracking-wider"
                    style={{ color: theme.chipText }}
                  >
                    {pastorTitle}
                  </p>
                  <p className="text-[11px] font-black text-white">{pastorName}</p>
                </div>

                {/* Téléphone & Localisation de l'église */}
                <div className="pt-1 border-t border-white/10 space-y-1">
                  {churchContact && (
                    <p className="text-[10px] font-bold text-white/95 font-mono flex items-center justify-center gap-1">
                      <span>📞</span>
                      <span>{churchContact}</span>
                    </p>
                  )}
                  {churchLocation && (
                    <p className="text-[9.5px] font-medium text-white/85 flex items-center justify-center gap-1">
                      <span className="text-[9px]">📍</span>
                      <span className="line-clamp-1">{churchLocation}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Note d'usage légale : Restitution en cas de perte */}
            <div 
              className="p-1.5 rounded-lg border text-center"
              style={{
                backgroundColor: theme.chipBg,
                borderColor: `${theme.accentColor}33`,
              }}
            >
              <p className="text-[8px] text-white/90 leading-tight">
                ⚠️ <strong className="font-bold">En cas de perte :</strong> Merci de rapporter cette carte à l'adresse ci-dessus ou de contacter l'accueil.
              </p>
            </div>

            {/* Signature & Code Barre visuel avec mention MUNOKOLIVE */}
            <div className="flex flex-col items-center border-t border-white/15 pt-2">
              <div className="flex items-center gap-1.5 opacity-70 mb-1.5">
                <span className="w-1.5 h-4 bg-white"></span>
                <span className="w-0.5 h-4 bg-white"></span>
                <span className="w-2 h-4 bg-white"></span>
                <span className="w-1 h-4 bg-white"></span>
                <span className="w-0.5 h-4 bg-white"></span>
                <span className="w-2.5 h-4 bg-white"></span>
                <span className="w-1 h-4 bg-white"></span>
                <span className="w-0.5 h-4 bg-white"></span>
              </div>
              <span className="text-[8px] text-white/70 font-mono tracking-wider">
                ÉGLISE CONNECT • {memberCode}
              </span>
              <span 
                className="text-[7.5px] font-mono tracking-widest uppercase mt-0.5 font-bold"
                style={{ color: theme.chipText }}
              >
                PRODUIT DU PROJET MUNOKOLIVE
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
