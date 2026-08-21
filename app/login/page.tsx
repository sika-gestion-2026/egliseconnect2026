import { login, signup } from './actions'
import Link from 'next/link'



export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string, message?: string }>
}) {
  const params = await searchParams
  const errorMsg = params?.error
  const successMsg = params?.message
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border-t-4 border-gold-500">
        
        {/* En-tête amélioré avec texte en OR */}
        <div className="bg-primary-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
          <h1 className="text-4xl font-serif text-white mt-2 relative z-10 font-bold tracking-wide">
            Église Connect
          </h1>
          {/* L'écriture "Portail de connexion" en OR 100% compatible */}
          <p 
            className="mt-2 text-lg font-black text-[#FFD700] uppercase tracking-widest relative z-10"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.4)' }}
          >
            Portail de connexion
          </p>
        </div>
        
        <div className="p-8">
          {errorMsg && (
            <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200 shadow-sm text-center font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-6 p-3 bg-green-50 text-green-700 text-sm rounded-md border border-green-200 shadow-sm text-center font-medium">
              {successMsg}
            </div>
          )}

          <form className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Adresse Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-3 mt-1 border rounded-md border-gray-300 dark:border-gray-700 dark:bg-slate-800 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-shadow"
                  placeholder="votre@email.com"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-4 py-3 mt-1 border rounded-md border-gray-300 dark:border-gray-700 dark:bg-slate-800 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-shadow"
                  placeholder="••••••••"
                />
                
                {/* Lien mot de passe oublié */}
                <div className="flex justify-end mt-2">
                  <Link href="/forgot-password" className="text-sm font-medium text-primary-900 dark:text-gold-400 hover:text-gold-500 hover:underline transition-colors">
                    Mot de passe oublié ?
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                formAction={login}
                className="w-full px-4 py-3 text-white bg-primary-900 rounded-md hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-900 shadow-md font-bold transition-colors text-lg"
              >
                Se connecter
              </button>
              <button
                formAction={signup}
                className="w-full px-4 py-3 text-primary-900 dark:text-white bg-white dark:bg-slate-800 border-2 border-primary-900 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-900 font-bold transition-colors"
              >
                Créer un compte
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
