'use client'

import { useState } from 'react'

interface MutuelleWidgetProps {
  myContribution: number
  totalFund: number
  totalExpenses: number
  recentExpenses: { label: string; amount: number; date: string; description?: string }[]
  isMember: boolean
  currency?: string
}

function formatAmount(n: number, currency = 'FCFA') {
  return n.toLocaleString('fr-FR') + ' ' + currency
}

export default function MutuelleWidget({
  myContribution,
  totalFund,
  totalExpenses,
  recentExpenses,
  isMember,
  currency = 'FCFA',
}: MutuelleWidgetProps) {
  const [showExpenses, setShowExpenses] = useState(false)
  const solde = totalFund - totalExpenses
  const myPercent = totalFund > 0 ? Math.round((myContribution / totalFund) * 100) : 0

  if (!isMember) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border-2 border-dashed border-gray-300 dark:border-slate-600 text-center">
        <div className="text-4xl mb-3">🤝</div>
        <h3 className="font-bold text-gray-600 dark:text-gray-300 text-lg mb-1">Mutuelle de l'Église</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Vous ne faites pas encore partie de la mutuelle de votre église. Contactez votre responsable pour rejoindre.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-indigo-100 dark:border-indigo-900/50">
      {/* Header gradient */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏦</span>
              <h3 className="font-serif font-bold text-xl">Mutuelle de l'Église</h3>
            </div>
            <span className="bg-white/20 backdrop-blur-sm text-xs font-bold px-3 py-1 rounded-full border border-white/30">
              ✅ Membre actif
            </span>
          </div>

          {/* Total solde */}
          <div className="mb-4">
            <p className="text-white/70 text-xs uppercase tracking-widest font-bold mb-1">Solde actuel de la caisse</p>
            <p className="text-4xl font-black tabular-nums">{formatAmount(solde, currency)}</p>
            <p className="text-white/60 text-xs mt-1">
              {formatAmount(totalFund, currency)} collectés — {formatAmount(totalExpenses, currency)} dépensés
            </p>
          </div>

          {/* Progress bar caisse */}
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-1000"
              style={{ width: `${Math.min(100, totalExpenses > 0 ? Math.round((solde / totalFund) * 100) : 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* My contribution card */}
      <div className="bg-white dark:bg-slate-800 p-5 border-b border-indigo-50 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-1">Ma contribution totale</p>
            <p className="text-3xl font-black text-indigo-700 dark:text-indigo-400 tabular-nums">
              {formatAmount(myContribution, currency)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <span className="text-indigo-500 font-bold">{myPercent}%</span> 
              <span>de l'ensemble des cotisations</span>
            </p>
          </div>
          {/* Donut visuel */}
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-100 dark:text-slate-700" />
              <circle 
                cx="18" cy="18" r="15.9" fill="none" 
                stroke="currentColor" strokeWidth="3"
                strokeDasharray={`${myPercent} ${100 - myPercent}`}
                className="text-indigo-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{myPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses section */}
      <div className="bg-white dark:bg-slate-800 p-5">
        <button
          onClick={() => setShowExpenses(!showExpenses)}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${totalExpenses > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-slate-700'}`}>
              <span className="text-lg">💸</span>
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Dépenses de la caisse</p>
              <p className={`text-xl font-black tabular-nums ${totalExpenses > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                {totalExpenses > 0 ? `- ${formatAmount(totalExpenses, currency)}` : 'Aucune dépense'}
              </p>
            </div>
          </div>
          {recentExpenses.length > 0 && (
            <div className={`text-gray-400 transition-transform duration-200 ${showExpenses ? 'rotate-180' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          )}
        </button>

        {/* Expense list */}
        {showExpenses && recentExpenses.length > 0 && (
          <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {recentExpenses.map((exp, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{exp.label}</p>
                  {exp.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{exp.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5" suppressHydrationWarning>
                    {new Date(exp.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span className="font-black text-red-600 dark:text-red-400 text-sm tabular-nums whitespace-nowrap ml-3">
                  - {formatAmount(exp.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        )}

        {recentExpenses.length === 0 && totalExpenses === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 pl-14 italic">La caisse n'a encore jamais été utilisée. 🎉</p>
        )}
      </div>
    </div>
  )
}
