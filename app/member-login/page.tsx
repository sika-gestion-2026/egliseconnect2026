import MemberLoginForm from './MemberLoginForm'

export default function MemberLogin() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto h-12 w-12 bg-primary-900 text-white rounded-xl flex items-center justify-center text-2xl shadow-lg border-2 border-gold-400">
          ⛪
        </div>
        <h2 className="mt-6 text-center text-3xl font-serif font-extrabold text-primary-900 dark:text-gold-400">
          Espace Fidèle
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Connectez-vous avec votre numéro ou email et le code de votre église.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-slate-700">
          <MemberLoginForm />
        </div>
      </div>
    </div>
  )
}
