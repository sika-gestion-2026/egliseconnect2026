'use client'

import { useState } from 'react'
import { addMultipleMutualMembers, addMutualTransaction, removeMutualMember, removeMutualTransaction } from '@/app/actions/mutual'
import MutuelleCharts from './MutuelleCharts'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="flex border-b border-gray-100 dark:border-gray-700">
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-4 text-center font-medium ${activeTab === 'transactions' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50 dark:bg-primary-900/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
        >
          Transactions (Cotisations & Dépenses)
        </button>
        <button 
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-4 text-center font-medium ${activeTab === 'members' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50 dark:bg-primary-900/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
        >
          Membres de la Mutuelle
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'transactions' ? (
          <div>
            <form onSubmit={handleAddTransaction} className="mb-8 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">Nouvelle Transaction</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Type</label>
                  <select 
                    value={txType} 
                    onChange={e => setTxType(e.target.value as any)}
                    className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="contribution">Entrée (Cotisation)</option>
                    <option value="expense">Sortie (Dépense)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Montant (FCFA)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    required
                    value={txAmount}
                    onChange={e => setTxAmount(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    placeholder="Ex: 50.00"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">Motif / Raison</label>
                  <select 
                    required
                    value={txMotive}
                    onChange={e => setTxMotive(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="Mutuelle">Mutuelle</option>
                    <option value="Cotisation activité église">Cotisation activité église</option>
                    <option value="Cotisation membres">Cotisation membres</option>
                    <option value="Autres cotisations">Autres cotisations</option>
                  </select>
                </div>
                {txType === 'contribution' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Membre donateur (Optionnel)</label>
                    <select 
                      value={txMemberId} 
                      onChange={e => setTxMemberId(e.target.value)}
                      className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    >
                      <option value="">Sélectionnez un membre de la mutuelle...</option>
                      {mutualMembers.map((m: any) => (
                        <option key={m.member_id} value={m.member_id}>
                          {m.members.first_name} {m.members.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <button 
                disabled={isSubmittingTx}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition disabled:bg-blue-300 shadow-sm"
              >
                {isSubmittingTx ? 'Enregistrement...' : 'Enregistrer la transaction'}
              </button>
            </form>

            {transactions.length > 0 && <MutuelleCharts transactions={transactions} />}

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <h3 className="text-lg font-semibold dark:text-white">Historique des transactions</h3>
              <div className="flex flex-wrap gap-3">
                <select 
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
                >
                  <option value="all">Tous les types</option>
                  <option value="contribution">Cotisations</option>
                  <option value="expense">Dépenses</option>
                </select>
                
                <select 
                  value={filterMotive}
                  onChange={e => setFilterMotive(e.target.value)}
                  className="p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
                >
                  <option value="all">Tous les motifs</option>
                  <option value="Mutuelle">Mutuelle</option>
                  <option value="Cotisation activité église">Cotisation activité église</option>
                  <option value="Cotisation membres">Cotisation membres</option>
                  <option value="Autres cotisations">Autres cotisations</option>
                </select>
                
                <select 
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                  className="p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
                >
                  <option value="all">Tous les mois</option>
                  <option value="1">Janvier</option>
                  <option value="2">Février</option>
                  <option value="3">Mars</option>
                  <option value="4">Avril</option>
                  <option value="5">Mai</option>
                  <option value="6">Juin</option>
                  <option value="7">Juillet</option>
                  <option value="8">Août</option>
                  <option value="9">Septembre</option>
                  <option value="10">Octobre</option>
                  <option value="11">Novembre</option>
                  <option value="12">Décembre</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                    <th className="pb-3 px-4">Date</th>
                    <th className="pb-3 px-4">Type</th>
                    <th className="pb-3 px-4">Motif</th>
                    <th className="pb-3 px-4">Membre</th>
                    <th className="pb-3 px-4 text-right">Montant</th>
                    <th className="pb-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        {transactions.length === 0 ? "Aucune transaction enregistrée" : "Aucune transaction ne correspond à vos filtres"}
                      </td>
                    </tr>
                  ) : filteredTransactions.map((t: any) => (
                    <tr key={t.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4 whitespace-nowrap text-sm dark:text-gray-300">
                        {format(new Date(t.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${t.type === 'contribution' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t.type === 'contribution' ? 'Cotisation' : 'Dépense'}
                        </span>
                      </td>
                      <td className="py-3 px-4 dark:text-gray-200">{t.motive}</td>
                      <td className="py-3 px-4 dark:text-gray-400">
                        {t.members ? `${t.members.first_name} ${t.members.last_name}` : '-'}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${t.type === 'contribution' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {t.type === 'contribution' ? '+' : '-'}{Number(t.amount).toLocaleString()} FCFA
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button 
                          onClick={async () => {
                            if (confirm('Voulez-vous vraiment supprimer cette transaction ? Cette action est irréversible.')) {
                              const res = await removeMutualTransaction(t.id)
                              if (res.success) toast.success('Transaction supprimée')
                              else toast.error('Erreur lors de la suppression')
                            }
                          }}
                          className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors inline-flex items-center justify-center"
                          title="Supprimer la transaction"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">Inscrire des membres</h3>
              <p className="text-sm text-gray-500 mb-4">Recherchez et sélectionnez les membres à ajouter à la mutuelle.</p>
              
              <div className="relative mb-6">
                <input
                  type="text"
                  placeholder="Rechercher un membre par nom..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
                
                {searchQuery.trim() !== '' && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredNonMutualMembers.filter((m: any) => !selectedNewMemberIds.includes(m.id)).length === 0 ? (
                      <div className="p-3 text-sm text-gray-500 text-center">Aucun membre trouvé ou déjà sélectionné.</div>
                    ) : (
                      filteredNonMutualMembers.filter((m: any) => !selectedNewMemberIds.includes(m.id)).map((m: any) => (
                        <div 
                          key={m.id}
                          onClick={() => {
                            toggleMemberSelection(m.id)
                            setSearchQuery('')
                          }}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 font-bold overflow-hidden shrink-0">
                            {m.photo_url ? (
                              <img src={m.photo_url} alt={m.first_name} className="w-full h-full object-cover" />
                            ) : (
                              m.first_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="text-sm font-medium dark:text-gray-200">{m.first_name} {m.last_name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              <form onSubmit={handleAddMembers}>
                {selectedNewMemberIds.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Membres sélectionnés ({selectedNewMemberIds.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedNewMemberIds.map(id => {
                        const member = nonMutualMembers.find((m: any) => m.id === id)
                        if (!member) return null
                        return (
                          <div key={id} className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full py-1 pl-1 pr-3 shadow-sm">
                            <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 text-xs font-bold overflow-hidden">
                              {member.photo_url ? (
                                <img src={member.photo_url} alt={member.first_name} className="w-full h-full object-cover" />
                              ) : (
                                member.first_name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="text-sm font-medium dark:text-gray-200">{member.first_name} {member.last_name}</span>
                            <button 
                              type="button"
                              onClick={() => toggleMemberSelection(id)}
                              className="ml-1 text-gray-400 hover:text-red-500 rounded-full p-0.5 transition"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                  <button 
                    disabled={isSubmittingMember || selectedNewMemberIds.length === 0}
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-xl transition disabled:bg-red-300 dark:disabled:bg-red-900/50 shadow-md text-lg"
                  >
                    {isSubmittingMember ? 'Validation...' : `Valider les membres sélectionnés (${selectedNewMemberIds.length})`}
                  </button>
                </div>
              </form>
            </div>

            <h3 className="text-lg font-semibold mb-4 dark:text-white">Registre des Membres de la Mutuelle</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                    <th className="pb-3 px-4">Membre</th>
                    <th className="pb-3 px-4">Inscrit le</th>
                    <th className="pb-3 px-4 text-right">Total Cotisé</th>
                    <th className="pb-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mutualMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">Aucun membre inscrit dans la mutuelle</td>
                    </tr>
                  ) : mutualMembers.map((m: any) => (
                    <tr key={m.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4 font-medium dark:text-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 font-bold overflow-hidden shrink-0 shadow-sm border border-gray-200 dark:border-gray-700">
                            {m.members?.photo_url ? (
                              <img src={m.members.photo_url} alt={m.members.first_name} className="w-full h-full object-cover" />
                            ) : (
                              m.members?.first_name?.charAt(0).toUpperCase() || '?'
                            )}
                          </div>
                          <span>{m.members?.first_name} {m.members?.last_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(m.joined_at), 'dd MMMM yyyy', { locale: fr })}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-green-600 dark:text-green-400">
                        {m.totalContributed.toLocaleString()} FCFA
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRemoveMember(m.id, `${m.members?.first_name} ${m.members?.last_name}`)}
                          className="text-xs bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 px-3 py-1.5 rounded-lg font-medium transition"
                          title="Retirer ce membre de la mutuelle"
                        >
                          Retirer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
