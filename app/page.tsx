import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background text-primary-900 dark:text-neutral-50 font-sans">
      <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center sm:p-20">
        <Link href="/" className="flex items-center gap-2 mb-6">
          <div className="w-16 h-16 bg-primary-900 rounded-full flex items-center justify-center text-white border-2 border-gold-500 shadow-sm">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
        </Link>
        <h1 className="text-5xl font-bold sm:text-7xl font-serif text-primary-900 dark:text-gold-400">
          Église Connect
        </h1>
        <p className="max-w-2xl mt-6 text-lg sm:text-xl text-gray-700 dark:text-gray-300">
          Une plateforme numérique où chaque église dispose de son espace autonome et sécurisé pour gérer ses membres, pointer ses cultes et animer sa vie communautaire.
        </p>
        <div className="flex flex-col gap-4 mt-10 sm:flex-row">
          <Link
            href="/login"
            className="px-8 py-3 text-lg font-medium text-white transition-colors rounded-full bg-primary-900 hover:bg-primary-500 shadow-md border-b-4 border-gold-500 hover:border-gold-400"
          >
            Accéder à mon espace
          </Link>
        </div>
      </main>
    </div>
  )
}
