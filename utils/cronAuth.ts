/**
 * Protection des endpoints cron (routes /api/cron/*).
 *
 * Ces routes utilisent SUPABASE_SERVICE_ROLE_KEY et écrivent en base.
 * Sans vérification, n'importe quel visiteur pourrait les déclencher
 * (spam de notifications, abus de la service role key).
 *
 * Vercel injecte automatiquement le header `Authorization: Bearer <CRON_SECRET>`
 * pour les jobs déclarés dans vercel.json, dès lors que CRON_SECRET est défini.
 */

/**
 * Vérifie qu'une requête cron provient bien du scheduler de confiance.
 *
 * - En production : le header Authorization doit correspondre à CRON_SECRET.
 * - En développement : autorisé (sinon impossible de tester /api/cron/* en local).
 */
export function verifyCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  // Pas de secret configuré en prod => on refuse tout par défaut (fail-closed).
  if (!secret || secret.trim().length === 0) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[cronAuth] CRON_SECRET non défini : toutes les requêtes cron sont rejetées. ' +
          'Définissez CRON_SECRET dans les variables d’environnement.'
      );
      return false;
    }
    return true;
  }

  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;

  // Comparaison en temps constant pour éviter de divulguer le secret par timing.
  if (header.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}