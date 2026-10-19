import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import DeleteChurchButton from '@/components/DeleteChurchButton'
import LocationPicker from '@/components/LocationPicker'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAuthz } from '@/utils/authz'

/** Seuls les super administrateurs gèrent le référentiel des églises. */
const SUPER_ADMIN_ROLES = ['super_admin'] as const

/** Valeurs autorisées par la contrainte CHECK de `churches.status`. */
const CHURCH_STATUSES = ['active', 'suspended'] as const

/**
 * Le bucket `logos` est publiquement lisible et sert du contenu depuis le
 * domaine de l'application. N'accepter que des images JPEG/PNG/WebP empêche
 * d'y déposer du HTML ou du SVG exécutable (XSS stockée).
 */
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Extension dérivée du type MIME validé — jamais du nom de fichier fourni. */
const LOGO_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/** Garde-fou de taille : 2 Mo suffisent largement pour un logo. */
const MAX_LOGO_BYTES = 2 * 1024 * 1024

/**
 * Convertit une coordonnée de formulaire en nombre, ou `null`.
 *
 * `parseFloat('abc')` renvoie `NaN`, et `NaN` sérialisé en JSON par PostgREST
 * devenait la chaîne `"NaN"` en base. Et `parseFloat('12,5')` valait 12, sans
 * que l'utilisateur ne s'en aperçoive. Toute valeur non numérique est donc
 * rejetée ici plutôt que confiée à Postgres.
 */
function parseCoordinate(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null

  // Latitude ∈ [-90, 90]. La longitude, bornée à [-180, 180], est vérifiée
  // par son parent (LocationPicker) : la même borne stricte s'appliquerait
  // ici si les deux champs passaient par ce même chemin.
  return Math.abs(parsed) <= 180 ? parsed : null
}

