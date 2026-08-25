'use client'

import { useState, useRef } from 'react'

interface PhotoUploadPreviewProps {
  name?: string
  defaultPhotoUrl?: string | null
  fallbackIcon?: string
  title?: string
  description?: string
}

export default function PhotoUploadPreview({ 
  name = 'photo_file', 
  defaultPhotoUrl = null, 
  fallbackIcon = '👤',
  title = 'Photo de profil',
  description = 'Ajoutez une belle photo. Vous pouvez la prendre directement avec votre téléphone !'
}: PhotoUploadPreviewProps) {
  const [preview, setPreview] = useState<string | null>(defaultPhotoUrl)
  const [activeInput, setActiveInput] = useState<'camera' | 'gallery' | null>(null)
  
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, source: 'camera' | 'gallery') => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      setActiveInput(source)
      
      // Reset the other input so we don't submit two files
      if (source === 'camera' && galleryInputRef.current) {
        galleryInputRef.current.value = ''
      } else if (source === 'gallery' && cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
    } else {
      setPreview(defaultPhotoUrl)
      setActiveInput(null)
    }
  }

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-primary-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-8 shadow-sm hover:border-primary-400 dark:hover:border-gold-500 transition-colors group">
      {/* Avatar Preview */}
      <div className="w-36 h-36 shrink-0 rounded-full bg-gradient-to-tr from-primary-100 to-primary-50 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-5xl text-primary-900 dark:text-gold-400 border-4 border-white dark:border-slate-900 overflow-hidden shadow-lg group-hover:scale-105 transition-transform duration-300">
        {preview ? (
          <img src={preview} alt="Prévisualisation" className="w-full h-full object-cover" />
        ) : (
          <span className="drop-shadow-sm">{fallbackIcon}</span>
        )}
      </div>

      <div className="flex-1 space-y-4 w-full">
        <div>
          <label className="block text-lg font-serif font-bold text-gray-900 dark:text-white mb-1">
            {title}
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Bouton Appareil Photo */}
          <button 
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-900 hover:bg-primary-800 dark:bg-gold-500 dark:hover:bg-gold-400 text-white dark:text-slate-900 rounded-xl font-bold shadow-md transition-all active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>
            Prendre une photo
          </button>

          {/* Bouton Galerie */}
          <button 
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-white border-2 border-gray-200 dark:border-slate-600 rounded-xl font-bold shadow-sm transition-all active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            Parcourir
          </button>
        </div>

        {/* Hidden Inputs */}
        <input 
          ref={cameraInputRef}
          name={activeInput === 'camera' || activeInput === null ? name : undefined}
          type="file" 
          accept="image/*" 
          capture="environment" // Force mobile camera
          onChange={(e) => handleImageChange(e, 'camera')}
          className="hidden"
        />
        <input 
          ref={galleryInputRef}
          name={activeInput === 'gallery' ? name : undefined}
          type="file" 
          accept="image/*" 
          onChange={(e) => handleImageChange(e, 'gallery')}
          className="hidden"
        />
      </div>
    </div>
  )
}
