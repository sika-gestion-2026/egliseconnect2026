'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { infiltrateChurch } from '@/app/actions/superadmin'

export default function InfiltrateButton({ churchId }: { churchId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleInfiltrate = () => {
    startTransition(async () => {
      try {
        const res = await infiltrateChurch(churchId)
        if (res && !res.success) {
          alert(res.error || "Impossible d'entrer dans cette église")
        } else {
          router.push('/dashboard')
          router.refresh()
        }
      } catch (err: any) {
        // En Next.js, redirect() jette une exception interne NEXT_REDIRECT
        if (err?.message !== 'NEXT_REDIRECT') {
          console.error(err)
        }
      }
    })
  }

  return (
    <button 
      onClick={handleInfiltrate}
      disabled={isPending}
      className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md transition-all flex items-center gap-1 disabled:opacity-50"
      title="Entrer dans le tableau de bord de cette église"
    >
      {isPending ? '⏳' : '🚪'} Entrer
    </button>
  )
}

