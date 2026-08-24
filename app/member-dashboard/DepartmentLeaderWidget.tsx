'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface DepartmentLeaderWidgetProps {
  departments: any[]
}

export default function DepartmentLeaderWidget({ departments }: DepartmentLeaderWidgetProps) {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchDepartmentMembers() {
      // Pour cet MVP, on charge tous les membres de l'église, puis on filtre côté client sur le champ "functions".
      // L'approche optimale en BDD relationnelle serait une table `department_members`, mais on s'adapte à la structure existante (champ functions JSONB).
      const { data } = await supabase.from('members').select('id, first_name, last_name, phone, functions, photo_url')
      
      if (data) {
        // Filtrer les membres qui ont le nom du département dans leurs fonctions
        const deptNames = departments.map(d => d.name)
        const deptMembers = data.filter(m => {
          if (!m.functions || !Array.isArray(m.functions)) return false
          return m.functions.some((f: string) => deptNames.includes(f))
        })
        setMembers(deptMembers)
      }
      setLoading(false)
    }
    
    fetchDepartmentMembers()
  }, [departments, supabase])

  return (
    <div className="space-y-6">
      {departments.map(dept => (
        <div key={dept.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border-t-4 border-gold-500 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            👑 Responsable : {dept.name}
          </h2>
          <p className="text-sm text-gray-500 mb-6">{dept.description}</p>
          
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Membres de votre département ({members.length})</h3>
          
          {loading ? (
            <p className="text-sm text-gray-500 animate-pulse">Chargement des membres...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/10 p-3 rounded">
              Aucun membre trouvé pour ce département. Demandez au pasteur d'ajouter "{dept.name}" dans les fonctions des membres.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-4 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center text-gold-600 font-bold overflow-hidden">
                    {m.photo_url ? <img src={m.photo_url} alt="" className="w-full h-full object-cover" /> : m.first_name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{m.first_name} {m.last_name}</p>
                    <p className="text-xs text-gray-500">{m.phone || 'Pas de numéro'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
