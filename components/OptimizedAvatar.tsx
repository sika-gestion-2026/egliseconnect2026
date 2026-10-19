'use client'

import React, { useState } from 'react'
import Image from 'next/image'

type OptimizedAvatarProps = {
  src?: string | null
  alt: string
  size?: number // width/height in px (for layout and fallback)
  className?: string
  fallbackInitials?: string
}

export default function OptimizedAvatar({
  src,
  alt,
  size = 56, // default 56px (~w-14 h-14)
  className = '',
  fallbackInitials = '?'
}: OptimizedAvatarProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  if (!src || error) {
    return (
      <div 
        className={`flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 text-gray-400 font-bold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {fallbackInitials.substring(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <div 
      className={`relative rounded-full overflow-hidden shrink-0 ${className} ${loading ? 'animate-pulse bg-gray-200 dark:bg-slate-600' : ''}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${size}px`}
        className={`object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
      />
    </div>
  )
}
