'use client'

import MemberIDCard, { MemberCardData } from '@/components/MemberIDCard'

interface MemberQRCodeProps {
  memberId: string
  memberName: string
  phone?: string | null
  photoUrl?: string | null
  status?: string | null
  roleTitle?: string | null
  quartier?: string | null
  commune?: string | null
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

export default function MemberQRCode({
  memberId,
  memberName,
  phone,
  photoUrl,
  status,
  roleTitle,
  quartier,
  commune,
  church,
}: MemberQRCodeProps) {
  const parts = memberName.trim().split(' ')
  const firstName = parts[0] || ''
  const lastName = parts.slice(1).join(' ') || ''

  const cardData: MemberCardData = {
    id: memberId,
    first_name: firstName,
    last_name: lastName,
    phone: phone,
    photo_url: photoUrl,
    status: status,
    role_title: roleTitle,
    quartier: quartier,
    commune: commune,
    church: {
      id: church?.id,
      name: church?.name || 'Église Connect',
      code: church?.code,
      logo_url: church?.logo_url,
      city: church?.city,
      commune: church?.commune,
      quartier: church?.quartier,
      leader_name: church?.leader_name,
      leader_contact: church?.leader_contact,
      leader_title: church?.leader_title,
      theme_color: (church as any)?.theme_color,
    },
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col items-center">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 border-b pb-3 dark:border-slate-700 w-full text-center mb-4">
        Carte de Membre (QR Code)
      </h3>
      <MemberIDCard member={cardData} showActions={true} />
    </div>
  )
}
