'use server'

import { infiltrateChurch } from '@/app/actions/superadmin'

export async function enterChurchAction(formData: FormData) {
  const churchId = formData.get('churchId') as string
  if (!churchId) return
  await infiltrateChurch(churchId)
}
