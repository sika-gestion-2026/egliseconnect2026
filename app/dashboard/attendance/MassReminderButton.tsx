'use client'

import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { sendMassServiceReminder } from '@/app/actions/createService'

interface MassReminderButtonProps {
  serviceId: string
  serviceName: string
}

export default function MassReminderButton({ serviceId, serviceName }: MassReminderButtonProps) {
  const [isSending, setIsSending] = useState(false)

  const handleSendReminder = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Voulez-vous vraiment envoyer un rappel à tous les membres pour le culte "${serviceName}" ?`)) return

    setIsSending(true)
    const res = await sendMassServiceReminder(serviceId)
    
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(
        <div className="flex flex-col">
          <span className="font-bold">Succès !</span>
          <span className="text-sm">{res.count} rappels envoyés.</span>
        </div>,
        {
          icon: '📢',
          style: {
            borderRadius: '10px',
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155'
          },
        }
      )
    }
    setIsSending(false)
  }

  return (
    <button
      onClick={handleSendReminder}
      disabled={isSending}
      className={`absolute bottom-4 right-4 px-4 py-2.5 rounded-2xl shadow-xl transition-all duration-300 z-20 flex items-center justify-center gap-2.5 font-bold text-sm overflow-hidden group
        ${isSending 
          ? 'bg-primary-900/50 text-white/50 cursor-not-allowed border border-primary-500/20' 
          : 'bg-gradient-to-r from-primary-500 to-indigo-600 hover:scale-105 hover:shadow-primary-500/40 text-white border border-white/10'}`}
      title="Notifier tous les membres"
    >
      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none"></div>
      {isSending ? (
        <>
          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          <span>Envoi...</span>
        </>
      ) : (
        <>
          <Megaphone size={16} className="group-hover:animate-bounce" />
          <span className="tracking-wide">Rappels</span>
        </>
      )}
    </button>
  )
}
