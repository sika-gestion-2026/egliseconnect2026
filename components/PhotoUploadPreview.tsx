'use client'

import { useState } from 'react'

interface PhotoUploadPreviewProps {
  name?: string
  defaultPhotoUrl?: string | null
  fallbackIcon?: string
}

export default function PhotoUploadPreview({ name = 'photo_file', defaultPhotoUrl = null, fallbackIcon = '👤' }: PhotoUploadPreviewProps) {
  const [preview, setPreview] = useState<string | null>(defaultPhotoUrl)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    } else {
      setPreview(defaultPhotoUrl)
    }
  }

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-750 rounded-xl border border-gray-150 dark:border-slate-700 flex flex-col md:flex-row items-center gap-6">
      <div className="w-32 h-32 shrink-0 rounded-full bg-primary-100 dark:bg-slate-700 flex items-center justify-center text-4xl text-primary-900 dark:text-gold-400 border-2 border-gold-500 overflow-hidden shadow-md">
        {preview ? (
          <img src={preview} alt="Prévisualisation" className="w-full h-full object-cover" />
        ) : (
          <span>{fallbackIcon}</span>
        )}
      </div>
      <div className="flex-1 space-y-1">
        <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">Photo du Membre</label>
        <input 
          name={name}
          type="file" 
          accept="image/*" 
          onChange={handleImageChange}
          className="px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 text-sm cursor-pointer w-full max-w-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-900 hover:file:bg-primary-100" 
        />
        <p className="text-xs text-gray-500 mt-1">Format d'image recommandé : JPG, PNG (Carré). Taille max conseillée 5MB.</p>
      </div>
    </div>
  )
}
