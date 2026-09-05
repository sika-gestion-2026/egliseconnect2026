'use client'

import { useTransition } from 'react'
import { infiltrateChurch } from '@/app/actions/superadmin'

export default function InfiltrateButton({ churchId }: { churchId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button 
      onClick={() => startTransition(() => { infiltrateChurch(churchId) })}
      disabled={isPending}
      className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md transition-all flex items-center gap-1 disabled:opacity-50"
      title="Entrer dans le tableau de bord de cette église"
    >
      {isPending ? '⏳' : '🚪'} Entrer
    </button>
  )
}
