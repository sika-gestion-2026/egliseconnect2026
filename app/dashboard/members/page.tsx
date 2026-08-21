import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function MembersDirectory() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('user_profiles').select('church_id').eq('id', user?.id).single()

  const { data: members } = await supabase
    .from('members')
    .select('*')
    .eq('church_id', profile?.church_id)
    .order('quartier', { ascending: true })
    .order('last_name', { ascending: true })

  // Grouper les membres par quartier
  const groupedMembers = (members || []).reduce((acc: any, member: any) => {
    const q = member.quartier || 'Non renseigné (Localisation globale)'
    if (!acc[q]) acc[q] = []
    acc[q].push(member)
    return acc
  }, {})

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400">Annuaire des Membres</h1>
        <div className="flex gap-2">
          <a
            href="/api/export-members"
            className="px-4 py-2 bg-white dark:bg-slate-800 text-primary-900 dark:text-white rounded-md font-medium border border-gray-300 dark:border-slate-600 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2 text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Exporter CSV
          </a>
          <Link 
            href="/dashboard/members/new" 
            className="px-4 py-2 bg-primary-900 text-white rounded-md font-medium border border-gold-500 hover:bg-primary-500 transition-colors shadow-sm"
          >
            + Ajouter un membre
          </Link>
        </div>
      </div>

      <div className="space-y-10">
        {Object.keys(groupedMembers).length === 0 ? (
          <div className="py-12 text-center bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-dashed border-gray-300 dark:border-slate-600">
            <p className="text-gray-500 dark:text-gray-400 mb-4">L'annuaire est vide.</p>
            <Link 
              href="/dashboard/members/new"
              className="text-primary-900 dark:text-gold-400 font-medium hover:underline"
            >
              Créer la première fiche membre
            </Link>
          </div>
        ) : (
          Object.keys(groupedMembers).map((quartier) => (
            <div key={quartier}>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-serif text-primary-900 dark:text-gold-400">
                  <svg className="inline w-5 h-5 mr-2 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  Quartier : {quartier}
                </h2>
                <span className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">{groupedMembers[quartier].length} membres</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {groupedMembers[quartier].map((member: any) => (
                  <Link href={`/dashboard/members/${member.id}`} key={member.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-primary-300 transition-all cursor-pointer block">
                    <div className="h-16 bg-primary-900"></div>
                    <div className="relative px-6 pb-6">
                      <div className="w-16 h-16 rounded-full bg-gold-500 flex items-center justify-center text-white text-xl font-serif absolute -top-8 border-4 border-white dark:border-slate-800">
                        {member.first_name?.[0]}{member.last_name?.[0]}
                      </div>
                      
                      {member.needs_support && (
                        <div className="absolute top-2 right-4 flex items-center gap-1 text-xs font-medium text-accent-500 bg-accent-50 dark:bg-accent-900/20 px-2 py-1 rounded-full">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                          Suivi
                        </div>
                      )}
                      
                      <div className="mt-10">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{member.first_name} {member.last_name}</h3>
                        <p className="text-sm text-gray-500 mt-1 capitalize">{member.status}</p>
                        
                        {member.profession && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                            {member.profession}
                          </p>
                        )}
                        {member.commune && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                            {member.commune}
                          </p>
                        )}
                        
                        {member.phone && (
                          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                            <a href={`tel:${member.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center justify-center gap-2 w-full py-2 bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:text-green-400 rounded-md transition-colors text-sm font-medium border border-green-200 dark:border-green-800">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                              Appeler
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
