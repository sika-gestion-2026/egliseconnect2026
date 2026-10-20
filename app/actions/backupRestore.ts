'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// Tables réelles critiques à sauvegarder et restaurer
const CRITICAL_TABLES = [
  'churches',
  'members',
  'user_profiles',
  'church_departments',
  'church_services',
  'attendances',
  'attendance_members',
  'service_assignments',
  'church_finances',
  'mutual_members',
  'notifications',
  'pastoral_visits',
  'member_notes',
  'contents'
] as const

/**
 * Vérification stricte du rôle super_admin
 */
async function assertSuperAdmin() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    throw new Error('Action réservée exclusivement au Super Administrateur.')
  }

  return { user, supabase }
}

/**
 * Créer un snapshot de sauvegarde complet de toutes les données du réseau
 */
export async function createSystemBackupAction(type: 'auto' | 'manual' = 'manual', description?: string) {
  try {
    const { user, supabase } = await assertSuperAdmin()
    const adminSb = createAdminClient() || supabase

    const backupPayload: Record<string, any[]> = {}
    let totalChurches = 0
    let totalMembers = 0

    // Récupération de chaque table
    for (const table of CRITICAL_TABLES) {
      try {
        const { data, error } = await adminSb.from(table).select('*')
        if (error) {
          console.warn(`[Backup] Avertissement table ${table}:`, error.message)
          backupPayload[table] = []
        } else {
          backupPayload[table] = data || []
        }
      } catch (err) {
        console.warn(`[Backup] Exception table ${table}:`, err)
        backupPayload[table] = []
      }
    }

    totalChurches = backupPayload['churches']?.length || 0
    totalMembers = backupPayload['members']?.length || 0

    const { data: savedBackup, error: insertError } = await adminSb
      .from('system_backups')
      .insert({
        backup_type: type,
        description: description || (type === 'auto' ? 'Sauvegarde automatique journalière' : 'Sauvegarde manuelle Super Admin'),
        data_payload: backupPayload,
        total_churches: totalChurches,
        total_members: totalMembers,
        created_by: user.id
      })
      .select('id, created_at, backup_type, description, total_churches, total_members')
      .single()

    if (insertError) {
      console.error('[Backup Error]', insertError)
      return { error: 'Erreur lors de l’enregistrement de la sauvegarde : ' + insertError.message }
    }

    // Nettoyage silencieux des sauvegardes de plus de 7 jours
    try {
      await adminSb.rpc('cleanup_old_backups')
    } catch {}

    revalidatePath('/super-admin')
    return { success: true, backup: savedBackup }
  } catch (error: any) {
    console.error('[Backup Action Error]', error)
    return { error: error.message || 'Erreur inattendue' }
  }
}

/**
 * Récupérer les sauvegardes des 2 derniers jours (48h) prêtes pour restauration immédiate en 1 clic
 */
export async function getRecentBackupsAction() {
  try {
    const { supabase } = await assertSuperAdmin()
    const adminSb = createAdminClient() || supabase

    // Limité aux 2 derniers jours (48h)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data, error } = await adminSb
      .from('system_backups')
      .select('id, created_at, backup_type, description, total_churches, total_members')
      .gte('created_at', twoDaysAgo)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      // Si la table vient d'être créée ou autre
      return { backups: [] }
    }

    return { backups: data || [] }
  } catch (error: any) {
    return { error: error.message, backups: [] }
  }
}

/**
 * RESTAURATION EN 1 CLIC (Super Admin uniquement)
 * Restaure intégralement l'état des églises, fidèles, finances et cultes
 */
export async function restoreSystemBackupAction(backupId: string) {
  try {
    const { supabase } = await assertSuperAdmin()
    const adminSb = createAdminClient() || supabase

    if (!backupId) {
      return { error: 'ID de sauvegarde requis.' }
    }

    // Récupérer le payload de la sauvegarde
    const { data: backup, error: fetchErr } = await adminSb
      .from('system_backups')
      .select('*')
      .eq('id', backupId)
      .single()

    if (fetchErr || !backup || !backup.data_payload) {
      return { error: 'Sauvegarde introuvable ou corrompue.' }
    }

    const payload = backup.data_payload as Record<string, any[]>

    // Restauration ordonnée avec upsert pour préserver la consistance sans violation de clés étrangères
    // Ordre : churches -> members -> user_profiles -> departments -> services -> attendances -> join tables -> finances
    const restorationOrder = [
      'churches',
      'members',
      'church_departments',
      'church_services',
      'attendances',
      'attendance_members',
      'service_assignments',
      'church_finances',
      'mutual_members',
      'notifications',
      'pastoral_visits',
      'member_notes',
      'contents'
    ]

    for (const table of restorationOrder) {
      const records = payload[table]
      if (Array.isArray(records) && records.length > 0) {
        // Upsert par lots de 200 pour éviter de saturer la connexion
        for (let i = 0; i < records.length; i += 200) {
          const batch = records.slice(i, i + 200)
          const { error: upsertErr } = await adminSb.from(table).upsert(batch, { ignoreDuplicates: false })
          if (upsertErr) {
            console.warn(`[Restore] Erreur d'upsert sur ${table}:`, upsertErr.message)
          }
        }
      }
    }

    revalidatePath('/', 'layout')
    revalidatePath('/super-admin')
    revalidatePath('/dashboard')

    return { 
      success: true, 
      restoredCount: {
        churches: payload['churches']?.length || 0,
        members: payload['members']?.length || 0
      }
    }
  } catch (error: any) {
    console.error('[Restore Action Error]', error)
    return { error: error.message || 'Erreur lors de la restauration' }
  }
}
