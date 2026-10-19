'use client'

import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

interface QuartierChartProps {
  members: any[]
}

const COLORS = ['#1E3A8A', '#3B82F6', '#D4AF37', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280']

export default function QuartierChart({ members }: QuartierChartProps) {
  const chartData = useMemo(() => {
    if (!members || members.length === 0) return []
    
    const countMap = new Map<string, number>()
    members.forEach(m => {
      const q = m.quartier ? m.quartier.trim() : 'Non renseigné'
      countMap.set(q, (countMap.get(q) || 0) + 1)
    })

    const data = Array.from(countMap.entries()).map(([name, value]) => ({ name, value }))
    // Sort by highest value first
    data.sort((a, b) => b.value - a.value)
    
    // Only take top 7, group rest in 'Autres'
    if (data.length > 7) {
      const top = data.slice(0, 6)
      const othersValue = data.slice(6).reduce((acc, curr) => acc + curr.value, 0)
      top.push({ name: 'Autres', value: othersValue })
      return top
    }
    
    return data
  }, [members])

  if (chartData.length === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 h-full">
      <div className="mb-6">
        <h3 className="text-xl font-bold font-serif text-primary-900 dark:text-gold-400">Répartition Géographique</h3>
        <p className="text-sm text-gray-500">Membres par quartier/commune</p>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: '#fff', color: '#111827' }}
              itemStyle={{ fontWeight: 'bold' }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
