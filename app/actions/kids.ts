'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export async function getKidsByParent(parentId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data, error } = await supabase
    .from('kids')
    .select('*')
    .eq('parent_id', parentId)
    
  if (error) throw new Error(error.message)
  return data
}

export async function getAllKids() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data, error } = await supabase
    .from('kids')
    .select(`
      *,
      parent:members(id, first_name, last_name, email, phone)
    `)
    .order('first_name', { ascending: true })
    
  if (error) throw new Error(error.message)
  return data
}

export async function addKid(data: {
  parent_id: string
  first_name: string
  last_name: string
  date_of_birth?: string
  allergies?: string
  medical_notes?: string
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: result, error } = await supabase
    .from('kids')
    .insert([{
      ...data,
      date_of_birth: data.date_of_birth || null
    }])
    .select()
    .single()
    
  if (error) throw new Error(error.message)
  
  revalidatePath('/dashboard/kids')
  return result
}

function generateSecurityCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function checkInKid(kidId: string, serviceId: string, checkedInBy: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  // Verify kid is not already checked in for this service
  const { data: existingCheckin } = await supabase
    .from('kids_checkins')
    .select('*')
    .eq('kid_id', kidId)
    .eq('service_id', serviceId)
    .is('checked_out_at', null)
    .single()
    
  if (existingCheckin) {
    throw new Error('Enfant déjà pointé pour ce culte')
  }
  
  const securityCode = generateSecurityCode()
  
  const { data, error } = await supabase
    .from('kids_checkins')
    .insert([{
      kid_id: kidId,
      service_id: serviceId,
      security_code: securityCode,
      checked_in_by: checkedInBy
    }])
    .select(`
      *,
      kid:kids(first_name, last_name, parent:members(first_name, last_name, phone))
    `)
    .single()
    
  if (error) throw new Error(error.message)
  
  revalidatePath('/dashboard/kids')
  return data
}

export async function checkOutKid(checkinId: string, securityCode: string, checkedOutBy: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  // Verify security code
  const { data: checkin, error: checkError } = await supabase
    .from('kids_checkins')
    .select('*')
    .eq('id', checkinId)
    .single()
    
  if (checkError) throw new Error(checkError.message)
  if (checkin.security_code !== securityCode.toUpperCase()) {
    throw new Error('Code de sécurité invalide')
  }
  
  const { data, error } = await supabase
    .from('kids_checkins')
    .update({ 
      checked_out_at: new Date().toISOString(),
      checked_out_by: checkedOutBy
    })
    .eq('id', checkinId)
    .select()
    .single()
    
  if (error) throw new Error(error.message)
  
  revalidatePath('/dashboard/kids')
  return data
}

export async function getActiveCheckins(serviceId?: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  let query = supabase
    .from('kids_checkins')
    .select(`
      *,
      kid:kids(id, first_name, last_name, allergies, medical_notes, parent:members(id, first_name, last_name, phone)),
      service:church_services(id, name, service_date)
    `)
    .is('checked_out_at', null)
    .order('checked_in_at', { ascending: false })
    
  if (serviceId) {
    query = query.eq('service_id', serviceId)
  }
    
  const { data, error } = await query
  
  if (error) throw new Error(error.message)
  return data
}

export async function getChurchServices() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data, error } = await supabase
    .from('church_services')
    .select('id, name, service_date')
    .order('service_date', { ascending: false })
    .limit(10)
    
  if (error) throw new Error(error.message)
  
  // Map 'name' to 'title' and 'service_date' to 'date' for UI compatibility
  return data.map(s => ({
    id: s.id,
    title: s.name,
    date: s.service_date
  }))
}
