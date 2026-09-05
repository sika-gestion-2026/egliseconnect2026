'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PasswordInput } from './PasswordInput'
import { login, signup } from './actions'
import { memberLoginAction } from '@/app/actions/memberLogin'
import { registerPastorAction } from './registerPastor'

interface SavedProfile {
  first_name: string
  last_name: string
  photo_url: string
  church_logo: string
  role: 'admin' | 'member'
  email?: string
  identifier?: string
  church_code?: string
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorMsgParams = searchParams.get('error')
  
  // Tab state
  const initialSpace = searchParams.get('space') === 'member' ? 'member' : 'admin'
  const [activeTab, setActiveTab] = useState<'admin' | 'member'>(initialSpace)
  const [adminMode, setAdminMode] = useState<'login' | 'register'>('login')
  
  // Form states
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(errorMsgParams)
  const [rememberMe, setRememberMe] = useState(false)
  
  // Saved profile state
  const [savedProfile, setSavedProfile] = useState<SavedProfile | null>(null)
  const [showSavedProfile, setShowSavedProfile] = useState(false)

  // Auto-read profile from cookie (set by server) or localStorage
  useEffect(() => {
    // 1. Try reading from the server-set 'profile_hint' cookie (most reliable)
    const getCookieValue = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    };
    
    const hintCookie = getCookieValue('profile_hint');
    if (hintCookie) {
      try {
        const profile = JSON.parse(atob(hintCookie)) as SavedProfile;
        setSavedProfile(profile);
        setShowSavedProfile(true);
        // Sync to localStorage too
        localStorage.setItem('rememberedProfile', JSON.stringify(profile));
        return;
      } catch (e) {}
    }
    
    // 2. Fallback to localStorage
    const stored = localStorage.getItem('rememberedProfile');
    if (stored) {
      try {
        const profile = JSON.parse(stored) as SavedProfile;
        setSavedProfile(profile);
        setShowSavedProfile(true);
      } catch (e) {
        localStorage.removeItem('rememberedProfile');
      }
    }
  }, [])

  // Admin login handler
  const handleAdminSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    
    const res = await login(formData)
    
    if (res.error) {
      setErrorMsg(res.error)
      setLoading(false)
    } else if (res.success && res.redirectUrl) {
      // Always save the profile for quick reconnect
      if (res.profile) {
        const p: SavedProfile = {
          first_name: res.profile.first_name,
          last_name: res.profile.last_name,
          photo_url: res.profile.photo_url,
          church_logo: res.profile.church_logo,
          role: 'admin',
          email: email
        }
        localStorage.setItem('rememberedProfile', JSON.stringify(p))
      }
      window.location.href = res.redirectUrl
    }
  }

  // Admin register handler
  const handleAdminRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    
    const formData = new FormData(e.currentTarget)
    const res = await registerPastorAction(formData)
    
    if (res.error) {
      setErrorMsg(res.error)
      setLoading(false)
    } else if (res.success && res.redirectUrl) {
      // Pas de profil enregistré automatiquement à la première connexion, ou on pourrait.
      window.location.href = res.redirectUrl
    }
  }

  // Member login handler
  const handleMemberSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    
    const formData = new FormData(e.currentTarget)
    const identifier = formData.get('identifier') as string
    const church_code = formData.get('church_code') as string
    
    const res = await memberLoginAction(formData)
    
    if (res.error) {
      setErrorMsg(res.error)
      setLoading(false)
    } else if (res.success && res.profile) {
      // Always save profile for quick reconnect (no checkbox required)
      const p: SavedProfile = {
        first_name: res.profile.first_name,
        last_name: res.profile.last_name,
        photo_url: res.profile.photo_url,
        church_logo: res.profile.church_logo,
        role: 'member',
        identifier: identifier,
        church_code: church_code
      }
      localStorage.setItem('rememberedProfile', JSON.stringify(p))
      window.location.href = '/member-dashboard'
    }
  }
  
  // Handle clicking on the saved profile card
  const handleSavedProfileClick = () => {
    if (!savedProfile) return
    
    setActiveTab(savedProfile.role)
    setShowSavedProfile(false)
    
    // Si c'est un membre, on essaie de le reconnecter immédiatement si on a ses infos
    if (savedProfile.role === 'member' && savedProfile.identifier && savedProfile.church_code) {
       setLoading(true)
       const fd = new FormData()
       fd.append('identifier', savedProfile.identifier)
       fd.append('church_code', savedProfile.church_code)
       
       memberLoginAction(fd).then(res => {
          if (res.error) {
            setErrorMsg(res.error)
            setLoading(false)
          } else {
            window.location.href = '/member-dashboard'
          }
       })
    }
  }

  const handleDifferentAccount = () => {
    setShowSavedProfile(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] p-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800">
        
        {/* Header (Top banner) */}
        <div className="bg-primary-900 p-8 text-center relative overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gold-500/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-500/30 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2"></div>
          
          {showSavedProfile && savedProfile?.church_logo ? (
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-2 border-gold-500 shadow-xl overflow-hidden relative z-10">
              <img src={savedProfile.church_logo} alt="Logo Église" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-2 border-gold-500 shadow-xl overflow-hidden relative z-10">
              <img src="/logo.png" alt="Église Connect" className="w-full h-full object-cover" />
            </div>
          )}

          <h1 className="text-4xl font-serif text-white mt-4 relative z-10 font-bold tracking-wide">
            Église Connect
          </h1>
          <p className="mt-2 text-sm font-bold text-gold-400 uppercase tracking-widest relative z-10 bg-black/20 px-3 py-1 rounded-full border border-gold-500/30 shadow-inner">
            Portail de Connexion
          </p>
        </div>
        
        <div className="p-8">
          
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-800 shadow-sm text-center font-bold flex items-center gap-2 justify-center animate-pulse">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              {errorMsg}
            </div>
          )}

          {/* Carte Reconnexion Rapide — Style Premium */}
          {showSavedProfile && savedProfile ? (
            <div className="flex flex-col items-center space-y-5 animate-in fade-in zoom-in-95 duration-500">
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-gold-600 dark:text-gold-400 mb-1">Bon retour parmi nous ✨</p>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Votre session est sauvegardée</h2>
              </div>
              
              <button 
                onClick={handleSavedProfileClick}
                disabled={loading}
                className="group relative flex flex-col items-center p-7 bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 rounded-3xl border-2 border-gray-100 dark:border-slate-700 hover:border-gold-400 dark:hover:border-gold-500 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1.5 w-full overflow-hidden"
              >
                {/* Shimmer background on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                
                <div className="relative">
                  {/* Pulsing ring behind avatar */}
                  {!loading && (
                    <div className="absolute inset-0 rounded-full bg-gold-400/20 animate-ping" style={{ animationDuration: '2.5s' }} />
                  )}
                  
                  {savedProfile.photo_url ? (
                    <img 
                      src={savedProfile.photo_url} 
                      alt={savedProfile.first_name} 
                      className="relative w-28 h-28 rounded-full object-cover object-top border-4 border-white dark:border-slate-700 shadow-xl group-hover:border-gold-400 transition-colors duration-300"
                    />
                  ) : (
                    <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/50 dark:to-primary-800/40 border-4 border-white dark:border-slate-700 flex items-center justify-center text-primary-900 dark:text-gold-400 text-4xl font-bold shadow-xl">
                      {savedProfile.first_name?.[0] || 'U'}
                    </div>
                  )}
                  
                  {savedProfile.church_logo && (
                    <img 
                      src={savedProfile.church_logo} 
                      alt="Logo Église" 
                      className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 bg-white object-cover shadow-md" 
                    />
                  )}
                </div>
                
                <h3 className="mt-5 text-2xl font-serif font-bold text-gray-900 dark:text-white">
                  {savedProfile.first_name} {savedProfile.last_name}
                </h3>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 font-medium">
                  {savedProfile.role === 'admin' ? '🛡️ Pasteur / Administrateur' : '⛪ Espace Fidèle'}
                </p>
                
                <div className="mt-5 w-full flex items-center justify-center gap-3 py-3.5 bg-primary-900 group-hover:bg-primary-800 text-white rounded-2xl font-bold transition-colors duration-300 shadow-md">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                      Continuer en tant que {savedProfile.first_name}
                    </>
                  )}
                </div>
              </button>
              
              <button 
                onClick={handleDifferentAccount} 
                className="text-sm font-medium text-gray-400 hover:text-primary-900 dark:hover:text-gold-400 transition-colors flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Utiliser un autre compte
              </button>
            </div>
          ) : (
            
            /* Formulaire classique avec onglets */
            <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
              
              {/* Onglets */}
              <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl mb-8 relative">
                <button 
                  type="button"
                  onClick={() => setActiveTab('member')}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all z-10 ${activeTab === 'member' ? 'text-primary-900 dark:text-gold-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                  ⛪ Espace Fidèle
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('admin')}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all z-10 ${activeTab === 'admin' ? 'text-primary-900 dark:text-gold-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                  🛡️ Pasteur / Admin
                </button>
                {/* L'arrière-plan glissant (Slider) */}
                <div 
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 rounded-lg shadow transition-transform duration-300 ease-in-out ${activeTab === 'admin' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`} 
                />
              </div>

              {/* Formulaire Admin */}
              {activeTab === 'admin' && (
                <div className="space-y-4">
                  {/* Sous-onglets Connexion / Inscription */}
                  <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                    <button 
                      type="button"
                      onClick={() => setAdminMode('login')}
                      className={`pb-2 px-4 text-sm font-bold transition-all ${adminMode === 'login' ? 'border-b-2 border-gold-500 text-gold-600 dark:text-gold-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                      Connexion
                    </button>
                    <button 
                      type="button"
                      onClick={() => setAdminMode('register')}
                      className={`pb-2 px-4 text-sm font-bold transition-all ${adminMode === 'register' ? 'border-b-2 border-gold-500 text-gold-600 dark:text-gold-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                      Première connexion (Activer mon compte)
                    </button>
                  </div>

                  {adminMode === 'login' ? (
                    <form className="space-y-5 animate-in fade-in slide-in-from-left-4" onSubmit={handleAdminSubmit}>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Adresse Email
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          defaultValue={savedProfile?.email || ''}
                          className="w-full px-4 py-3 mt-1 border rounded-xl border-gray-300 dark:border-gray-700 dark:bg-slate-800 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all outline-none"
                          placeholder="votre@email.com"
                        />
                      </div>
                      
                      <PasswordInput />
                      
                      <div className="flex items-center mt-4">
                        <input 
                          id="remember-admin" 
                          type="checkbox" 
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 text-primary-900 border-gray-300 rounded focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600" 
                        />
                        <label htmlFor="remember-admin" className="ml-2 block text-sm text-gray-700 dark:text-gray-300 font-medium">
                          Se souvenir de mon profil
                        </label>
                      </div>

                      <div className="flex flex-col gap-3 pt-4">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full px-4 py-3 text-white bg-primary-900 rounded-xl hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-900 shadow-lg hover:shadow-xl font-bold transition-all text-lg disabled:opacity-50 disabled:scale-100 active:scale-95"
                        >
                          {loading ? 'Connexion en cours...' : 'Se connecter'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form className="space-y-5 animate-in fade-in slide-in-from-right-4" onSubmit={handleAdminRegister}>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-sm mb-4 border border-blue-200 dark:border-blue-800/50">
                        Saisissez l'adresse email qui vous a été assignée par l'administrateur système pour activer votre espace Pasteur.
                      </div>
                      
                      <div>
                        <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                          Adresse Email assignée
                        </label>
                        <input
                          id="reg-email"
                          name="email"
                          type="email"
                          required
                          className="w-full px-4 py-3 mt-1 border rounded-xl border-gray-300 dark:border-gray-700 dark:bg-slate-800 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all outline-none"
                          placeholder="votre@email.com"
                        />
                      </div>
                      
                      <PasswordInput 
                        id="reg-password"
                        name="password"
                        label="Créer votre mot de passe"
                        placeholder="Au moins 6 caractères"
                        minLength={6}
                      />

                      <div className="flex flex-col gap-3 pt-4">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full px-4 py-3 text-white bg-gold-600 rounded-xl hover:bg-gold-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-600 shadow-lg hover:shadow-xl font-bold transition-all text-lg disabled:opacity-50 disabled:scale-100 active:scale-95"
                        >
                          {loading ? 'Activation en cours...' : 'Activer mon compte'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Formulaire Membre */}
              {activeTab === 'member' && (
                <form className="space-y-5" onSubmit={handleMemberSubmit}>
                  <div>
                    <label htmlFor="church_code" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Code de l'Église
                    </label>
                    <input
                      id="church_code"
                      name="church_code"
                      type="text"
                      required
                      defaultValue={savedProfile?.church_code || ''}
                      className="w-full px-4 py-3 mt-1 border rounded-xl border-gray-300 dark:border-gray-700 dark:bg-slate-800 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all outline-none"
                      placeholder="Ex: EGLISE225"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Téléphone ou Email
                    </label>
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      required
                      defaultValue={savedProfile?.identifier || ''}
                      className="w-full px-4 py-3 mt-1 border rounded-xl border-gray-300 dark:border-gray-700 dark:bg-slate-800 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all outline-none"
                      placeholder="Votre numéro ou adresse email"
                    />
                  </div>
                  
                  <div className="flex items-center mt-4">
                    <input 
                      id="remember-member" 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-primary-900 border-gray-300 rounded focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600" 
                    />
                    <label htmlFor="remember-member" className="ml-2 block text-sm text-gray-700 dark:text-gray-300 font-medium">
                      Se souvenir de moi pour la prochaine fois
                    </label>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-4 py-3 text-white bg-gold-500 rounded-xl hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 shadow-lg hover:shadow-xl font-bold transition-all text-lg disabled:opacity-50 disabled:scale-100 active:scale-95 flex items-center justify-center gap-2"
                    >
                      {loading ? 'Accès en cours...' : 'Accéder à mon espace'}
                    </button>
                  </div>
                </form>
              )}
              
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-primary-900 dark:text-gold-400 font-bold">Chargement...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
