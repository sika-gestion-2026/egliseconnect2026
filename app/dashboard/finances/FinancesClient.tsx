'use client'

import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { addTransaction, deleteTransaction } from '@/app/actions/finances'
import toast from 'react-hot-toast'
import { PlusCircle, ArrowUpRight, ArrowDownRight, Wallet, Calendar as CalendarIcon, Trash2, Search, Filter } from 'lucide-react'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  motif: string
  date: string
  created_at: string
  created_by_user?: { email: string }
}

export default function FinancesClient({ initialData }: { initialData: Transaction[] }) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialData)
  const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'expense'>('overview')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Calculate balance
  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, curr) => {
        if (curr.type === 'income') {
          acc.income += Number(curr.amount)
          acc.balance += Number(curr.amount)
        } else {
          acc.expense += Number(curr.amount)
          acc.balance -= Number(curr.amount)
        }
        return acc
      },
      { income: 0, expense: 0, balance: 0 }
    )
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => (activeTab === 'overview' ? true : t.type === activeTab))
      .filter((t) => 
        t.motif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchTerm.toLowerCase())
      )
  }, [transactions, activeTab, searchTerm])

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    
    // Convert local datetime to ISO for DB
    const dateVal = formData.get('date') as string
    if (dateVal) {
      formData.set('date', new Date(dateVal).toISOString())
    }

    try {
      const res = await addTransaction(formData)
      if (res.success) {
        toast.success(transactionType === 'income' ? 'Entrée enregistrée !' : 'Dépense enregistrée !')
        setIsModalOpen(false)
        // Refresh page to get updated data
        window.location.reload()
      } else {
        toast.error(res.error || 'Erreur lors de l\'enregistrement')
      }
    } catch (error) {
      toast.error('Une erreur inattendue s\'est produite')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) return
    
    const toastId = toast.loading('Suppression en cours...')
    try {
      const res = await deleteTransaction(id)
      if (res.success) {
        toast.success('Transaction supprimée', { id: toastId })
        setTransactions(transactions.filter(t => t.id !== id))
      } else {
        toast.error(res.error || 'Erreur lors de la suppression', { id: toastId })
      }
    } catch (err) {
      toast.error('Erreur inattendue', { id: toastId })
    }
  }

  return (
    <div>
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet className="w-32 h-32 -mt-4 -mr-4 text-primary-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Solde en caisse</p>
          <h3 className="text-4xl font-bold text-gray-900 dark:text-white">
            {totals.balance.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
          </h3>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowUpRight className="w-32 h-32 -mt-4 -mr-4 text-green-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total des Entrées</p>
          <h3 className="text-3xl font-bold text-green-600 dark:text-green-400">
            {totals.income.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowDownRight className="w-32 h-32 -mt-4 -mr-4 text-red-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total des Dépenses</p>
          <h3 className="text-3xl font-bold text-red-600 dark:text-red-400">
            {totals.expense.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
          </h3>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-gray-100 dark:bg-slate-900 rounded-lg p-1 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-900 dark:text-gold-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Historique
            </button>
            <button 
              onClick={() => setActiveTab('income')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'income' ? 'bg-white dark:bg-slate-700 shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Entrées
            </button>
            <button 
              onClick={() => setActiveTab('expense')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'expense' ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Sorties
            </button>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Rechercher (Motif...)" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button 
              onClick={() => { setTransactionType('income'); setIsModalOpen(true); }}
              className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
              title="Ajouter une entrée"
            >
              <ArrowUpRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => { setTransactionType('expense'); setIsModalOpen(true); }}
              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
              title="Ajouter une dépense"
            >
              <ArrowDownRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-slate-750/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                <th className="px-6 py-4 font-semibold border-b dark:border-slate-700">Date & Heure</th>
                <th className="px-6 py-4 font-semibold border-b dark:border-slate-700">Type</th>
                <th className="px-6 py-4 font-semibold border-b dark:border-slate-700">Catégorie</th>
                <th className="px-6 py-4 font-semibold border-b dark:border-slate-700">Motif</th>
                <th className="px-6 py-4 font-semibold border-b dark:border-slate-700 text-right">Montant</th>
                <th className="px-6 py-4 font-semibold border-b dark:border-slate-700"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Aucune transaction trouvée.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-750/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">
                          {format(parseISO(trx.date), 'dd MMM yyyy, HH:mm', { locale: fr })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {trx.type === 'income' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                          <ArrowUpRight className="w-3 h-3" /> Entrée
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                          <ArrowDownRight className="w-3 h-3" /> Dépense
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {trx.category}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {trx.motif || '-'}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${trx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {trx.type === 'income' ? '+' : '-'}{Number(trx.amount).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(trx.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'ajout */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={`p-4 border-b ${transactionType === 'income' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'}`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 ${transactionType === 'income' ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>
                {transactionType === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                {transactionType === 'income' ? 'Enregistrer une Entrée (Culte)' : 'Enregistrer une Dépense'}
              </h3>
            </div>
            
            <form onSubmit={handleAddTransaction} className="p-6">
              <input type="hidden" name="type" value={transactionType} />
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Montant (FCFA) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">FCFA</span>
                    <input 
                      type="number" 
                      name="amount"
                      step="1" min="1" 
                      required 
                      className="w-full pl-14 pr-4 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" 
                      placeholder="0" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Catégorie <span className="text-red-500">*</span></label>
                  <select name="category" required className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700">
                    {transactionType === 'income' ? (
                      <>
                        <option value="Offrandes">Offrandes du Culte</option>
                        <option value="Dîmes">Dîmes</option>
                        <option value="Dons Spéciaux">Dons Spéciaux</option>
                        <option value="Autre">Autre Entrée</option>
                      </>
                    ) : (
                      <>
                        <option value="Achat Matériel">Achat Matériel</option>
                        <option value="Logistique">Logistique & Transport</option>
                        <option value="Loyer / Factures">Loyer / Factures</option>
                        <option value="Événementiel">Événementiel</option>
                        <option value="Social / Assistance">Social / Assistance</option>
                        <option value="Autre">Autre Dépense</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Motif / Description <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    name="motif" 
                    required 
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" 
                    placeholder={transactionType === 'income' ? 'Ex: Offrande Culte de Dimanche' : 'Ex: Achat chaises pour la salle'} 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Date et Heure</label>
                  <input 
                    type="datetime-local" 
                    name="date" 
                    defaultValue={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                    required 
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" 
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                    transactionType === 'income' 
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400' 
                      : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                  }`}
                >
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
