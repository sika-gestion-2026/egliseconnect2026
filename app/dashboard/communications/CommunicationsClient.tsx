'use client'

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'

type Member = {
  id: string
  quartier: string | null
  phone: string | null
  functions: string[]
}

interface Props {
  members: Member[]
  quartiers: string[]
  absentMemberIds: string[]
  /** Nombre de SMS réellement envoyés ce mois-ci (0 tant qu'aucun envoi). */
  smsSentThisMonth: number
  /** Taux de délivrance réel, ou null si aucun retour fournisseur. */
  deliveryRate: number | null
  churchId: string
}

export default function CommunicationsClient({
  members,
  quartiers,
  absentMemberIds,
  smsSentThisMonth,
  deliveryRate,
  churchId,
}: Props) {
  const [message, setMessage] = useState('')
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['all'])
  const [isSending, setIsSending] = useState(false)

  const charCount = message.length
  const smsSegments = useMemo(() => {
    if (charCount === 0) return 1
    if (charCount <= 160) return 1
    return Math.ceil(charCount / 153)
  }, [charCount])

  /**
   * Audience calculée sur les données réelles : la liste des membres filtrée
   * par quartier, département ou présence au dernier culte. La version
   * précédente inventait des pourcentages (10 % d'absents, 25 % par département).
   */
  const audienceMembers = useMemo(() => {
    if (selectedTargets.includes('all')) return members

    return members.filter(m => {
      return selectedTargets.some(target => {
        if (target === 'absentees') return absentMemberIds.includes(m.id)
        if (target.startsWith('dept_')) return m.functions.includes(target.slice(5))
        if (target.startsWith('quartier_')) return m.quartier === target.slice(9)
        return false
      })
    })
  }, [selectedTargets, members, absentMemberIds])

  /** Destinataires ayant un numéro : c'est le maximum réellement joignable. */
  const reachableMembers = useMemo(
    () => audienceMembers.filter(m => Boolean(m.phone && m.phone.trim().length > 0)),
    [audienceMembers]
  )

  const estimatedCost = reachableMembers.length * smsSegments * 0.055

  const departmentNames = useMemo(() => {
    const names = new Set<string>()
    members.forEach(m => m.functions.forEach(f => names.add(f)))
    return Array.from(names).slice(0, 8)
  }, [members])

  const toggleTarget = (target: string) => {
    if (target === 'all') {
      setSelectedTargets(['all'])
      return
    }
    setSelectedTargets(prev => {
      const withoutAll = prev.filter(t => t !== 'all')
      if (withoutAll.includes(target)) {
        const next = withoutAll.filter(t => t !== target)
        return next.length === 0 ? ['all'] : next
      }
      return [...withoutAll, target]
    })
  }

  const isTargetSelected = (target: string) => selectedTargets.includes(target)

  /**
   * Enregistre la campagne en base avec le statut 'pending'.
   * Aucun envoi réel n'est effectué : tant qu'aucun fournisseur SMS n'est
   * configuré, annoncer un succès serait mensonger.
   */
  const handleCreateCampaign = async () => {
    if (message.trim().length === 0) return

    if (reachableMembers.length === 0) {
      toast.error('Aucun membre ciblé ne possède de numéro de téléphone.')
      return
    }

    setIsSending(true)
    try {
      const supabase = createClient()

      const targetType =
        selectedTargets.length === 1 && selectedTargets[0] === 'absentees'
          ? 'absentees'
          : selectedTargets.length === 1 && selectedTargets[0].startsWith('dept_')
            ? 'dept'
            : selectedTargets.length === 1 && selectedTargets[0].startsWith('quartier_')
              ? 'quartier'
              : 'all'

      const targetValue =
        selectedTargets.length === 1 && selectedTargets[0] !== 'all'
          ? selectedTargets[0].includes('_')
            ? selectedTargets[0].split('_').slice(1).join('_')
            : null
          : null

      const { data: campaign, error } = await supabase
        .from('sms_campaigns')
        .insert({
          church_id: churchId,
          message: message.trim(),
          target_type: targetType,
          target_value: targetValue,
          audience_size: reachableMembers.length,
          status: 'pending',
        })
        .select('id')
        .single()

      if (error) throw error

      const { error: recipientsError } = await supabase
        .from('sms_campaign_recipients')
        .insert(
          reachableMembers.map(m => ({
            campaign_id: campaign.id,
            member_id: m.id,
            phone: m.phone as string,
            status: 'queued',
          }))
        )

      if (recipientsError) throw recipientsError

      setMessage('')
      toast.success(
        `Campagne enregistrée : ${reachableMembers.length} destinataire${reachableMembers.length > 1 ? 's' : ''} en file d'attente.`
      )
      toast('Aucun SMS n\u2019a encore été envoyé : un fournisseur SMS doit être configuré.', {
        icon: 'ℹ️',
        duration: 6000,
      })
    } catch (err: any) {
      console.error('Création de campagne impossible:', err)
      toast.error('Impossible de créer la campagne.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-20">
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h2 className="text-3xl font-extrabold mb-2 flex items-center gap-3">
              <span className="text-4xl">📱</span> Centre de Communication
            </h2>
            <p className="text-indigo-200 text-sm max-w-lg leading-relaxed">
              Préparez une campagne SMS ciblée à vos fidèles et suivez son état d&rsquo;envoi.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex-1 min-w-[150px] flex flex-col">
              <span className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">
                SMS envoyés (ce mois)
              </span>
              <span className="text-3xl font-black text-white">
                {smsSentThisMonth.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs text-indigo-300 mt-1">Données réelles</span>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex-1 min-w-[150px] flex flex-col">
              <span className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">
                Taux de délivrance
              </span>
              <span className="text-3xl font-black text-white">
                {deliveryRate === null ? '—' : `${deliveryRate.toFixed(1)}%`}
              </span>
              <span className="text-xs text-indigo-300 mt-1">
                {deliveryRate === null ? 'Aucun retour fournisseur' : 'Sur envois confirmés'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-3xl p-8 border border-gray-100 dark:border-slate-700/50 shadow-sm relative">
          <h3 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-2">
            Préparer une Campagne
          </h3>

          <div className="space-y-8">
            <div>
              <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Cible (Destinataires)
              </label>

              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => toggleTarget('all')}
                  aria-pressed={isTargetSelected('all')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                    isTargetSelected('all')
                      ? 'bg-primary-500 text-white border-primary-500 shadow-md'
                      : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                  }`}
                >
                  🌐 Tous les membres
                </button>
                <button
                  onClick={() => toggleTarget('absentees')}
                  aria-pressed={isTargetSelected('absentees')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                    isTargetSelected('absentees')
                      ? 'bg-red-500 text-white border-red-500 shadow-md'
                      : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                  }`}
                >
                  ⚠️ Absents du dernier culte ({absentMemberIds.length})
                </button>
                {departmentNames.map(dept => (
                  <button
                    key={dept}
                    onClick={() => toggleTarget(`dept_${dept}`)}
                    aria-pressed={isTargetSelected(`dept_${dept}`)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                      isTargetSelected(`dept_${dept}`)
                        ? 'bg-purple-500 text-white border-purple-500 shadow-md'
                        : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
                {quartiers.slice(0, 6).map(q => (
                  <button
                    key={q}
                    onClick={() => toggleTarget(`quartier_${q}`)}
                    aria-pressed={isTargetSelected(`quartier_${q}`)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                      isTargetSelected(`quartier_${q}`)
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                        : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    📍 {q}
                  </button>
                ))}
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 text-blue-800 dark:text-blue-300 font-medium">
                  <span>Destinataires joignables :</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-blue-900/40 px-3 py-1 rounded-lg shadow-sm">
                    {reachableMembers.length} fidèles
                  </span>
                  <span className="text-xs text-gray-500">
                    {audienceMembers.length - reachableMembers.length > 0
                      ? `${audienceMembers.length - reachableMembers.length} sans numéro`
                      : ''}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-4">
                <label
                  htmlFor="campaign-message"
                  className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Contenu du Message
                </label>
                <span className="text-xs text-gray-400">
                  Estim. {estimatedCost.toFixed(2)} &euro;
                </span>
              </div>

              <div
                className={`relative rounded-2xl border-2 transition-all ${
                  charCount > 480
                    ? 'border-red-400 dark:border-red-500/50'
                    : 'border-gray-200 dark:border-slate-700 focus-within:border-primary-500'
                }`}
              >
                <textarea
                  id="campaign-message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={1000}
                  className="w-full h-40 p-5 bg-transparent border-none focus:ring-0 resize-none font-medium text-slate-900 dark:text-white placeholder-slate-400"
                  placeholder="Shalom Bien-aimé(e), nous te rappelons la réunion de ce soir à 18h00 pile à l'église. Ne manque pas ce moment de grâce !"
                />

                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-b-[14px] border-t border-gray-100 dark:border-slate-700 flex justify-between items-center text-sm font-medium">
                  <div className="flex items-center gap-4">
                    <span className={charCount > 480 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}>
                      {charCount} caractères
                    </span>
                    <span className="text-gray-300 dark:text-slate-600">|</span>
                    <span className="text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                      {smsSegments} SMS / pers.
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-slate-500">Max conseillé: 480</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs font-bold text-gray-500 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full" />
                Aucun fournisseur SMS configuré
              </div>
              <button
                onClick={handleCreateCampaign}
                disabled={charCount === 0 || isSending || reachableMembers.length === 0}
                className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-3 disabled:opacity-50 disabled:shadow-none transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {isSending ? 'Enregistrement…' : 'Enregistrer la campagne'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 hidden lg:flex flex-col items-center">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">
            Aperçu
          </h4>
          <div className="w-full max-w-sm bg-gray-900 rounded-3xl p-5 shadow-2xl border border-gray-700">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-700">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
                EC
              </div>
              <div>
                <p className="text-white font-bold text-sm">Église Connect</p>
                <p className="text-gray-400 text-xs">maintenant</p>
              </div>
            </div>
            <div className="bg-primary-600 rounded-2xl rounded-tl-sm p-4 text-white text-sm leading-relaxed">
              {message || 'Votre message apparaîtra ici.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}