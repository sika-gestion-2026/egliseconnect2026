import { headers } from 'next/headers'

/**
 * Résolution de l'URL publique de l'application.
 *
 * PROBLÈME CORRIGÉ
 * ----------------
 * Les e-mails de réinitialisation de mot de passe étaient envoyés vers
 * `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/update-password`.
 *
 * `NEXT_PUBLIC_SITE_URL` n'étant pas défini, la variable de repli
 * `http://localhost:3000` s'appliquait aussi EN PRODUCTION. Le lien contenu
 * dans l'e-mail pointait donc vers la machine du utilisateur : le mot de passe
 * était irrécupérable, et unepaste accidentelle dans une barre d'adresse
 * Reveillait un service local. Pire, aucun message d'erreur ne signalait le
 * problème côté serveur — l'e-mail paraissait envoyé normalement.
 *
 * ORDRE DE RÉSOLUTION
 * -------------------
 * 1. `NEXT_PUBLIC_SITE_URL` — source de vérité en production. À définir.
 * 2. En-têtes de la requête (`X-Forwarded-Proto` + `X-Forwarded-Host`, puis
 *    `Host`) — correct derrière un reverse-proxy, sans configuration.
 * 3. `http://localhost:3000` — développement uniquement.
 *
 * Le protocole est déduit de la configuration plutôt que codé en dur : les
 * déploiements Vercel et la plupart des hébergeurs servent le site en HTTPS,
 * et un lien `http://` en production se fait réécrire ou bloquer.
 */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return stripTrailingSlash(configured)

  const headerList = await headers()

  const forwardedHost =
    headerList.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    headerList.get('host')?.trim()

  if (forwardedHost) {
    const forwardedProto = headerList.get('x-forwarded-proto')?.split(',')[0]?.trim()

    // Repli sur https : c'est le protocole de production dans la très grande
    // majorité des cas, et un lien en https reste correct là où un lien en
    // http serait réécrit ou refusé.
    const protocol = forwardedProto || 'https'
    return stripTrailingSlash(`${protocol}://${forwardedHost}`)
  }

  return 'http://localhost:3000'
}

/**
 * Supprime les barres obliques finales.
 *
 * Indispensable : la plupart des hébergeurs configurent `NEXT_PUBLIC_SITE_URL`
 * avec une barre oblique finale (`https://mon-app.vercel.app/`). Sans cette
 * normalisation, les liens générés deviennent `https://…//update-password`.
 * Les doubles barres sont tolérées par la plupart des navigateurs, mais
 * l'URL de retour doit correspondre exactement à celle déclarée dans la liste
 * d'origines autorisées de Supabase, sinon la redirection est refusée.
 */
function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

/** Construit une URL absolue vers un chemin interne. */
export async function absoluteUrl(path: string): Promise<string> {
  const base = await getSiteUrl()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}