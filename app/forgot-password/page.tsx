import { resetPassword } from '@/app/login/actions'
import Link from 'next/link'

export default async function ForgotPasswordPage({
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
        
        <div className="bg-primary-900 p-6 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
          <h1 className="text-2xl font-serif text-white mt-2 relative z-10 font-bold tracking-wide">
            Récupération
          </h1>
          <p 
            className="mt-1 text-lg font-black text-[#FFD700] uppercase tracking-widest relative z-10"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.4)' }}
          >
            Mot de passe oublié
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

          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 text-center">
            Entrez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>

          <form action={resetPassword} className="space-y-6">
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

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                className="w-full px-4 py-3 text-white bg-primary-900 rounded-md hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-900 shadow-md font-bold transition-colors"
              >
                Envoyer le lien
              </button>
              
              <Link
                href="/login"
                className="w-full px-4 py-3 text-center text-primary-900 dark:text-white bg-white dark:bg-slate-800 border-2 border-primary-900 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-900 font-bold transition-colors"
              >
                Retour à la connexion
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
