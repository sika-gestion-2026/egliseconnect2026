import { updatePassword } from '@/app/login/actions'

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const errorMsg = params?.error
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-background p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border-t-4 border-gold-500">
        
        <div className="bg-primary-900 p-6 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
          <h1 className="text-2xl font-serif text-white mt-2 relative z-10 font-bold tracking-wide">
            Nouveau mot de passe
          </h1>
        </div>
        
        <div className="p-8">
          {errorMsg && (
            <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200 shadow-sm text-center font-medium">
              {errorMsg}
            </div>
          )}

          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 text-center">
            Veuillez entrer votre nouveau mot de passe.
          </p>

          <form action={updatePassword} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Nouveau mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full px-4 py-3 mt-1 border rounded-md border-gray-300 dark:border-gray-700 dark:bg-slate-800 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-shadow"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Confirmer le mot de passe
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                minLength={6}
                className="w-full px-4 py-3 mt-1 border rounded-md border-gray-300 dark:border-gray-700 dark:bg-slate-800 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-shadow"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full px-4 py-3 text-white bg-primary-900 rounded-md hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-900 shadow-md font-bold transition-colors"
              >
                Mettre à jour le mot de passe
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
