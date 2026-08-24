'use client'

import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface GrowthChartProps {
  dates: string[] // Array of created_at ISO strings
}

export default function GrowthChart({ dates }: GrowthChartProps) {
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')

  const chartData = useMemo(() => {
    if (!dates || dates.length === 0) return []

    // Sort dates ascending
    const sorted = [...dates].map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime())
    
    const dataMap = new Map<string, number>()
    let cumulative = 0

    sorted.forEach(date => {
      cumulative++
      let key = ''
      if (viewMode === 'month') {
        // Format: YYYY-MM
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        key = `${year}-${month}`
      } else {
        // Format: YYYY
        key = date.getFullYear().toString()
      }
      
      // We always overwrite with the latest cumulative count for that period
      dataMap.set(key, cumulative)
    })

    // Fill in gaps (e.g., months with 0 new members should carry over the previous cumulative total)
    // For simplicity, we just convert the map to an array. 
    // To make a beautiful curve, we map keys to readable labels.
    const result = Array.from(dataMap.entries()).map(([key, count]) => {
      let label = key
      if (viewMode === 'month') {
        const [y, m] = key.split('-')
        const d = new Date(parseInt(y), parseInt(m) - 1, 1)
        label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      }
      return { label, count }
    })

    return result
  }, [dates, viewMode])

  if (dates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
        <span className="text-4xl mb-2">📈</span>
        <p>Pas assez de données pour afficher une courbe.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold font-serif text-primary-900 dark:text-gold-400">Croissance des Membres</h3>
          <p className="text-sm text-gray-500">Évolution de l'effectif de votre église</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'month' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-700 dark:text-gold-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Par Mois
          </button>
          <button
            onClick={() => setViewMode('year')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'year' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-700 dark:text-gold-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Par Année
          </button>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-slate-700" />
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: '#fff', color: '#111827' }}
              itemStyle={{ color: '#1E3A8A', fontWeight: 'bold' }}
              formatter={(value: any) => [`${value} Membres`, 'Total']}
              labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
            />
            <Area 
              type="monotone" 
              dataKey="count" 
              stroke="#1E3A8A" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorCount)" 
              activeDot={{ r: 6, strokeWidth: 0, fill: '#D4AF37' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
