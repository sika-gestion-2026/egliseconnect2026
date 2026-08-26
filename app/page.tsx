import Link from 'next/link'
import { siteConfig } from '@/utils/config'

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background text-primary-900 dark:text-neutral-50 font-sans">
      <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center sm:p-20">
        <Link href="/" className="flex items-center gap-2 mb-6">
          <div className="w-16 h-16 bg-primary-900 rounded-full flex items-center justify-center text-white border-2 border-gold-500 shadow-sm text-3xl">
            ⛪
          </div>
        </Link>
        <h1 className="text-5xl font-bold sm:text-7xl font-serif text-primary-900 dark:text-gold-400">
          Église Connect
        </h1>
        <p className="max-w-2xl mt-6 text-lg sm:text-xl text-gray-700 dark:text-gray-300">
          Une plateforme numérique où l'église dispose de son espace autonome et sécurisé pour gérer ses membres, pointer ses cultes et animer sa vie communautaire.
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
      <footer className="w-full pb-6 text-center">
        <p className="text-[10px] text-gray-400 opacity-70">
          Créé par {siteConfig.creatorName} {siteConfig.creatorPhone}
        </p>
      </footer>
    </div>
  )
}