export default async function ManageChurchPage(props: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await props.params;
  const churchId = params.id
  const searchParams = (await props.searchParams) ?? {}
  const actionError =
    typeof searchParams.error === 'string' ? searchParams.error : null
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 1. Vérifier si l'utilisateur est connecté et est un Super Admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    redirect('/dashboard')
  }

  // 2. Récupérer les détails de l'église
  const adminSbForSelect = createAdminClient();
  if (!adminSbForSelect) {
    console.error('Client admin indisponible (clé service_role absente).')
    redirect('/super-admin')
  }
  const { data: church } = await adminSbForSelect.from('churches')
    .select('*')
    .eq('id', churchId)
    .single()

  if (!church) {
    redirect('/super-admin')
  }

  // 3. Récupérer les statistiques de cette église
  const { count: membersCount } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('church_id', churchId)

  const { count: attendancesCount } = await supabase
    .from('attendances')
    .select('*', { count: 'exact', head: true })
    .eq('church_id', churchId)

  const { data: moderators } = await supabase
    .from('user_profiles')
    .select('email, role')
    .eq('church_id', churchId)

  // 4. Server Action pour mettre à jour l'église
  //
  // SÉCURITÉ — POURQUOI UNE VÉRIFICATION INTERNE EST NÉCESSAIRE
  // -----------------------------------------------------------
  // La garde `if (profile?.role !== 'super_admin') redirect('/dashboard')` en
  // haut de cette page protège le RENDU de la page. Elle ne protège pas
  // l'action : une Server Action est une route HTTP à part entière, dont
  // l'identifiant est dérivable à partir du chemin du fichier. Un compte
  // authentifié — un simple fidèle suffit — pouvait donc l'appeler directement,
  // sans jamais passer par le rendu de la page.
  //
  // L'action utilise `createAdminClient()` (clé service_role), qui contourne
  // intégralement la RLS : sans ce contrôle interne, n'importe quel compte
  // authentifié pouvait réécrire n'importe quelle église, y compris son
  // `status` — c'est-à-dire suspendre ou réactiver un tenant.
  async function saveChurchDetails(formData: FormData) {
    'use server'

    const authz = await requireAuthz({ roles: SUPER_ADMIN_ROLES })
    if (!authz.ok) redirect('/dashboard')

    const adminSb = createAdminClient()
    if (!adminSb) {
      redirect(
        `/super-admin/churches/${churchId}?error=${encodeURIComponent(
          'Configuration serveur incomplète (clé service_role manquante).'
        )}`
      )
    }

    const name = (formData.get('name') as string | null)?.trim()
    const status = formData.get('status') as string | null
    const city = (formData.get('city') as string | null)?.trim() || null
    const commune = (formData.get('commune') as string | null)?.trim() || null
    const quartier = (formData.get('quartier') as string | null)?.trim() || null
    const vision = (formData.get('vision') as string | null)?.trim() || null
    const leaderName = (formData.get('leader_name') as string | null)?.trim() || null
    const leaderContact = (formData.get('leader_contact') as string | null)?.trim() || null
    const lat = parseCoordinate(formData.get('latitude'))
    const lng = parseCoordinate(formData.get('longitude'))

    if (!name) {
      redirect(
        `/super-admin/churches/${churchId}?error=${encodeURIComponent("Le nom de l'église est obligatoire.")}`
      )
    }

    // `churches.status` porte une contrainte CHECK ('active' | 'suspended').
    // On la respecte ici pour renvoyer un message lisible plutôt qu'une
    // erreur Postgres brute.
    if (!(CHURCH_STATUSES as readonly string[]).includes(status ?? '')) {
      redirect(
        `/super-admin/churches/${churchId}?error=${encodeURIComponent("Statut d'église invalide.")}`
      )
    }

    let finalLogoUrl = church.logo_url
    const logoFile = formData.get('logo_file') as File | null

    if (logoFile && logoFile.size > 0) {
      // Le bucket `logos` est servi publiquement. Sans ce filtre, un fichier
      // HTML ou SVG y était déposé : servi depuis le domaine de l'application,
      // il devenait du HTML exécutable — une XSS stockée, durable, et
      // appliquée à tous les visiteurs. La liste blanche porte sur le type MIME
      // réellement déclaré, et le nom d'origine n'est jamais réutilisé.
      if (!(ALLOWED_LOGO_TYPES as readonly string[]).includes(logoFile.type)) {
        redirect(
          `/super-admin/churches/${churchId}?error=${encodeURIComponent(
            "Format de logo non accepté. Utilisez une image (JPEG, PNG ou WebP)."
          )}`
        )
      }

      if (logoFile.size > MAX_LOGO_BYTES) {
        redirect(
          `/super-admin/churches/${churchId}?error=${encodeURIComponent(
            'Le logo dépasse 2 Mo.'
          )}`
        )
      }

      // `crypto.randomUUID()` : le nom ne dépend plus d'un `Math.random()`
      // devinable, et l'extension est déduite du type MIME validé plus haut
      // plutôt que du nom fourni par l'utilisateur.
      const fileName = `${churchId}/${crypto.randomUUID()}.${LOGO_EXTENSION_BY_MIME[logoFile.type]}`

      const { error: uploadError } = await adminSb.storage
        .from('logos')
        .upload(fileName, logoFile, { contentType: logoFile.type, upsert: false })

      if (uploadError) {
        console.error("Upload du logo impossible:", uploadError)
        redirect(
          `/super-admin/churches/${churchId}?error=${encodeURIComponent(
            "Le téléversement du logo a échoué. Les autres informations ont été enregistrées."
          )}`
        )
      }

      finalLogoUrl = adminSb.storage.from('logos').getPublicUrl(fileName).data.publicUrl
    }

    const { error } = await adminSb
      .from('churches')
      .update({
        name,
        status,
        city,
        commune,
        quartier,
        vision,
        logo_url: finalLogoUrl,
        leader_name: leaderName,
        leader_contact: leaderContact,
        latitude: lat,
        longitude: lng,
      })
      .eq('id', churchId)

    if (error) {
      // Ancien comportement : l'erreur était ignorée et la page redirigée
      // quand même. Un super_admin pouvait croire avoir enregistré un
      // changement alors que la base l'avait rejeté.
      console.error("Mise à jour de l'église impossible:", error)
      redirect(
        `/super-admin/churches/${churchId}?error=${encodeURIComponent(
          "L'enregistrement a échoué. Aucune modification n'a été appliquée."
        )}`
      )
    }

    revalidatePath('/super-admin')
    revalidatePath(`/super-admin/churches/${churchId}`)
    revalidatePath('/dashboard')
    redirect('/super-admin')
  }

  // 5. Server Action pour supprimer l'église
  //
  // Suppression définitive : le contrôle doit être refait ici, pour la même
  // raison que ci-dessus — la garde de la page ne protège pas l'action.
  async function deleteChurchAction() {
    'use server'

    const authz = await requireAuthz({ roles: SUPER_ADMIN_ROLES })
    if (!authz.ok) redirect('/dashboard')

    const adminSb = createAdminClient()
    if (!adminSb) {
      redirect(
        `/super-admin/churches/${churchId}?error=${encodeURIComponent(
          'Configuration serveur incomplète (clé service_role manquante).'
        )}`
      )
    }

    const { error } = await adminSb.from('churches').delete().eq('id', churchId)

    if (error) {
      console.error("Suppression de l'église impossible:", error)
      redirect(
        `/super-admin/churches/${churchId}?error=${encodeURIComponent(
          "La suppression a échoué. L'église n'a pas été supprimée."
        )}`
      )
    }

    revalidatePath('/super-admin')
    redirect('/super-admin')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Rétroaction des Server Actions.
            Leurs erreurs sont renvoyées dans l'URL puis affichées ici : sans
            cela, un échec de la base était indiscernable d'une sauvegarde
            réussie, puisque l'action redirigeait dans les deux cas. */}
        {actionError && (
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
          >
            {actionError}
          </div>
        )}

        {/* En-tête */}
        <div className="flex items-center justify-between border-b pb-4 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <Link href="/super-admin" className="text-gray-500 hover:text-primary-900 transition-colors">
              &larr; Retour
            </Link>
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary-900 dark:text-gold-400">
                Gérer {church.name}
              </h1>
              <p className="text-sm text-gray-500">
                Identifiant : <span className="font-mono">{church.id}</span>
              </p>
            </div>
          </div>
          
          {/* Badge de statut */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              church.status === 'active' 
                ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' 
                : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
            }`}>
              Statut : {church.status}
            </span>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-150 dark:border-slate-700">
            <h3 className="text-sm text-gray-500 font-semibold uppercase">Membres</h3>
            <p className="text-3xl font-bold mt-2 text-primary-900 dark:text-gold-400">{membersCount || 0}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-150 dark:border-slate-700">
            <h3 className="text-sm text-gray-500 font-semibold uppercase">Pointages</h3>
            <p className="text-3xl font-bold mt-2 text-primary-900 dark:text-gold-400">{attendancesCount || 0}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-150 dark:border-slate-700">
            <h3 className="text-sm text-gray-500 font-semibold uppercase">Code d'accès</h3>
            <p className="text-2xl font-mono font-bold mt-2 text-primary-900 dark:text-gold-400 tracking-wider">
              {church.code}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-150 dark:border-slate-700">
            <h3 className="text-sm text-gray-500 font-semibold uppercase">Équipe Admin</h3>
            <p className="text-3xl font-bold mt-2 text-primary-900 dark:text-gold-400">{moderators?.length || 0}</p>
          </div>
        </div>

        {/* Formulaire & Collaborateurs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Formulaire de modification */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-8 space-y-6">
            <h3 className="text-xl font-serif font-bold text-primary-900 dark:text-gold-400 border-b pb-2 dark:border-slate-700">
              Modifier les Informations
            </h3>
            
            <form action={saveChurchDetails} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom de l'Église</label>
                  <input 
                    name="name" 
                    defaultValue={church.name} 
                    required 
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Statut</label>
                  <select 
                    name="status" 
                    defaultValue={church.status} 
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700"
                  >
                    <option value="active">Actif</option>
                    <option value="suspended">Suspendu / Gelé</option>
                  </select>
                </div>
              </div>

              {/* Logo actuel & upload */}
              <div className="space-y-2 border-t pt-4 dark:border-slate-700">
                <label className="block text-sm font-medium">Logo de l'église</label>
                <div className="flex items-center gap-4">
                  {church.logo_url ? (
                    <img 
                      src={church.logo_url} 
                      alt="Logo actuel" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-gold-500" 
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-xl">
                      ⛪
                    </div>
                  )}
                  <div className="flex-1">
                    <input 
                      name="logo_file" 
                      type="file" 
                      accept="image/*" 
                      className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700 text-sm" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Sélectionnez une nouvelle image pour remplacer le logo actuel.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 dark:border-slate-700">
                <div>
                  <label className="block text-sm font-medium mb-1">Ville</label>
                  <input name="city" defaultValue={church.city || ''} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Commune</label>
                  <input name="commune" defaultValue={church.commune || ''} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quartier</label>
                  <input name="quartier" defaultValue={church.quartier || ''} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Vision / Slogan</label>
                <textarea 
                  name="vision" 
                  defaultValue={church.vision || ''} 
                  rows={3} 
                  className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700"
                ></textarea>
              </div>

              <div className="border-t pt-4 dark:border-slate-700">
                <h4 className="text-md font-bold mb-4 text-primary-900 dark:text-gold-400">Localisation GPS (Carte)</h4>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border dark:border-slate-700/50 shadow-inner">
                  <LocationPicker 
                    initialLat={church.latitude} 
                    initialLng={church.longitude} 
                    churchLogoUrl={church.logo_url}
                    // Optional: userPhotoUrl pour le super admin, on peut ignorer ou mettre une icone par défaut
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 dark:border-slate-700">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom du Responsable Pastoral</label>
                  <input name="leader_name" defaultValue={church.leader_name || ''} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact (Tel/Email)</label>
                  <input name="leader_contact" defaultValue={church.leader_contact || ''} className="w-full px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-slate-700" />
                </div>
              </div>

              <div className="flex justify-end gap-4 border-t pt-4 dark:border-slate-700">
                <Link 
                  href="/super-admin" 
                  className="px-6 py-2 border rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Annuler
                </Link>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-primary-900 hover:bg-primary-500 text-white rounded-md font-bold transition-colors"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>

          {/* Collaborateurs & Accès */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-6 h-fit space-y-4">
            <h3 className="text-lg font-serif font-bold text-primary-900 dark:text-gold-400 border-b pb-2 dark:border-slate-700">
              Administrateurs & Modérateurs
            </h3>
            <p className="text-xs text-gray-500">
              Liste des personnes ayant accès à cet espace d'église.
            </p>
            <div className="space-y-3">
              {moderators?.map((mod, i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border flex flex-col gap-1">
                  <span className="font-semibold text-sm truncate">{mod.email}</span>
                  <span className="text-xs px-2 py-0.5 w-fit rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {mod.role === 'church_admin' ? 'Pasteur/Admin' : 'Collaborateur'}
                  </span>
                </div>
              ))}
              {(!moderators || moderators.length === 0) && (
                <p className="text-sm text-gray-500 italic text-center py-4">
                  Aucun administrateur associé.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Zone Rouge - Suppression */}
        <div className="mt-12 bg-red-50 dark:bg-red-950/20 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                Zone de Danger : Suppression de l'Église
              </h3>
              <p className="text-sm text-red-600 dark:text-red-300">
                Attention : la suppression d'une église est <strong>définitive et irréversible</strong>. Cela supprimera également tous les membres, les profils administrateurs locaux et les données de pointage qui y sont attachés.
              </p>
            </div>
            <form action={deleteChurchAction}>
              <DeleteChurchButton churchName={church.name} />
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
