'use client'

import { useState, useEffect } from 'react'
import { getActiveCheckins, checkOutKid, getAllKids, checkInKid, addKid, getChurchServices } from '@/app/actions/kids'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { ShieldCheck, UserPlus, LogIn, LogOut, Search, QrCode, ArrowRight } from 'lucide-react'

export default function KidsClient({ currentMember }: { currentMember: any }) {
  const [activeTab, setActiveTab] = useState<'checkin' | 'checkout' | 'manage'>('checkin')
  
  // Data states
  const [kids, setKids] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [activeCheckins, setActiveCheckins] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Form states
  const [selectedKid, setSelectedKid] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [securityCodeInput, setSecurityCodeInput] = useState('')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [kidsData, servicesData, checkinsData] = await Promise.all([
        getAllKids(),
        getChurchServices(),
        getActiveCheckins()
      ])
      setKids(kidsData)
      
      // Filter out past services conceptually, but for now just use all or recent
      setServices(servicesData)
      setActiveCheckins(checkinsData)
      
      if (servicesData.length > 0) setSelectedService(servicesData[0].id)
    } catch (err: any) {
      toast.error("Erreur de chargement des données")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedKid || !selectedService) return toast.error("Sélectionnez un enfant et un culte")
    
    try {
      const res = await checkInKid(selectedKid, selectedService, currentMember.id)
      toast.success("Pointage réussi !")
      setGeneratedCode(res.security_code)
      fetchData() // Refresh list
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleCheckOut = async (checkinId: string) => {
    if (!securityCodeInput || securityCodeInput.length !== 4) return toast.error("Entrez le code à 4 caractères")
    
    try {
      await checkOutKid(checkinId, securityCodeInput, currentMember.id)
      toast.success("Départ validé avec succès !")
      setSecurityCodeInput('')
      fetchData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => { setActiveTab('checkin'); setGeneratedCode(null) }}
          className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${
            activeTab === 'checkin' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <LogIn size={16} /> Arrivées
        </button>
        <button
          onClick={() => setActiveTab('checkout')}
          className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${
            activeTab === 'checkout' ? 'bg-white dark:bg-slate-700 shadow text-amber-600 dark:text-amber-400' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <LogOut size={16} /> Départs
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${
            activeTab === 'manage' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserPlus size={16} /> Base de données
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          
          {/* CHECK-IN TAB */}
          {activeTab === 'checkin' && (
            <div className="p-6 md:p-8">
              {generatedCode ? (
                <div className="text-center space-y-6 py-8 animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <ShieldCheck size={40} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">Pointage Confirmé</h2>
                    <p className="text-gray-500">L'enfant a été enregistré. Conservez ce code de sécurité pour le retrait.</p>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 max-w-sm mx-auto flex flex-col items-center">
                    <span className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-2">Code de Sécurité</span>
                    <span className="text-6xl font-black tracking-widest text-indigo-600 dark:text-indigo-400">{generatedCode}</span>
                    
                    <div className="mt-6 p-2 bg-white rounded-xl">
                      <QRCodeSVG value={generatedCode} size={150} />
                    </div>
                  </div>
                  
                  <button onClick={() => setGeneratedCode(null)} className="btn-secondary px-8">
                    Nouveau Pointage
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCheckIn} className="max-w-md mx-auto space-y-6 py-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Culte / Événement</label>
                      <select 
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value)}
                        className="w-full input-field"
                        required
                      >
                        {services.map(s => (
                          <option key={s.id} value={s.id}>{s.title} ({new Date(s.date).toLocaleDateString()})</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Rechercher l'enfant</label>
                      <select 
                        value={selectedKid}
                        onChange={(e) => setSelectedKid(e.target.value)}
                        className="w-full input-field"
                        required
                      >
                        <option value="">-- Sélectionner un enfant --</option>
                        {kids.map(k => (
                          <option key={k.id} value={k.id}>{k.first_name} {k.last_name} (Parent: {k.parent?.first_name})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="w-full btn-primary py-3 text-lg flex items-center justify-center gap-2">
                    <QrCode size={20} />
                    Générer Code de Sécurité
                  </button>
                </form>
              )}
            </div>
          )}

          {/* CHECK-OUT TAB */}
          {activeTab === 'checkout' && (
            <div className="p-0">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-6 border-b border-amber-100 dark:border-amber-900/30 flex items-center gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-300 rounded-xl">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 dark:text-amber-100 text-lg">Retrait Sécurisé</h3>
                  <p className="text-amber-700 dark:text-amber-300/70 text-sm">Le code de sécurité est strictement obligatoire pour autoriser le départ d'un enfant.</p>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {activeCheckins.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">Aucun enfant actuellement à l'Écodim.</div>
                ) : (
                  activeCheckins.map(checkin => (
                    <div key={checkin.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xl font-bold">{checkin.kid.first_name} {checkin.kid.last_name}</h4>
                        <p className="text-sm text-gray-500">Parent: {checkin.kid.parent?.first_name} {checkin.kid.parent?.last_name} • {checkin.kid.parent?.phone}</p>
                        {checkin.kid.allergies && (
                          <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-md uppercase">
                            ⚠️ Allergies: {checkin.kid.allergies}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <input 
                          type="text" 
                          placeholder="CODE"
                          maxLength={4}
                          className="w-24 text-center text-xl font-black tracking-widest uppercase input-field py-2"
                          onChange={(e) => setSecurityCodeInput(e.target.value)}
                        />
                        <button 
                          onClick={() => handleCheckOut(checkin.id)}
                          className="btn-primary whitespace-nowrap bg-amber-500 hover:bg-amber-600 flex items-center gap-2"
                        >
                          Valider Départ
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* MANAGE TAB */}
          {activeTab === 'manage' && (
            <div className="p-6">
               <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                 <UserPlus size={20} className="text-emerald-500" />
                 Base de données Enfants
               </h3>
               
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-sm">
                       <th className="p-3 rounded-l-lg">Nom de l'enfant</th>
                       <th className="p-3">Parent Référent</th>
                       <th className="p-3">Infos Médicales</th>
                       <th className="p-3 rounded-r-lg">Date d'enregistrement</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                     {kids.map(k => (
                       <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                         <td className="p-3 font-semibold">{k.first_name} {k.last_name}</td>
                         <td className="p-3 text-sm">{k.parent?.first_name} {k.parent?.last_name}</td>
                         <td className="p-3 text-sm">
                           {k.allergies ? <span className="text-red-500 font-medium">⚠️ {k.allergies}</span> : <span className="text-gray-400">Aucune</span>}
                         </td>
                         <td className="p-3 text-sm text-gray-500">{new Date(k.created_at).toLocaleDateString()}</td>
                       </tr>
                     ))}
                     {kids.length === 0 && (
                       <tr>
                         <td colSpan={4} className="p-8 text-center text-gray-500">Aucun enfant enregistré. (Fonctionnalité d'ajout à venir via le profil parent).</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
