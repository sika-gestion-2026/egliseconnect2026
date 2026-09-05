'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { CalendarDays, Megaphone, ShieldCheck, BellRing, HeartHandshake, Settings, LogOut, Palette } from 'lucide-react'

type NavItem = {
  name: string
  href: string
  icon: React.ReactNode
}

interface SidebarProps {
  churchName: string
  logoUrl?: string | null
  navItems: NavItem[]
  userEmail: string
  isSuperAdmin?: boolean
}

export default function Sidebar({ 
  churchName, 
  logoUrl, 
  navItems, 
  userEmail,
  isSuperAdmin
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-primary-900 text-white p-4">
        <h2 className="text-lg font-serif text-gold-400 truncate font-bold flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt={churchName} className="w-8 h-8 rounded-full object-cover border border-gold-500 flex-shrink-0 animate-fade-in bg-white" />
          ) : (
            <img src="/logo.png" alt="Église Connect" className="w-8 h-8 rounded-full object-cover border border-gold-500 flex-shrink-0 bg-white" />
          )}
          <span className="truncate">{churchName}</span>
        </h2>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setIsOpen(!isOpen)} className="p-2 bg-primary-800 rounded-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 h-full bg-primary-900 text-white flex flex-col border-r-4 border-gold-500 transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-primary-500 hidden md:block">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={churchName} className="w-12 h-12 rounded-full object-cover border-2 border-gold-500 flex-shrink-0 animate-fade-in bg-white" />
            ) : (
              <img src="/logo.png" alt="Église Connect" className="w-12 h-12 rounded-full object-cover border-2 border-gold-500 flex-shrink-0 bg-white" />
            )}
            <div className="truncate">
              <h2 className="text-lg font-serif text-gold-400 truncate font-bold" title={churchName}>
                {churchName}
              </h2>
              <p className="text-xs text-gray-300 mt-0.5">Espace Administration</p>
            </div>
          </div>
        </div>
        
        <div className="md:hidden p-4 border-b border-primary-500 flex justify-between items-center">
          <span className="font-bold text-gold-400 truncate">{userEmail}</span>
          <button onClick={() => setIsOpen(false)} className="p-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-primary-500 to-primary-700 text-gold-400 font-bold border-l-4 border-gold-400 shadow-md' : 'hover:bg-primary-800/50 hover:translate-x-1'}`}
              >
                {item.icon}
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-primary-500/30 bg-primary-950/30 backdrop-blur-sm mt-auto flex flex-col gap-2">
          {/* Paramètres */}
          <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-gray-300 hover:text-white hover:bg-white/10 hover:shadow-lg hover:shadow-white/5">
            <Settings size={18} />
            <span className="font-medium text-sm">Paramètres</span>
          </Link>

          {/* Thème Visuel */}
          <div className="flex justify-between items-center px-4 py-3 rounded-xl transition-all duration-300 text-gray-300 bg-black/20 border border-white/5 shadow-inner">
            <div className="flex items-center gap-3">
              <Palette size={18} className="text-gold-400" />
              <span className="font-medium text-sm">Thème visuel</span>
            </div>
            <ThemeToggle />
          </div>

          {/* Déconnexion */}
          <form action="/auth/signout" method="post">
            <button className="w-full text-left px-4 py-3 text-sm font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all duration-300 flex items-center gap-3 border border-red-500/20 hover:border-red-500/40 shadow-lg shadow-red-500/5 hover:-translate-y-0.5">
              <LogOut size={18} />
              Déconnexion
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
