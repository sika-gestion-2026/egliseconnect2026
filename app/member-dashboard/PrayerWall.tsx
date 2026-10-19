'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'

interface PrayerRequest {
  id: string
  content: string
  author_name: string | null
  is_anonymous: boolean
  prayer_count: number
  created_at: string
  member_id: string | null
}

interface Props {
  churchId?: string
  /** UUID du membre connecté, pour masquer le bouton "Je prie" sur ses propres demandes. */
  memberId?: string
}

export default function PrayerWall({ churchId, memberId }: Props) {
  const [requests, setRequests] = useState<PrayerRequest[]>([])
  const [newRequest, setNewRequest] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [prayingId, setPrayingId] = useState<string | null>(null)
  const supabase = createClient()

  const loadRequests = useCallback(async () => {
    if (!churchId) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('prayer_requests')
        .select('id, content, author_name, is_anonymous, prayer_count, created_at, member_id')
        .eq('church_id', churchId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setRequests((data ?? []) as PrayerRequest[])
    } catch (err) {
      console.error('Chargement du mur de prière impossible:', err)
      toast.error('Impossible de charger le mur de prière.')
    } finally {
      setLoading(false)
    }
  }, [churchId, supabase])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = newRequest.trim()

    if (!churchId) {
      toast.error('Contexte église manquant, publication impossible.')
      return
    }
    if (content.length < 2) {
      toast.error('Votre demande doit contenir au moins 2 caractères.')
      return
    }

    setSubmitting(true)
    try {
      // member_id, church_id et author_name sont volontairement absents : le
      // trigger prayer_requests_stamp_author les résout côté serveur. Les
      // envoyer permettrait de publier sous le nom d'un autre membre.
      const { data, error } = await supabase
        .from('prayer_requests')
        .insert({ content, is_anonymous: isAnonymous })
        .select('id, content, author_name, is_anonymous, prayer_count, created_at, member_id')
        .single()

      if (error) throw error

      setRequests(prev => [data as PrayerRequest, ...prev])
      setNewRequest('')
      setIsAnonymous(false)
      toast.success('Demande de prière publiée.')
    } catch (err: any) {
      // 23505 = violation de la contrainte unique (doublon du même texte)
      if (err?.code === '23505') {
        toast.error('Vous avez déjà publié cette demande.')
      } else if (err?.code === '42501') {
        toast.error("Votre profil n'est pas rattaché à une église.")
      } else {
        console.error('Publication impossible:', err)
        toast.error('Publication impossible. Réessayez.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handlePray = async (id: string) => {
    if (prayingId) return
    setPrayingId(id)

    // Mise à jour optimiste, annulée si l'écriture échoue.
    setRequests(prev =>
      prev.map(r => (r.id === id ? { ...r, prayer_count: r.prayer_count + 1 } : r))
    )

    try {
      const { error } = await supabase.rpc('increment_prayer_count', {
        p_request_id: id
      })

      if (error) throw error
    } catch (err) {
      console.error('Incrément du compteur impossible:', err)
      setRequests(prev =>
        prev.map(r => (r.id === id ? { ...r, prayer_count: Math.max(0, r.prayer_count - 1) } : r))
      )
      toast.error('Impossible d\u2019enregistrer votre prière.')
    } finally {
      setPrayingId(null)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-serif font-bold text-primary-900 dark:text-gold-400 flex items-center gap-2">
          🙏 Mur de Prière
        </h2>
        <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-gold-400 px-3 py-1 rounded-full font-bold">
          {loading ? 'Chargement…' : `${requests.length} demande${requests.length > 1 ? 's' : ''}`}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 relative">
        <textarea
          value={newRequest}
          onChange={(e) => setNewRequest(e.target.value)}
          maxLength={1000}
          placeholder="Partagez un sujet de prière avec l'église..."
          aria-label="Votre demande de prière"
          className="w-full p-4 pb-12 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
          rows={3}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-gray-300 text-primary-600"
            />
            Anonyme
          </label>
          <button
            type="submit"
            disabled={submitting || newRequest.trim().length < 2}
            aria-label="Publier la demande de prière"
            className="px-4 py-1.5 bg-primary-900 hover:bg-primary-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Publication…' : 'Publier'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-slate-900/60 animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-gray-500 italic bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl">
          Aucune demande de prière pour le moment. Soyez le premier à en partager une.
        </p>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {requests.map(req => {
            const isOwn = Boolean(memberId) && req.member_id === memberId
            const authorLabel =
              req.is_anonymous || !req.author_name ? 'Anonyme' : req.author_name

            return (
              <div
                key={req.id}
                className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700"
              >
                <p className="text-gray-800 dark:text-gray-200 text-sm mb-2">{req.content}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-gray-400">
                    — {authorLabel} · {formatDate(req.created_at)}
                  </span>
                  <button
                    onClick={() => handlePray(req.id)}
                    disabled={prayingId === req.id}
                    aria-label={`Prier pour cette demande, ${req.prayer_count} pri\u00e8res`}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-primary-600 hover:border-primary-300 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span>🙏</span> Je prie ({req.prayer_count})
                  </button>
                </div>
                {isOwn && (
                  <p className="mt-2 text-[10px] uppercase tracking-wide text-primary-600 font-bold">
                    Votre demande
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}