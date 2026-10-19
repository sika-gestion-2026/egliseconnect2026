import Link from 'next/link'
import { siteConfig } from '@/utils/config'

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background text-foreground font-sans overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-500/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gold-500/10 blur-[100px]" />
      </div>

      <main className="flex flex-col items-center justify-center min-h-[90vh] px-6 py-12 text-center sm:px-20 relative z-10">
        
        {/* Logo with nice animation */}
        <Link href="/" className="group flex items-center justify-center mb-10 transition-transform duration-500 hover:scale-105">
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(201,162,39,0.3)] border-4 border-gold-500 overflow-hidden transition-shadow duration-500 group-hover:shadow-[0_0_60px_rgba(201,162,39,0.5)]">
            <img 
              src="/logo.png" 
              alt="Église Connect" 
              className="w-full h-full object-cover" 
            />
          </div>
        </Link>
        
        {/* Main Title - ensuring strong contrast */}
        <h1 className="text-5xl sm:text-7xl font-bold font-serif text-primary-900 dark:text-gold-400 tracking-tight leading-tight mb-6 drop-shadow-sm">
          Église Connect
        </h1>
        
        {/* Subtitle - ensuring high readability */}
        <p className="max-w-2xl text-lg sm:text-2xl text-slate-700 dark:text-slate-300 mb-12 leading-relaxed font-light">
          Une plateforme numérique où l'église dispose de son espace autonome et sécurisé pour gérer ses membres, pointer ses cultes et animer sa vie communautaire.
        </p>
        
        {/* Action Button */}
        <div className="flex flex-col gap-4 sm:flex-row items-center justify-center">
          <Link
            href="/login"
            className="group relative px-10 py-4 text-xl font-semibold text-white transition-all duration-300 rounded-full bg-primary-900 shadow-xl overflow-hidden hover:shadow-2xl hover:-translate-y-1"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-primary-900 via-primary-500 to-primary-900 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="relative z-10 flex items-center gap-2">
              Accéder à mon espace
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gold-500 transition-all duration-300 group-hover:h-2" />
          </Link>
        </div>
        
      </main>

      <footer className="w-full py-6 text-center border-t border-slate-200 dark:border-slate-800/50 bg-background/50 backdrop-blur-sm relative z-10">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
          Créé par {siteConfig.creatorName} • {siteConfig.creatorPhone}
        </p>
      </footer>
    </div>
  )
}
