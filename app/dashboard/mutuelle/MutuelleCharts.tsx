'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Transaction {
  id: string
  type: 'contribution' | 'expense'
  amount: number
  created_at: string
}

export default function MutuelleCharts({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => {
    // Regrouper par mois
    const monthlyData: Record<string, { month: string; Entrées: number; Sorties: number; monthSort: string }> = {}

    transactions.forEach(t => {
      const date = parseISO(t.created_at)
      const monthKey = format(date, 'MMM yyyy', { locale: fr })
      const monthSort = format(date, 'yyyy-MM')

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, Entrées: 0, Sorties: 0, monthSort }
      }

      if (t.type === 'contribution') {
        monthlyData[monthKey].Entrées += Number(t.amount)
      } else {
        monthlyData[monthKey].Sorties += Number(t.amount)
      }
    })

    // Convertir en tableau et trier chronologiquement
    return Object.values(monthlyData).sort((a, b) => a.monthSort.localeCompare(b.monthSort))
  }, [transactions])

  if (transactions.length === 0) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Graphique en Barres: Entrées vs Sorties */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-6 dark:text-white">Bilan Mensuel (Entrées / Sorties)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={value => `${value}`} />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Entrées" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Sorties" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Graphique en Aires: Évolution des Entrées */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-6 dark:text-white">Évolution des Cotisations</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEntrees" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Area type="monotone" dataKey="Entrées" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEntrees)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
