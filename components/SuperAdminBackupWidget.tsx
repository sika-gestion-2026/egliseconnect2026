'use client'

import { useState } from 'react'
import { ShieldAlert, Database, RotateCcw, CheckCircle2, Clock, Sparkles } from 'lucide-react'
import { createSystemBackupAction, restoreSystemBackupAction } from '@/app/actions/backupRestore'
import toast from 'react-hot-toast'

interface BackupItem {
  id: string
  created_at: string
  backup_type: string
  description: string
  total_churches: number
  total_members: number
}

export default function SuperAdminBackupWidget({ initialBackups }: { initialBackups: BackupItem[] }) {
  const [backups, setBackups] = useState<BackupItem[]>(initialBackups)
  const [isCreating, setIsCreating] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<BackupItem | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Création instantanée d'un snapshot
  const handleCreateBackup = async () => {
    setIsCreating(true)
    const t = toast.loading('Création du snapshot en cours...')
    try {
      const res = await createSystemBackupAction('manual', 'Sauvegarde instantanée Super Admin')
      if (res.error) {
        toast.error(res.error, { id: t })
      } else {
        toast.success('Snapshot créé avec succès !', { id: t })
        if (res.backup) {
          setBackups(prev => [res.backup as BackupItem, ...prev])
        }
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde.', { id: t })
    } finally {
      setIsCreating(false)
    }
  }

  // Restauration en 1 clic
  const handleConfirmRestore = async () => {
    if (!selectedBackup) return
    setIsRestoring(true)
    const t = toast.loading('Restauration globale en cours...')
    try {
      const res = await restoreSystemBackupAction(selectedBackup.id)
      if (res.error) {
        toast.error(res.error, { id: t })
      } else {
        toast.success(`Restauration terminée ! (${res.restoredCount?.churches} églises, ${res.restoredCount?.members} fidèles)`, { id: t, duration: 6000 })
        setConfirmOpen(false)
        setSelectedBackup(null)
      }
    } catch {
      toast.error('Erreur inattendue lors de la restauration.', { id: t })
    } finally {
      setIsRestoring(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-gray-100 dark:border-slate-800 p-6 mb-10 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* Header Widget */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-900 dark:text-gold-400 rounded-lg">
              <Database size={18} />
            </span>
            <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white">
              Coffre-fort & Restauration en 1 Clic
            </h3>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <Sparkles size={11} /> Auto 48h
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sauvegardes automatiques quotidiennes. Restaurez l'ensemble du réseau à chaud en un seul clic sans coupure de service.
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={isCreating}
          className="px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95 flex items-center gap-2 disabled:opacity-50"
        >
          <Database size={14} />
          {isCreating ? 'Snapshot en cours...' : 'Créer un snapshot maintenant'}
        </button>
      </div>

      {/* Liste des snapshots des 2 derniers jours */}
      <div className="space-y-3">
        {backups.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-medium text-gray-500">Aucun snapshot dans la fenêtre des 48h.</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Le prochain cycle automatique aura lieu cette nuit, ou lancez un snapshot manuel.</p>
          </div>
        ) : (
          backups.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between p-3.5 bg-gray-50/70 dark:bg-slate-800/50 hover:bg-gold-50/40 dark:hover:bg-gold-950/10 border border-gray-200/60 dark:border-slate-700/60 rounded-xl transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  b.backup_type === 'auto'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'bg-gold-100 text-gold-700 dark:bg-gold-950/40 dark:text-gold-300'
                }`}>
                  <RotateCcw size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {formatDate(b.created_at)}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200/60 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                      {b.backup_type === 'auto' ? 'Automatique' : 'Manuel'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {b.total_churches} églises • {b.total_members} membres • {b.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedBackup(b)
                  setConfirmOpen(true)
                }}
                className="px-3 py-1.5 bg-gold-500/10 hover:bg-gold-500 text-gold-700 hover:text-white dark:text-gold-400 dark:hover:text-white border border-gold-400/40 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 flex-shrink-0"
              >
                <RotateCcw size={12} />
                <span>Restaurer en 1 clic</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modale de Confirmation Ultra-sécurisée */}
      {confirmOpen && selectedBackup && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gold-500/30 overflow-hidden transform animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-primary-900 p-6 text-white text-center relative border-b-2 border-gold-500">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gold-500/20 border border-gold-400/40 flex items-center justify-center text-gold-300">
                <ShieldAlert size={26} />
              </div>
              <h3 className="text-xl font-serif font-bold text-white">
                Restauration Réseau en 1 Clic
              </h3>
              <p className="text-xs text-gold-300/90 mt-1">
                Point de restauration du {formatDate(selectedBackup.created_at)}
              </p>
            </div>

            <div className="p-6 text-center space-y-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Êtes-vous sûr de vouloir restaurer l'état global du réseau ? Toutes les églises ({selectedBackup.total_churches}) et leurs fidèles ({selectedBackup.total_members}) seront réalignés sur cet instantané.
              </p>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-xl text-left flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                  Restauration non destructive : vos clés primaires et structures existantes sont protégées et resynchronisées.
                </span>
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false)
                  setSelectedBackup(null)
                }}
                disabled={isRestoring}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isRestoring ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Restauration...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>Confirmer et Restaurer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
