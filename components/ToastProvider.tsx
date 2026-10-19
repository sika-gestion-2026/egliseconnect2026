'use client'

import { Toaster } from 'react-hot-toast'

export default function ToastProvider() {
  return (
    <Toaster 
      position="top-right" 
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1e293b',
          color: '#fff',
          fontWeight: 'bold',
          borderRadius: '8px',
        },
        success: {
          iconTheme: {
            primary: '#4ade80',
            secondary: '#1e293b',
          },
        },
      }} 
    />
  )
}
