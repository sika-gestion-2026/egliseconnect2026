import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function SMSDashboard() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // This is a UI mockup for the SMS feature as requested
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <Link href="/dashboard" className="text-sm font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2 inline-block">← Retour</Link>
          <h1 className="text-3xl font-serif text-primary-900 dark:text-gold-400 font-bold">Centre de Communication (SMS & Push)</h1>
          <p className="text-gray-500 mt-1">Configurez les alertes automatiques pour vos membres.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-t-4 border-purple-500">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🎂</span>
            <h2 className="text-xl font-bold dark:text-white">Anniversaires Automatiques</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Envoyez automatiquement un SMS le jour de l'anniversaire d'un membre à 08h00.
          </p>
          <textarea 
            className="w-full p-3 rounded-lg border dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary-500" 
            rows={4}
            defaultValue="Bonjour {prenom}, toute l'église vous souhaite un joyeux anniversaire ! Que Dieu vous bénisse abondamment. 🎉"
          />
          <div className="mt-4 flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded text-purple-500 focus:ring-purple-500" defaultChecked />
              <span className="text-sm font-bold dark:text-white">Activer l'envoi</span>
            </label>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700">Sauvegarder</button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-t-4 border-red-500">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">❤️</span>
            <h2 className="text-xl font-bold dark:text-white">Relance d'Absence (3+ semaines)</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Envoyez un SMS lorsqu'un membre est absent à plus de 3 cultes consécutifs.
          </p>
          <textarea 
            className="w-full p-3 rounded-lg border dark:bg-slate-900 dark:border-slate-700 text-sm focus:ring-primary-500" 
            rows={4}
            defaultValue="Bonjour {prenom}, nous avons remarqué votre absence ces derniers temps. Tout va bien ? N'hésitez pas si vous avez besoin de prière."
          />
          <div className="mt-4 flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded text-red-500 focus:ring-red-500" />
              <span className="text-sm font-bold dark:text-white">Activer l'envoi</span>
            </label>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700">Sauvegarder</button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/50 p-6 rounded-2xl">
        <h3 className="font-bold text-blue-800 dark:text-blue-400 mb-2">Configuration de la passerelle</h3>
        <p className="text-sm text-blue-600 dark:text-blue-300 mb-4">L'envoi de SMS réels nécessite une connexion à une passerelle comme Twilio ou Vonage. En attendant, les messages sont envoyés via Web Push Notification si le membre a installé l'application.</p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-bold">Configurer Twilio (Bientôt)</button>
      </div>
    </div>
  )
}
