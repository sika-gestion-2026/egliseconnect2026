'use client'

import { useState, useMemo } from 'react'
import { addMultipleMutualMembers, addMutualTransaction, removeMutualMember, removeMutualTransaction } from '@/app/actions/mutual'
import MutuelleCharts from './MutuelleCharts'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import OptimizedAvatar from '@/components/OptimizedAvatar'

export default function MutuelleClient({ churchId, transactions, mutualMembers, nonMutualMembers }: any) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'members'>('transactions')
  
  // States for new transaction
  const [txType, setTxType] = useState<'contribution' | 'expense'>('contribution')
  const [txAmount, setTxAmount] = useState('')
  const [txMotive, setTxMotive] = useState('Mutuelle')
  const [txMemberId, setTxMemberId] = useState('')
  const [isSubmittingTx, setIsSubmittingTx] = useState(false)

  // States for filters
  const [filterType, setFilterType] = useState('all')
  const [filterMonth, setFilterMonth] = useState('all')
  const [filterMotive, setFilterMotive] = useState('all')

  // State for new members (bulk selection)
  const [selectedNewMemberIds, setSelectedNewMemberIds] = useState<string[]>([])
  const [isSubmittingMember, setIsSubmittingMember] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmittingTx(true)
    const res = await addMutualTransaction(churchId, txType === 'contribution' ? txMemberId : null, txType, Number(txAmount), txMotive)
    if (res.success) {
      toast.success('Enregistré avec succès !')
      setTxAmount('')
      setTxMotive('Mutuelle')
      setTxMemberId('')
    } else {
      toast.error('Erreur: ' + res.error)
    }
    setIsSubmittingTx(false)
  }

  async function handleAddMembers(e: React.FormEvent) {
    e.preventDefault()
    if (selectedNewMemberIds.length === 0) {
      toast.error('Veuillez sélectionner au moins un membre.')
      return
    }
    
    setIsSubmittingMember(true)
    const res = await addMultipleMutualMembers(churchId, selectedNewMemberIds)
    if (res.success) {
      toast.success(`${selectedNewMemberIds.length} membre(s) ajouté(s) à la mutuelle !`)
      setSelectedNewMemberIds([])
      setSearchQuery('')
    } else {
      toast.error('Erreur: ' + res.error)
    }
    setIsSubmittingMember(false)
  }

  async function handleRemoveMember(mutualMemberId: string, memberName: string) {
    const isConfirmed = window.confirm(`ZONE DE DANGER : Action irréversible.\n\nVoulez-vous vraiment retirer ${memberName} de la mutuelle ?\n\nAttention : Cela pourrait affecter l'historique d'affichage si des transactions lui sont liées.`)
    if (!isConfirmed) return

    const res = await removeMutualMember(mutualMemberId)
    if (res.success) {
      toast.success(`${memberName} a été retiré(e) de la mutuelle.`)
    } else {
      toast.error('Erreur: ' + res.error)
    }
  }

  const toggleMemberSelection = (id: string) => {
    setSelectedNewMemberIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const filteredNonMutualMembers = nonMutualMembers.filter((m: any) => 
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredTransactions = transactions.filter((t: any) => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterMotive !== 'all' && t.motive !== filterMotive) return false
    if (filterMonth !== 'all') {
      const txMonth = new Date(t.created_at).getMonth() + 1
      if (txMonth.toString() !== filterMonth) return false
    }
    return true
  })

  // Statistiques Financières
  const totalCotisations = useMemo(() => 
    transactions.filter((t:any) => t.type === 'contribution').reduce((acc: number, t: any) => acc + Number(t.amount), 0),
  [transactions])
  
  const totalDepenses = useMemo(() => 
    transactions.filter((t:any) => t.type === 'expense').reduce((acc: number, t: any) => acc + Number(t.amount), 0),
  [transactions])
  
  const solde = totalCotisations - totalDepenses

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header Financier Premium */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h2 className="text-3xl font-extrabold mb-1 flex items-center gap-3">
              <span className="text-4xl">🏦</span> Fonds de la Mutuelle
            </h2>
            <p className="text-slate-400 text-sm">Gestion des cotisations, dépenses et membres affiliés.</p>
          </div>
          
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex-1 md:min-w-[160px] flex flex-col">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Entrées</span>
              <span className="text-2xl font-black text-white">{totalCotisations.toLocaleString()} <span className="text-sm font-normal text-slate-400">FCFA</span></span>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex-1 md:min-w-[160px] flex flex-col">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Sorties</span>
              <span className="text-2xl font-black text-white">{totalDepenses.toLocaleString()} <span className="text-sm font-normal text-slate-400">FCFA</span></span>
            </div>
            <div className="bg-gradient-to-r from-gold-500/20 to-amber-500/20 backdrop-blur-xl border border-gold-500/30 rounded-2xl p-5 flex-1 md:min-w-[180px] flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-20 text-4xl">💎</div>
              <span className="text-gold-200 text-xs font-semibold uppercase tracking-wider mb-1">Solde Actuel</span>
              <span className="text-3xl font-black text-gold-400">{solde.toLocaleString()} <span className="text-sm font-normal text-gold-200">FCFA</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher Modern */}
      <div className="flex bg-gray-100 dark:bg-slate-800/50 p-1 rounded-2xl shadow-inner max-w-md mx-auto relative z-20">
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === 'transactions' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          💳 Transactions
        </button>
        <button 
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === 'members' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          👥 Membres ({mutualMembers.length})
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700/50 overflow-hidden">
        {activeTab === 'transactions' ? (
          <div className="p-8 animate-fade-in">
            {/* Formulaire Nouvelle Transaction */}
            <form onSubmit={handleAddTransaction} className="mb-10 bg-gradient-to-br from-gray-50 to-white dark:from-slate-900/80 dark:to-slate-900 p-8 rounded-3xl border border-gray-200/60 dark:border-slate-700/60 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-bl-[100px] pointer-events-none"></div>
              <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                Nouvelle Opération
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="col-span-1 lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Type d'opération</label>
                  <div className="relative">
                    <select 
                      value={txType} 
                      onChange={e => setTxType(e.target.value as any)}
                      className="w-full pl-4 pr-10 py-3.5 bg-white dark:bg-slate-800 border-none rounded-xl ring-1 ring-gray-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500 appearance-none font-medium shadow-sm"
                    >
                      <option value="contribution">🟢 Entrée (Cotisation)</option>
                      <option value="expense">🔴 Sortie (Dépense)</option>
                    </select>
                  </div>
                </div>
                
                <div className="col-span-1 lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Montant (FCFA)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="1"
                      min="0"
                      required
                      value={txAmount}
                      onChange={e => setTxAmount(e.target.value)}
                      className="w-full pl-4 pr-12 py-3.5 bg-white dark:bg-slate-800 border-none rounded-xl ring-1 ring-gray-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500 font-bold text-lg shadow-sm"
                      placeholder="0"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <span className="text-gray-400 font-medium">CFA</span>
                    </div>
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2 lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Motif</label>
                  <select 
                    required
                    value={txMotive}
                    onChange={e => setTxMotive(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white dark:bg-slate-800 border-none rounded-xl ring-1 ring-gray-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500 font-medium shadow-sm"
                  >
                    <option value="Mutuelle">Mutuelle Ordinaire</option>
                    <option value="Cotisation activité église">Événement / Activité Église</option>
                    <option value="Cotisation exceptionnelle">Cotisation Exceptionnelle</option>
                    <option value="Assistance sociale">Assistance Sociale / Cas Social</option>
                    <option value="Frais de fonctionnement">Frais de fonctionnement</option>
                    <option value="Autres">Autres</option>
                  </select>
                </div>

                {txType === 'contribution' && (
                  <div className="col-span-1 md:col-span-2 lg:col-span-4 animate-fade-in">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Membre donateur (Optionnel pour anonyme)</label>
                    <select 
                      value={txMemberId} 
                      onChange={e => setTxMemberId(e.target.value)}
                      className="w-full px-4 py-3.5 bg-white dark:bg-slate-800 border-none rounded-xl ring-1 ring-gray-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500 font-medium shadow-sm"
                    >
                      <option value="">👤 Anonyme / Non spécifié...</option>
                      {mutualMembers.map((m: any) => (
                        <option key={m.member_id} value={m.member_id}>
                          {m.members.first_name} {m.members.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <button 
                  disabled={isSubmittingTx}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-8 py-3.5 rounded-xl transition-all disabled:bg-yellow-300 dark:disabled:bg-yellow-900/50 shadow-lg shadow-yellow-500/30 flex items-center gap-2"
                >
                  {isSubmittingTx ? (
                    <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Enregistrement...</>
                  ) : (
                    <>💾 Enregistrer l'opération</>
                  )}
                </button>
              </div>
            </form>

            {transactions.length > 0 && (
              <div className="mb-10 p-6 bg-gray-50/50 dark:bg-slate-900/30 rounded-3xl border border-gray-100 dark:border-slate-700/50">
                <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">📊 Bilan Financier</h3>
                <MutuelleCharts transactions={transactions} />
              </div>
            )}

            {/* Filtres Historique */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
              <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">📜 Historique</h3>
              <div className="flex flex-wrap gap-2">
                <select 
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="px-4 py-2 bg-gray-50 dark:bg-slate-900 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Tous les flux</option>
                  <option value="contribution">Cotisations</option>
                  <option value="expense">Dépenses</option>
                </select>
                <select 
                  value={filterMotive}
                  onChange={e => setFilterMotive(e.target.value)}
                  className="px-4 py-2 bg-gray-50 dark:bg-slate-900 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Tous les motifs</option>
                  <option value="Mutuelle">Mutuelle Ordinaire</option>
                  <option value="Cotisation activité église">Activité Église</option>
                  <option value="Cotisation exceptionnelle">Cotisation Exceptionnelle</option>
                  <option value="Assistance sociale">Assistance Sociale</option>
                  <option value="Frais de fonctionnement">Fonctionnement</option>
                  <option value="Autres">Autres</option>
                </select>
                <select 
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                  className="px-4 py-2 bg-gray-50 dark:bg-slate-900 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Tous les mois</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('fr', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Table des transactions */}
            <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm">
              <table className="w-full text-left border-collapse bg-white dark:bg-slate-800">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-900/80 border-b dark:border-slate-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Membre / Libellé</th>
                    <th className="py-4 px-6">Motif</th>
                    <th className="py-4 px-6 text-right">Montant</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500 bg-gray-50/30 dark:bg-slate-900/20">
                        <span className="text-4xl mb-3 block opacity-30">📭</span>
                        <p className="font-medium">{transactions.length === 0 ? "Aucune transaction pour le moment" : "Aucun résultat pour ces filtres"}</p>
                      </td>
                    </tr>
                  ) : filteredTransactions.map((t: any) => (
                    <tr key={t.id} className="border-b dark:border-slate-700/30 last:border-0 hover:bg-gray-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                      <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-medium">
                        {format(new Date(t.created_at), 'dd MMM yyyy', { locale: fr })}
                        <span className="block text-xs text-gray-400">{format(new Date(t.created_at), 'HH:mm', { locale: fr })}</span>
                      </td>
                      <td className="py-4 px-6">
                        {t.members ? (
                          <div className="flex items-center gap-3">
                            <OptimizedAvatar src={t.members.photo_url} alt={t.members.first_name} fallbackInitials={t.members.first_name} size={32} />
                            <span className="font-bold text-gray-900 dark:text-white">{t.members.first_name} {t.members.last_name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-400 text-xs">An.</div>
                            <span className="font-medium text-gray-500 italic">Anonyme</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-lg">
                          {t.motive}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className={`inline-flex items-center gap-1 font-black text-base px-3 py-1 rounded-xl ${t.type === 'contribution' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                          {t.type === 'contribution' ? '+' : '-'}{Number(t.amount).toLocaleString()} FCFA
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button 
                          onClick={async () => {
                            if (confirm('Voulez-vous vraiment supprimer cette transaction ? Cette action est irréversible.')) {
                              const res = await removeMutualTransaction(t.id)
                              if (res.success) toast.success('Transaction supprimée')
                              else toast.error('Erreur lors de la suppression')
                            }
                          }}
                          className="text-red-400 hover:text-white hover:bg-red-500 bg-red-50 dark:bg-red-500/10 p-2.5 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-sm"
                          title="Supprimer la transaction"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 animate-fade-in">
            {/* Section Ajout de membres */}
            <div className="mb-12 p-8 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900/80 dark:to-slate-900 rounded-3xl border border-indigo-100/60 dark:border-slate-700/60 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-2xl">🤝</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Inscrire des membres</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Recherchez et ajoutez des fidèles à la mutuelle.</p>
                </div>
              </div>
              
              <div className="relative mb-6 max-w-2xl">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Rechercher par nom..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-slate-700 focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white font-medium"
                />
                
                {searchQuery.trim() !== '' && (
                  <div className="absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl max-h-72 overflow-y-auto">
                    {filteredNonMutualMembers.filter((m: any) => !selectedNewMemberIds.includes(m.id)).length === 0 ? (
                      <div className="p-6 text-sm font-medium text-gray-500 text-center flex flex-col items-center">
                        <span className="text-3xl mb-2 opacity-50">👻</span>
                        Aucun membre trouvé ou tous déjà sélectionnés.
                      </div>
                    ) : (
                      filteredNonMutualMembers.filter((m: any) => !selectedNewMemberIds.includes(m.id)).map((m: any) => (
                        <div 
                          key={m.id}
                          onClick={() => {
                            toggleMemberSelection(m.id)
                            setSearchQuery('')
                          }}
                          className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-gray-50 dark:border-gray-700/50 last:border-0 transition-colors"
                        >
                          <OptimizedAvatar src={m.photo_url} alt={m.first_name} fallbackInitials={m.first_name} size={40} />
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{m.first_name} {m.last_name}</span>
                          <span className="ml-auto text-primary-500 font-black">+</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              <form onSubmit={handleAddMembers}>
                {selectedNewMemberIds.length > 0 && (
                  <div className="mb-8 p-6 bg-white dark:bg-slate-800/80 rounded-2xl border border-indigo-50 dark:border-slate-700/50 shadow-inner">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Sélection actuelle ({selectedNewMemberIds.length})</h4>
                    <div className="flex flex-wrap gap-3">
                      {selectedNewMemberIds.map(id => {
                        const member = nonMutualMembers.find((m: any) => m.id === id)
                        if (!member) return null
                        return (
                          <div key={id} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded-full py-1.5 pl-1.5 pr-4 shadow-sm group">
                            <OptimizedAvatar src={member.photo_url} alt={member.first_name} fallbackInitials={member.first_name} size={28} />
                            <span className="text-sm font-bold dark:text-gray-200">{member.first_name} {member.last_name}</span>
                            <button 
                              type="button"
                              onClick={() => toggleMemberSelection(id)}
                              className="ml-2 w-5 h-5 flex items-center justify-center bg-gray-200 dark:bg-gray-600 group-hover:bg-red-500 text-gray-500 group-hover:text-white rounded-full transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <button 
                    disabled={isSubmittingMember || selectedNewMemberIds.length === 0}
                    type="submit"
                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-3.5 rounded-xl transition-all disabled:bg-gray-300 dark:disabled:bg-slate-700 dark:disabled:text-gray-500 shadow-lg shadow-primary-500/20 disabled:shadow-none text-sm"
                  >
                    {isSubmittingMember ? 'Validation...' : `Valider l'inscription (${selectedNewMemberIds.length})`}
                  </button>
                </div>
              </form>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">📑 Registre des Membres</h3>
              <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 px-4 py-1.5 rounded-full text-sm font-bold">
                Total: {mutualMembers.length}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {mutualMembers.length === 0 ? (
                <div className="col-span-full py-16 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 text-gray-500">
                  <span className="text-5xl mb-4 opacity-50">🏜️</span>
                  <p className="font-bold text-lg">Aucun membre n'est encore inscrit.</p>
                  <p className="text-sm">Utilisez le formulaire ci-dessus pour ajouter des fidèles.</p>
                </div>
              ) : mutualMembers.map((m: any) => (
                <div key={m.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-700/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center relative group">
                  
                  {/* Delete Button (Hover) */}
                  <button
                    onClick={() => handleRemoveMember(m.id, `${m.members?.first_name} ${m.members?.last_name}`)}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-red-500 text-gray-400 hover:text-white dark:bg-slate-800 rounded-full opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 shadow-sm"
                    title="Désinscrire ce membre"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>

                  <div className="mb-4 relative">
                    <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full"></div>
                    <OptimizedAvatar src={m.members.photo_url} alt={m.members.first_name} fallbackInitials={m.members.first_name} size={80} className="border-4 border-white dark:border-slate-800 shadow-md relative z-10" />
                  </div>
                  
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-1">
                    {m.members?.first_name} {m.members?.last_name}
                  </h4>
                  
                  <p className="text-xs text-gray-500 font-medium mb-5 bg-gray-50 dark:bg-slate-800 px-3 py-1 rounded-full">
                    Inscrit(e) le {format(new Date(m.joined_at), 'dd MMM yyyy', { locale: fr })}
                  </p>
                  
                  <div className="mt-auto w-full pt-4 border-t border-gray-100 dark:border-slate-700/50">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block mb-1">Total Cotisé</span>
                    <span className="text-xl font-black text-green-600 dark:text-green-400">
                      {Number(m.totalContributed || 0).toLocaleString()} <span className="text-xs">FCFA</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
